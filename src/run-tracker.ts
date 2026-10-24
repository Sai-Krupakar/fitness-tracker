import { Capacitor, registerPlugin } from '@capacitor/core'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createIcons, Play, Pause, Square, LocateFixed, Download } from 'lucide'
import { saveRunRoute } from './cloud'
import { drawRunSummary } from './run-summary'

export type RunSummary = { id: string; startedAt: number; finishedAt: number; elapsedMs: number; distanceM: number }
type RoutePoint = { lat: number; lng: number; at: number; segment: boolean }
export type RecordedRun = RunSummary & {
  owner: string;
  status: 'running' | 'paused' | 'finished';
  points: RoutePoint[];
  lastFixAt?: number;
  position?: { lat: number; lng: number; accuracy: number; at: number };
  interrupted?: boolean;
  discarded?: boolean;
}
type Snapshot = { run?: RecordedRun; gpsStatus: string }
type TrackerPlugin = {
  command(options: { owner: string; resetAt: number; action: 'start' | 'pause' | 'resume' | 'finish' }): Promise<Snapshot>;
  snapshot(options: { owner: string; resetAt: number }): Promise<Snapshot>;
  history(options: { owner: string; resetAt: number }): Promise<{ runs: RecordedRun[]; pendingIds: string[] }>;
  acknowledge(options: { owner: string; ids: string[] }): Promise<void>;
  clearHistory(options: { owner: string; resetAt: number }): Promise<void>;
  saveImage(options: { dataUrl: string; filename: string }): Promise<{ cancelled?: boolean; location?: string }>;
}
type TrackerHooks = {
  summaries: () => RunSummary[];
  record: (run: RunSummary) => boolean;
  changed: () => void;
  finished: (run?: RecordedRun, message?: string) => void;
  resetAt: () => number;
}
const native = registerPlugin<TrackerPlugin>('RunTracker')
const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
let owner = ''
let hooks: TrackerHooks | null = null
let snapshot: Snapshot = { gpsStatus: 'Ready to record' }
let history = new Map<string, RecordedRun>()
let timer: number | undefined
let busy = false
let error = ''
let selected: RecordedRun | null = null
let map: L.Map | null = null
let routeLayer: L.LayerGroup | null = null
let mapElement: HTMLElement | null = null
let routeVersion = ''
let viewVersion = ''
let uploading = new Set<string>()
let pollOwner = ''
let revision = 0
let nextBackupAt = 0
let handledFinishedId = ''
let connectedResetAt = 0
let exporting = false
let exportStatus = ''
let exportRetry = false

export const isSavedRun = (run: RunSummary) => Boolean(run && typeof run.id === 'string' && run.id
  && Number.isFinite(run.distanceM) && run.distanceM >= 1
  && Number.isFinite(run.elapsedMs) && run.elapsedMs >= 1000
  && Number.isFinite(run.startedAt) && run.startedAt > 0
  && Number.isFinite(run.finishedAt) && run.finishedAt >= run.startedAt)

export const formatRunDistance = (metres: number) => Math.round(Math.max(0, metres)).toLocaleString()
export const formatRunTime = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const prefix = hours > 0 ? `${hours}:` : ''
  return `${prefix}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
export const formatRunPace = (milliseconds: number, metres: number) => {
  if (metres < 20 || milliseconds <= 0) return '--:--'
  const seconds = Math.round(milliseconds / metres)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
export const hasActiveRun = () => Boolean(snapshot.run && snapshot.run.status !== 'finished')

export function connectRunTracker(uid: string, nextHooks: TrackerHooks) {
  hooks = nextHooks
  if (owner === uid) {
    if (connectedResetAt !== nextHooks.resetAt()) {
      connectedResetAt = nextHooks.resetAt()
      revision += 1
      history.clear()
      selected = null
      void refreshHistory(uid)
    }
    return
  }
  disconnectRunTracker()
  hooks = nextHooks
  owner = uid
  connectedResetAt = nextHooks.resetAt()
  void refreshHistory(uid)
  void poll()
  timer = window.setInterval(() => {
    if (document.hidden) return
    if (hasActiveRun()) void poll()
    else retryRouteBackups()
  }, 1500)
}

export function disconnectRunTracker() {
  revision += 1
  window.clearInterval(timer)
  owner = ''
  hooks = null
  snapshot = { gpsStatus: 'Ready to record' }
  history = new Map()
  selected = null
  error = ''
  exportStatus = ''
  exportRetry = false
  busy = false
  viewVersion = ''
  nextBackupAt = 0
  handledFinishedId = ''
  connectedResetAt = 0
  destroyMap()
}

function recoverPendingRun(run: RecordedRun, pending: boolean, uid: string) {
  const known = hooks?.summaries().some((summary) => summary.id === run.id)
  if (!known && !pending) return { changed: false }
  const changed = !known && Boolean(hooks?.record(run))
  if (!hooks?.summaries().some((summary) => summary.id === run.id)) return { changed }
  upload(run, uid)
  return { changed, acknowledgedId: pending ? run.id : undefined }
}

async function refreshHistory(uid: string) {
  if (!isAndroid) return
  const version = revision
  const resetAt = hooks?.resetAt() ?? 0
  try {
    const result = await native.history({ owner: uid, resetAt })
    if (uid !== owner || version !== revision || resetAt !== hooks?.resetAt()) return
    const runs = result.runs.filter((run) => isSavedRun(run) && run.startedAt > resetAt)
    const pending = new Set(result.pendingIds ?? [])
    history = new Map(runs.map((run) => [run.id, run]))
    const recovered = runs.map((run) => recoverPendingRun(run, pending.has(run.id), uid))
    const acknowledged = recovered.flatMap((result) => result.acknowledgedId ? [result.acknowledgedId] : [])
    if (recovered.some((result) => result.changed)) hooks?.changed()
    if (acknowledged.length) await native.acknowledge({ owner: uid, ids: acknowledged })
    if (uid !== owner || version !== revision) return
    updateView()
  } catch (error_) {
    if (uid === owner && version === revision) { error = describeError(error_); updateView() }
  }
}

function upload(run: RecordedRun, uid: string) {
  const key = `level-up-route:${uid}:${run.id}`
  if (!isSavedRun(run) || run.startedAt <= (hooks?.resetAt() ?? 0)
    || !hooks?.summaries().some((summary) => summary.id === run.id)) return
  if (uploading.has(key) || localStorage.getItem(key) || !navigator.onLine) return
  uploading.add(key)
  void saveRunRoute(uid, run).then(() => {
    if (uid === owner && run.startedAt > (hooks?.resetAt() ?? 0)
      && hooks?.summaries().some((summary) => summary.id === run.id)) localStorage.setItem(key, '1')
  }).catch(() => {
    if (owner === uid) { error = 'Run saved on this phone. Route backup will retry when connected.'; updateView() }
  }).finally(() => uploading.delete(key))
}

function retryRouteBackups() {
  if (!owner || Date.now() < nextBackupAt) return
  nextBackupAt = Date.now() + 30000
  for (const run of history.values()) upload(run, owner)
}

window.addEventListener('online', () => { if (owner) void refreshHistory(owner) })
document.addEventListener('visibilitychange', () => { if (!document.hidden && owner) void poll() })

async function poll() {
  const uid = owner
  if (!isAndroid || !uid || document.hidden || pollOwner === uid || busy) return
  const version = revision
  pollOwner = uid
  try {
    const next = await native.snapshot({ owner: uid, resetAt: hooks?.resetAt() ?? 0 })
    if (uid !== owner || version !== revision) return
    const newlyFinished = next.run?.status === 'finished' && next.run.id !== handledFinishedId
    snapshot = next
    selected = next.run?.status === 'finished' && isSavedRun(next.run) && !next.run.discarded
      && next.run.startedAt > (hooks?.resetAt() ?? 0) ? next.run : null
    if (newlyFinished) {
      handledFinishedId = next.run!.id
      await refreshHistory(uid)
      if (uid === owner && version === revision) hooks?.finished(next.run)
    }
    retryRouteBackups()
    updateView()
  } catch (error_) {
    if (uid === owner) { error = describeError(error_); updateView() }
  } finally { if (pollOwner === uid) pollOwner = '' }
}

function describeError(failure: unknown) {
  return failure instanceof Error ? failure.message : 'GPS tracking is unavailable. Rebuild and install the latest Android APK.'
}

async function command(action: 'start' | 'pause' | 'resume' | 'finish') {
  if (busy || !owner) return
  const uid = owner
  busy = true
  revision += 1
  error = ''
  updateView()
  try {
    const next = await native.command({ owner: uid, resetAt: hooks?.resetAt() ?? 0, action })
    if (uid !== owner) return
    exportStatus = ''
    exportRetry = false
    snapshot = next
    selected = next.run?.status === 'finished' && isSavedRun(next.run) && !next.run.discarded ? next.run : null
    if (next.run?.status === 'finished') {
      handledFinishedId = next.run.id
      await refreshHistory(uid)
      if (uid === owner) {
        if (selected) await exportRunSummary(next.run, uid)
        else hooks?.finished(next.run)
      }
    }
  } catch (error_) {
    if (uid === owner) error = describeError(error_)
  } finally {
    if (uid === owner) { busy = false; updateView() }
  }
}

export async function clearRecordedRuns(resetAt: number) {
  if (!owner) return
  if (busy) throw new Error('Wait for the current recording action to finish.')
  const uid = owner
  busy = true
  revision += 1
  try {
    if (isAndroid) {
      const result = await native.snapshot({ owner: uid, resetAt: hooks?.resetAt() ?? 0 })
      if (result.run && result.run.status !== 'finished') throw new Error('Finish your active run before resetting progress.')
      await native.clearHistory({ owner: uid, resetAt })
    }
    if (uid !== owner) throw new Error('Account changed while resetting progress.')
    history.clear()
    selected = null
    handledFinishedId = ''
    snapshot = { gpsStatus: 'Ready to record' }
  } finally {
    if (uid === owner) busy = false
  }
}

function destroyMap() {
  map?.remove()
  map = null
  mapElement = null
  routeLayer = null
  routeVersion = ''
}

export const startRunRecording = () => command('start')

export function mountRunTracker() {
  const root = document.querySelector<HTMLElement>('#run-tracker')
  if (!root) { destroyMap(); return }
  destroyMap()
  root.innerHTML = `
    <div id="run-error" class="run-error" role="alert" hidden></div>
    <div class="run-details" id="run-details">
    <div class="run-heading"><div><p class="kicker">OUTDOOR RUN</p><h2 id="run-title">Record a run</h2></div></div>
    <p id="run-status" class="run-status" role="status"></p>
    <section id="run-export" hidden aria-label="Run image download">
      <button class="small-button" id="run-download" type="button" hidden><i data-lucide="download"></i>RETRY DOWNLOAD</button>
      <p class="run-export-status" id="run-export-status" role="status"></p>
    </section>
    <div id="run-live-details">
    <div class="run-metrics"><div><span>DISTANCE · M</span><strong id="run-distance">0</strong></div><div><span>AVG PACE · /KM</span><strong id="run-pace">--:--</strong></div><div><span>ACTIVE TIME</span><strong id="run-time">00:00</strong></div></div>
    <div class="run-map-wrap"><div id="run-map" aria-label="Recorded running route"></div><span id="run-map-empty">Start a run to locate your position</span><span id="run-map-connection" role="status" hidden></span><button class="icon-button run-recenter" id="run-recenter" type="button" title="Fit route" aria-label="Fit route"><i data-lucide="locate-fixed"></i></button></div>
    </div>
    <div class="run-controls"><button class="small-button" id="run-start" type="button"><i data-lucide="play"></i>START RUN</button><button class="small-button secondary-button" id="run-pause" type="button" hidden><i data-lucide="pause"></i>PAUSE</button><button class="small-button" id="run-resume" type="button" hidden><i data-lucide="play"></i>RESUME</button><button class="small-button run-finish" id="run-finish" type="button" hidden><i data-lucide="square"></i>FINISH & SAVE</button></div>
    <p class="run-backup" id="run-backup"></p>
    </div>`
  createIcons({ icons: { Play, Pause, Square, LocateFixed, Download }, root })
  root.querySelector('#run-start')?.addEventListener('click', () => void command('start'))
  root.querySelector('#run-pause')?.addEventListener('click', () => void command('pause'))
  root.querySelector('#run-resume')?.addEventListener('click', () => void command('resume'))
  root.querySelector('#run-finish')?.addEventListener('click', () => void command('finish'))
  root.querySelector('#run-download')?.addEventListener('click', () => void downloadRunSummary())
  root.querySelector('#run-recenter')?.addEventListener('click', () => { routeVersion = ''; updateRoute(selected ?? snapshot.run) })
  viewVersion = ''
  updateView()
}

function runStatus(active?: RecordedRun) {
  if (selected) return 'Run finished'
  if (!isAndroid) return 'Recording requires the Android app'
  if (active?.interrupted) return 'Recording was interrupted. Resume or save this run.'
  if (active?.status === 'paused') return 'Paused'
  if (active?.lastFixAt && Date.now() - active.lastFixAt > 30000) return 'GPS signal lost - distance is not updating'
  if (active?.status === 'running' && !active.lastFixAt && Date.now() - active.startedAt > 15000) return 'Waiting for GPS. Move outdoors with a clear view of the sky.'
  if (active?.position && snapshot.gpsStatus === 'GPS ready') return `GPS ready · accuracy ±${Math.round(active.position.accuracy)} m`
  return snapshot.gpsStatus
}

function renderControls(root: HTMLElement, active?: RecordedRun) {
  const visible: Record<string, boolean> = {
    'run-start': !active,
    'run-pause': !selected && active?.status === 'running',
    'run-resume': !selected && active?.status === 'paused',
    'run-finish': !selected && Boolean(active),
  }
  for (const [id, show] of Object.entries(visible)) {
    const button = root.querySelector<HTMLButtonElement>(`#${id}`)
    if (button) { button.hidden = !show; button.disabled = busy || exporting || !isAndroid }
  }
}

function backupStatus() {
  if (selected) return localStorage.getItem(`level-up-route:${owner}:${selected.id}`) ? 'Route backed up' : 'Route saved on this phone'
  return hasActiveRun() ? 'Recording on this phone' : ''
}

function updateView() {
  const root = document.querySelector<HTMLElement>('#run-tracker')
  if (!root) return
  const active = snapshot.run?.status !== 'finished' ? snapshot.run : undefined
  const run = selected ?? active
  const details = root.querySelector<HTMLElement>('#run-details')
  if (details) details.hidden = false
  const setText = (selector: string, text: string) => { const element = root.querySelector(selector); if (element) element.textContent = text }
  setText('#run-title', selected ? new Date(selected.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Record a run')
  setText('#run-status', runStatus(active))
  setText('#run-distance', formatRunDistance(run?.distanceM ?? 0))
  setText('#run-pace', formatRunPace(run?.elapsedMs ?? 0, run?.distanceM ?? 0))
  setText('#run-time', formatRunTime(run?.elapsedMs ?? 0))
  renderControls(root, active)
  const completed = root.querySelector<HTMLElement>('#run-export')
  if (completed) completed.hidden = !selected
  const live = root.querySelector<HTMLElement>('#run-live-details')
  if (live) live.hidden = false
  const download = root.querySelector<HTMLButtonElement>('#run-download')
  if (download) { download.hidden = !selected || exporting || !exportRetry; download.disabled = exporting }
  setText('#run-export-status', exportStatus)
  const message = root.querySelector<HTMLElement>('#run-error')
  if (message) { message.textContent = error; message.hidden = !error }
  setText('#run-backup', backupStatus())
  const version = `${run?.id ?? ''}:${run?.points.length ?? 0}:${run?.position?.at ?? ''}`
  if (version !== viewVersion && !details?.hidden) { viewVersion = version; updateRoute(run) }
}

function imageBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the run image.')), 'image/png'))
}

async function ensureRunImage(uid: string, run: RecordedRun) {
  if (run.points.length < 2) throw new Error('The saved route is unavailable. Reconnect to load it before creating this image.')
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  drawRunSummary(canvas, run, formatRunPace(run.elapsedMs, run.distanceM))
  const image = await imageBlob(canvas)
  if (uid !== owner || run.startedAt <= (hooks?.resetAt() ?? 0)) throw new Error('This run was reset or the account changed.')
  return image
}

function blobDataUrl(image: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not encode the PNG image.'))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the PNG image.'))
    reader.readAsDataURL(image)
  })
}

async function exportRunImage(image: Blob, filename: string) {
  if (isAndroid) {
    const result = await native.saveImage({ dataUrl: await blobDataUrl(image), filename })
    return { cancelled: Boolean(result.cancelled), message: result.cancelled ? 'Download cancelled.' : result.location ?? 'Image saved.' }
  }
  const url = URL.createObjectURL(image)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  return { cancelled: false, message: 'Image downloaded.' }
}

async function downloadRunSummary() {
  if (!selected || exporting) return
  await exportRunSummary(selected, owner)
}

async function exportRunSummary(run: RecordedRun, uid: string) {
  if (exporting) return
  exporting = true
  exportStatus = 'Saving image…'
  exportRetry = false
  updateView()
  try {
    if (uid !== owner || run.startedAt <= (hooks?.resetAt() ?? 0)) return
    const image = await ensureRunImage(uid, run)
    const filename = `level-up-run-${new Date(run.startedAt).toISOString().slice(0, 10)}-${run.id}.png`
    const result = await exportRunImage(image, filename)
    if (uid !== owner) return
    exportStatus = result.message
    exportRetry = result.cancelled
    if (!result.cancelled) {
      hooks?.finished(run, result.message)
    }
  } catch (error_) {
    if (uid === owner) { exportStatus = describeError(error_); exportRetry = true }
  } finally {
    exporting = false
    if (uid === owner) updateView()
  }
}

function updateRoute(run?: RecordedRun | null) {
  const element = document.querySelector<HTMLElement>('#run-map')
  const empty = document.querySelector<HTMLElement>('#run-map-empty')
  if (!element) return
  const points = run?.points ?? []
  const position = run?.position
  if (empty) {
    empty.hidden = points.length > 0 || Boolean(position)
    empty.textContent = run?.status === 'running' ? 'Waiting for GPS position…' : 'Start a run to locate your position'
  }
  if (mapElement !== element || !map) {
    destroyMap()
    mapElement = element
    map = L.map(element, { zoomControl: false, attributionControl: true }).setView([20, 0], 2)
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map)
    tiles.on('tileerror', () => {
      const message = document.querySelector<HTMLElement>('#run-map-connection')
      if (message) { message.textContent = 'Map tiles unavailable. GPS recording does not need internet.'; message.hidden = false }
    })
    tiles.on('tileload', () => {
      const message = document.querySelector<HTMLElement>('#run-map-connection')
      if (message) message.hidden = true
    })
    routeLayer = L.layerGroup().addTo(map)
  }
  const version = `${run?.id}:${points.length}:${position?.at ?? ''}`
  if (version === routeVersion) return
  const initial = routeVersion.split(':')[0] !== run?.id
  routeVersion = version
  routeLayer!.clearLayers()
  if (!points.length) {
    if (position) {
      L.circle([position.lat, position.lng], { radius: position.accuracy, color: '#ff755b', weight: 1 }).addTo(routeLayer!)
      L.circleMarker([position.lat, position.lng], { radius: 5, color: '#ff755b' }).addTo(routeLayer!)
      map.setView([position.lat, position.lng], 16)
    }
    map.invalidateSize()
    return
  }
  const segments: L.LatLngExpression[][] = []
  for (const point of points) {
    if (point.segment || !segments.length) segments.push([])
    segments.at(-1)!.push([point.lat, point.lng])
  }
  for (const segment of segments) L.polyline(segment, { color: '#c7f269', weight: 4 }).addTo(routeLayer!)
  const first = points[0]
  const last = points.at(-1)!
  L.circleMarker([first.lat, first.lng], { radius: 5, color: '#101416', fillColor: '#c7f269', fillOpacity: 1, weight: 2 }).addTo(routeLayer!)
  L.circleMarker([last.lat, last.lng], { radius: 6, color: '#101416', fillColor: '#ff755b', fillOpacity: 1, weight: 2 }).addTo(routeLayer!)
  map.invalidateSize()
  if (initial || selected) map.fitBounds(L.latLngBounds(points.map((point) => [point.lat, point.lng])), { padding: [24, 24], maxZoom: 17 })
  else map.panTo([last.lat, last.lng], { animate: false })
}
