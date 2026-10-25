import { expect, test, type Page } from '@playwright/test'
import type { RecordedRun, RunSummary } from '../src/run-tracker'

type Progress = {
  runs: RunSummary[];
  exerciseTotals: { run: number; push?: number };
  runHistoryResetAt: number;
  [key: string]: unknown;
}
type Harness = {
  seed: Progress;
  writes: Progress[];
  uploads: string[];
  acknowledgements: string[];
  historyCalls: number;
  clears: number;
  nativeCutoff: number;
  releaseHistory: () => void;
  cloudCallback: (data: Progress, metadata: { pending: boolean; fromCache: boolean }) => void;
  commands: string[];
  imageExports: { dataUrl: string; filename: string }[];
  cancelExport: boolean;
  failExport: boolean;
  snapshotCalls: number;
  completedRoute: RecordedRun;
  routeLoads: number;
}

async function prepare(page: Page, mode: 'stationary' | 'pending' | 'race' | 'completed' | 'web-summary' | 'short-xp' | 'rounded-xp') {
  await page.route('**/src/cloud.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export const cloudEnabled = true;
      export const describeAuthError = () => '';
      export const saveProgress = async (uid, data) => window.writes.push(structuredClone(data));
      export const sendReset = async () => {};
      export const signInWithEmail = async () => {};
      export const signOutUser = async () => {};
      export const signUpWithEmail = async () => {};
      export const watchUser = callback => {
        queueMicrotask(() => callback({ uid: 'persistence-test', email: 'test@example.invalid' }));
        return () => {};
      };
      export const watchProgress = (uid, callback) => {
        window.cloudCallback = callback;
        queueMicrotask(() => callback(window.seed, { pending: false, fromCache: false }));
        return () => {};
      };
      export const saveRunRoute = async (uid, run) => window.uploads.push(run.id);
      export const loadRunRoute = async () => {
        window.routeLoads += 1;
        if (new URL(location.href).searchParams.has('offline')) throw new Error('Route service offline');
        return window.completedRoute ?? null;
      };
      export const deleteRunRoute = async () => {};
    `,
  }))
  await page.addInitScript(({ mode }) => {
    const harness = window as unknown as Harness
    const now = Date.now()
    const date = new Date()
    const key = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
    const legacy: RecordedRun = {
      id: 'old-461', owner: 'persistence-test', status: 'finished',
      startedAt: now - 600_000, finishedAt: now - 120_000,
      elapsedMs: 478_000, distanceM: 461,
      points: [{ lat: 0, lng: 0, at: now - 600_000, segment: true }, { lat: 0.001, lng: 0.001, at: now - 120_000, segment: false }],
    }
    const empty = { ...legacy, id: 'empty', distanceM: 0 }
    const fresh = { ...legacy, id: 'fresh-pending', startedAt: now - 30_000, finishedAt: now - 1000, elapsedMs: 29_000, distanceM: mode === 'short-xp' || mode === 'rounded-xp' ? 13 : 12 }
    const completed: RecordedRun = {
      ...legacy, id: 'completed-route', startedAt: now - 2_640_000, finishedAt: now - 1000,
      distanceM: 4340, elapsedMs: 2_634_000,
      points: [
        { lat: 12.9700, lng: 77.5900, at: now - 2_640_000, segment: true },
        { lat: 12.9706, lng: 77.5902, at: now - 2_300_000, segment: false },
        { lat: 12.9711, lng: 77.5912, at: now - 2_000_000, segment: false },
        { lat: 12.9698, lng: 77.5920, at: now - 1_600_000, segment: false },
        { lat: 12.9690, lng: 77.5910, at: now - 1_000_000, segment: false },
        { lat: 12.9695, lng: 77.5897, at: now - 500_000, segment: false },
        { lat: 12.9701, lng: 77.5900, at: now - 1000, segment: false },
      ],
    }
    const hasPending = mode === 'pending' || mode === 'short-xp'
    const saved = hasPending || mode === 'rounded-xp' ? [legacy, empty, fresh] : [legacy, empty]
    let pending = hasPending ? ['fresh-pending'] : []
    harness.writes = []
    harness.uploads = []
    harness.acknowledgements = []
    harness.historyCalls = 0
    harness.clears = 0
    harness.commands = []
    harness.imageExports = []
    harness.cancelExport = false
    harness.failExport = false
    harness.snapshotCalls = 0
    harness.completedRoute = completed
    harness.routeLoads = 0
    harness.seed = {
      completed: 1, challengeDone: false, xp: 1, currentLevel: 1,
      exerciseTotals: { run: 0, push: 0 }, dailyLogs: {},
      attendanceDates: { [key]: 'training' }, activityDates: { [key]: true },
      runs: mode === 'web-summary' ? [completed] : [empty], runHistoryResetAt: 0, lastAttendanceCheckDate: key,
      xpHistory: { [key]: 1 }, xpBreakdown: { [key]: { 'attendance:training': 1 } },
    }
    if (mode === 'rounded-xp') {
      harness.seed.exerciseTotals.run = 0.013
      harness.seed.dailyLogs = { [key]: { run: 0.013 } }
      harness.seed.runs = [{ id: fresh.id, startedAt: fresh.startedAt, finishedAt: fresh.finishedAt, elapsedMs: fresh.elapsedMs, distanceM: 13 }]
      harness.seed.xpBreakdown = { [key]: { 'attendance:training': 1, 'exercise:run': 0 } }
      const previous = localStorage.getItem('level-up-state')
      if (previous) harness.seed = JSON.parse(previous)
    }
    const restoredRun = mode === 'completed' ? sessionStorage.getItem('test-last-run') : null
    if (restoredRun) {
      const previous = localStorage.getItem('level-up-state')
      if (previous) harness.seed = JSON.parse(previous)
    }
    localStorage.setItem('level-up-state', JSON.stringify(harness.seed))
    localStorage.setItem('level-up-owner', 'persistence-test')
    let active: RecordedRun | null = restoredRun ? JSON.parse(restoredRun) : null
    Object.assign(window, {
      CapacitorCustomPlatform: { name: mode === 'web-summary' ? 'web' : 'android' },
      Capacitor: {
        PluginHeaders: [{ name: 'RunTracker', methods: ['command', 'snapshot', 'history', 'acknowledge', 'clearHistory', 'saveImage'].map((name) => ({ name, rtype: 'promise' })) }],
        nativePromise: async (_plugin: string, method: string, options: { owner: string; action: string; ids: string[]; resetAt: number; dataUrl: string; filename: string }) => {
          if (method === 'saveImage') {
            harness.imageExports.push({ dataUrl: options.dataUrl, filename: options.filename })
            if (harness.failExport) throw new Error('Device storage is full.')
            return { cancelled: harness.cancelExport }
          }
          if (method === 'snapshot') harness.snapshotCalls += 1
          if (method === 'history') {
            harness.historyCalls += 1
            if (mode === 'race' && harness.historyCalls === 1) {
              return new Promise((resolve) => { harness.releaseHistory = () => resolve({ runs: saved, pendingIds: ['old-461'] }) })
            }
            return { runs: saved, pendingIds: pending }
          }
          if (method === 'acknowledge') {
            harness.acknowledgements.push(...options.ids)
            pending = pending.filter((id) => !options.ids.includes(id))
            return
          }
          if (method === 'clearHistory') {
            harness.clears += 1
            harness.nativeCutoff = options.resetAt
            return
          }
          if (method === 'command') {
            harness.commands.push(options.action)
            if (options.action === 'start') active = { ...empty, id: 'stationary-new', owner: options.owner, startedAt: Date.now(), finishedAt: 0, elapsedMs: 5000, status: 'running', points: [] }
            if (options.action === 'start' && mode === 'completed' && !sessionStorage.getItem('test-last-run')) active = { ...completed, status: 'running', finishedAt: 0 }
            if (options.action === 'finish' && active) {
              active = { ...active, status: 'finished', finishedAt: Date.now(), discarded: mode !== 'completed' }
              if (mode === 'completed') {
                saved.push(active)
                pending.push(active.id)
                sessionStorage.setItem('test-last-run', JSON.stringify(active))
              }
            }
          }
          return { run: active, gpsStatus: 'Ready to record' }
        },
      },
    })
  }, { mode })
  await page.goto('/')
}

const progress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('level-up-state')!) as Progress)

test('stationary start/stop creates no workout and cannot replay a legacy 461 m run', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await expect(page.getByText("Today's total: 0 km", { exact: true })).toBeVisible()
  await page.locator('#open-run-recorder').click()
  await page.locator('#run-start').click()
  await expect(page.locator('#run-finish')).toBeVisible()
  await page.locator('#run-finish').click()
  await expect(page.getByText('No movement recorded. Run was not saved.', { exact: true })).toBeVisible()
  await expect(page.locator('#close-run-recorder')).toBeVisible()
  await expect(page.locator('#run-summary')).toHaveCount(0)
  const state = await progress(page)
  expect(state.runs).toEqual([])
  expect(state.exerciseTotals.run).toBe(0)
  expect(await page.evaluate(() => (window as unknown as Harness).uploads)).toEqual([])
  expect(await page.evaluate(() => (window as unknown as Harness).writes.every((state) => !state.runs.length && state.exerciseTotals.run === 0))).toBe(true)
})

test('a genuinely pending new recording is recovered and credited once', async ({ page }) => {
  await prepare(page, 'pending')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await expect(page.getByText("Today's total: 0.012 km", { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).acknowledgements)).toEqual(['fresh-pending'])
  await page.evaluate(() => dispatchEvent(new Event('online')))
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).historyCalls)).toBeGreaterThanOrEqual(2)
  const state = await progress(page)
  expect(state.runs.map((run) => run.id)).toEqual(['fresh-pending'])
  expect(state.exerciseTotals.run).toBe(0.012)
  expect(await page.evaluate(() => (window as unknown as Harness).uploads)).not.toContain('old-461')
  expect(await page.evaluate(() => (window as unknown as Harness).uploads)).not.toContain('empty')
})

test('reset survives an in-flight native history response and an older cloud snapshot', async ({ page }) => {
  await prepare(page, 'race')
  await page.locator('#profile').click()
  await page.locator('#profile-tab-settings').click()
  await page.locator('#reset-progress').click()
  await page.locator('#reset-code-new').fill('123456')
  await page.locator('#reset-code-confirm').fill('123456')
  await page.locator('#save-reset-code').click()
  await page.locator('#confirm-reset').click()
  await expect.poll(async () => (await progress(page)).runHistoryResetAt).toBeGreaterThan(0)
  await page.evaluate(() => (window as unknown as Harness).releaseHistory())
  await page.evaluate(() => {
    const harness = window as unknown as Harness
    harness.cloudCallback(harness.seed, { pending: false, fromCache: false })
  })
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).writes.some((state) => state.runHistoryResetAt > 0))).toBe(true)
  const state = await progress(page)
  expect(state.runs).toEqual([])
  expect(state.exerciseTotals.run).toBe(0)
  expect(await page.evaluate(() => (window as unknown as Harness).clears)).toBe(1)
  expect(await page.evaluate(() => (window as unknown as Harness).nativeCutoff)).toBe(state.runHistoryResetAt)
})

test('a newer reset from another device wins over locally unsynced progress', async ({ page }) => {
  await prepare(page, 'pending')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await expect(page.getByText("Today's total: 0.012 km", { exact: true })).toBeVisible()
  await page.evaluate(() => {
    const harness = window as unknown as Harness
    harness.cloudCallback({ ...harness.seed, runs: [], runHistoryResetAt: Date.now() }, { pending: false, fromCache: false })
  })
  await expect(page.getByText("Today's total: 0 km", { exact: true })).toBeVisible()
  await expect.poll(async () => (await progress(page)).runHistoryResetAt).toBeGreaterThan(0)
  const state = await progress(page)
  expect(state.runs).toEqual([])
  expect(state.exerciseTotals.run).toBe(0)
  await page.evaluate(() => dispatchEvent(new Event('online')))
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).historyCalls)).toBeGreaterThanOrEqual(2)
  expect((await progress(page)).runs).toEqual([])
})

test('training uses decimal kilometres and saves the entered distance unchanged', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  const reading = page.getByRole('spinbutton', { name: 'Run kilometres' })
  await expect(reading).toHaveAttribute('step', '0.001')
  await expect(reading).toHaveAttribute('inputmode', 'decimal')
  await reading.fill('0.461')
  await page.locator('.add-exercise[data-exercise="run"]').click()
  await expect(page.getByText("Today's total: 0.461 km", { exact: true })).toBeVisible()
  await expect(page.getByText('All-time total: 0.461 km', { exact: true })).toBeVisible()
  await expect(reading).toHaveValue('0.461')
  expect((await progress(page)).exerciseTotals.run).toBe(0.461)
})

test('exercise titles and controls share a row while totals have full width on small phones', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await page.getByRole('spinbutton', { name: 'Run kilometres' }).fill('0.013')
  await page.locator('.add-exercise[data-exercise="run"]').click()
  await page.getByRole('spinbutton', { name: 'Push-ups count' }).fill('12345')
  await page.locator('.add-exercise[data-exercise="push"]').click()
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 800 })
    const layout = await page.locator('.run-log-item').evaluate((row) => {
      const description = row.querySelector('.log-summary')!.getBoundingClientRect()
      const controls = row.querySelector('.run-log-actions')!.getBoundingClientRect()
      const start = row.querySelector('#open-run-recorder')!.getBoundingClientRect()
      const statistics = row.querySelector('.log-statistics')!.getBoundingClientRect()
      return {
        controlsBeside: controls.left >= description.right - 1,
        sameRow: controls.top < description.bottom && controls.bottom > description.top,
        startBelow: start.top >= Math.max(description.bottom, controls.bottom),
        statisticsBelow: statistics.top >= Math.max(description.bottom, controls.bottom),
        statisticsWidth: statistics.width,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }
    })
    expect(layout.controlsBeside).toBe(true)
    expect(layout.sameRow).toBe(true)
    expect(layout.startBelow).toBe(true)
    expect(layout.statisticsBelow).toBe(true)
    expect(layout.statisticsWidth).toBeGreaterThan(200)
    expect(layout.overflow).toBe(false)
    const multiline = await page.locator('.log-statistics small span').evaluateAll((lines) => lines.filter((line) => {
      const range = document.createRange()
      range.selectNodeContents(line)
      return range.getClientRects().length !== 1 || line.scrollWidth > line.clientWidth
    }).map((line) => line.textContent))
    expect(multiline).toEqual([])
  }
  await page.screenshot({ path: 'node_modules/.cache/training-day-km.png', fullPage: true })
})

test('Finish downloads once and keeps the map and metrics until the next Start', async ({ page }) => {
  await prepare(page, 'completed')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await page.locator('#open-run-recorder').click()
  await expect(page.locator('#run-start')).toBeVisible()
  await expect(page.locator('#run-time')).toHaveText('00:00')
  expect(await page.evaluate(() => (window as unknown as Harness).commands)).toEqual([])
  await page.locator('#run-start').click()
  await expect(page.locator('#run-finish')).toBeVisible()
  await page.locator('#run-finish').click()
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).imageExports.length)).toBe(1)
  expect(await page.evaluate(() => (window as unknown as Harness).imageExports[0].dataUrl)).toMatch(/^data:image\/png;base64,/)
  await expect(page.locator('#run-tracker')).toBeVisible()
  await expect(page.locator('#run-summary-canvas')).toHaveCount(0)
  await expect(page.locator('#run-export-status')).toHaveText('Image saved.')
  await expect(page.locator('#run-distance')).toHaveText('4,340')
  await expect(page.locator('#run-pace')).toHaveText('10:07')
  await expect(page.locator('#run-time')).toHaveText('43:54')
  await expect(page.locator('#run-map')).toBeVisible()
  await expect(page.locator('#run-map path.leaflet-interactive')).toHaveCount(3)
  await expect(page.locator('#run-start')).toBeEnabled()
  await expect(page.locator('#run-finish')).toBeHidden()
  await expect(page.locator('#run-download')).toBeHidden()
  expect(await page.evaluate(() => (window as unknown as Harness).commands)).toEqual(['start', 'finish'])
  const pixels = await page.evaluate(async () => {
    const dataUrl = (window as unknown as Harness).imageExports[0].dataUrl
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob())
    const element = document.createElement('canvas')
    element.width = bitmap.width
    element.height = bitmap.height
    const context = element.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    const route = context.getImageData(100, 900, 880, 540).data
    const labels = context.getImageData(100, 300, 880, 580).data
    let routePixels = 0
    let textPixels = 0
    for (let index = 0; index < route.length; index += 4) if (route[index] > 200 && route[index + 1] > 50 && route[index + 1] < 170 && route[index + 2] < 160) routePixels++
    for (let index = 0; index < labels.length; index += 4) if (labels[index] > 200 && labels[index + 1] > 200 && labels[index + 2] > 200) textPixels++
    return { width: element.width, height: element.height, routePixels, textPixels }
  })
  expect(pixels.width).toBe(1080)
  expect(pixels.height).toBe(1920)
  expect(pixels.routePixels).toBeGreaterThan(1000)
  expect(pixels.textPixels).toBeGreaterThan(1000)
  const image = await page.evaluate(() => (window as unknown as Harness).imageExports[0])
  expect(image.dataUrl).toMatch(/^data:image\/png;base64,/)
  expect(image.filename).toMatch(/^level-up-run-.*\.png$/)
  await page.setViewportSize({ width: 320, height: 740 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.locator('#close-run-recorder').click()
  await expect(page.getByText("Today's total: 4.34 km", { exact: true })).toBeVisible()
  await page.locator('#open-run-recorder').click()
  await expect(page.locator('#run-start')).toBeVisible()
  await expect(page.locator('#run-distance')).toHaveText('4,340')
  await expect(page.locator('#run-map path.leaflet-interactive')).toHaveCount(3)
  expect(await page.evaluate(() => (window as unknown as Harness).imageExports.length)).toBe(1)
  await page.reload()
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await page.locator('#open-run-recorder').click()
  await expect(page.locator('#run-distance')).toHaveText('4,340')
  await expect(page.locator('#run-map path.leaflet-interactive')).toHaveCount(3)
  expect(await page.evaluate(() => (window as unknown as Harness).imageExports.length)).toBe(0)
  await page.locator('#run-start').click()
  await expect(page.locator('#run-distance')).toHaveText('0')
  await expect(page.locator('#run-map path.leaflet-interactive')).toHaveCount(0)
  await expect(page.locator('#run-finish')).toBeVisible()
  await expect(page.locator('#run-export')).toBeHidden()
  expect((await progress(page)).exerciseTotals.run).toBe(4.34)
})

for (const failure of ['cancelled', 'storage'] as const) {
  test(`image export ${failure} keeps the map and offers retry without crediting twice`, async ({ page }) => {
    await prepare(page, 'completed')
    await page.evaluate((failure) => {
      const harness = window as unknown as Harness
      harness.cancelExport = failure === 'cancelled'
      harness.failExport = failure === 'storage'
    }, failure)
    await page.getByRole('link', { name: "HUNTER LOG" }).click()
    await page.locator('#open-run-recorder').click()
    await page.locator('#run-start').click()
    await page.locator('#run-finish').click()
    await expect(page.locator('#run-export-status')).toHaveText(failure === 'cancelled' ? 'Download cancelled.' : 'Device storage is full.')
    await expect(page.locator('#run-summary-canvas')).toHaveCount(0)
    await expect(page.locator('#run-distance')).toHaveText('4,340')
    await expect(page.locator('#run-map')).toBeVisible()
    await expect(page.getByRole('button', { name: 'RETRY DOWNLOAD' })).toBeVisible()
    await page.evaluate(() => {
      const harness = window as unknown as Harness
      harness.cancelExport = false
      harness.failExport = false
    })
    await page.locator('#run-download').click()
    await expect(page.locator('#run-export-status')).toHaveText('Image saved.')
    await expect(page.locator('#run-tracker')).toBeVisible()
    await expect(page.locator('#run-distance')).toHaveText('4,340')
    await expect(page.locator('#run-download')).toBeHidden()
    expect((await progress(page)).exerciseTotals.run).toBe(4.34)
    expect((await progress(page)).runs).toHaveLength(1)
  })
}

test('summary preserves paused route gaps and prints the recorded statistics', async ({ page }) => {
  await prepare(page, 'web-summary')
  const drawing = await page.evaluate(async () => {
    const modulePath = '/src/run-summary.ts'
    const { drawRunSummary } = await import(modulePath)
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const context = canvas.getContext('2d')!
    const texts: string[] = []
    let lines = 0
    let moves = 0
    const originalText = context.fillText.bind(context)
    const originalLine = context.lineTo.bind(context)
    const originalMove = context.moveTo.bind(context)
    context.fillText = (text, positionX, positionY, maxWidth) => { texts.push(text); originalText(text, positionX, positionY, maxWidth) }
    context.lineTo = (positionX, positionY) => { lines += 1; originalLine(positionX, positionY) }
    context.moveTo = (positionX, positionY) => { moves += 1; originalMove(positionX, positionY) }
    const run = (window as unknown as Harness).completedRoute
    drawRunSummary(canvas, {
      ...run,
      points: [
        { lat: 0, lng: 0, at: 1, segment: true },
        { lat: 0, lng: 0.001, at: 2, segment: false },
        { lat: 0.001, lng: 0.002, at: 3, segment: true },
        { lat: 0.001, lng: 0.003, at: 4, segment: false },
      ],
    }, '10:07')
    return { lines, moves, texts }
  })
  expect(drawing.lines).toBe(2)
  expect(drawing.moves).toBe(2)
  expect(drawing.texts).toContain('4.34 km')
  expect(drawing.texts).toContain('10:07 /km')
  expect(drawing.texts).toContain('43m 54s')
  expect(drawing.texts).toContain('LEVEL UP')
})

test('Profile does not show saved runs or persist generated images', async ({ page }) => {
  await prepare(page, 'web-summary')
  await page.locator('#profile').click()
  await expect(page.locator('#run-tracker')).toHaveCount(0)
  await expect(page.locator('.run-history')).toHaveCount(0)
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name)))
    .not.toContain('level-up-run-images')
})

test('Profile sections organize overview, progression, stats, and settings', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.locator('#profile').click()
  await expect(page.getByRole('heading', { name: 'Hunter status' })).toHaveCount(0)
  await expect(page.getByText('PLAYER PROFILE')).toHaveCount(0)
  await expect(page.locator('.profile-tabs')).toHaveCSS('position', 'sticky')
  await expect(page.locator('#profile-tab-overview')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#profile-tab-overview')).toHaveClass(/active/)
  await expect(page.locator('.profile-rank-name')).toBeVisible()
  await expect(page.locator('.xp-chart-card')).toBeVisible()

  await page.getByRole('tab', { name: 'PROGRESS' }).click()
  await expect(page.locator('#show-level-progress')).toBeVisible()
  await expect(page.locator('.rank-up-history')).toBeVisible()

  await page.getByRole('tab', { name: 'STATS' }).click()
  await expect(page.locator('.profile-day-counts')).toBeVisible()
  await expect(page.locator('.system-stats')).toBeVisible()

  await page.getByRole('tab', { name: 'SETTINGS' }).click()
  await expect(page.locator('#app-theme')).toBeVisible()
  await expect(page.locator('.account-card')).toBeVisible()
})

test('progress rank path shows all descriptions in one info popup', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.locator('#profile').click()
  await page.getByRole('tab', { name: 'PROGRESS' }).click()
  await page.locator('#show-level-progress').check()
  await page.getByRole('link', { name: 'PROGRESS' }).click()

  await expect(page.getByRole('heading', { name: 'Rank path' })).toBeVisible()
  await expect(page.locator('.ladder-description')).toHaveCount(0)
  await expect(page.locator('[data-rank-info]')).toHaveCount(0)
  await page.getByRole('button', { name: 'View information for all ranks' }).click()
  await expect(page.getByRole('dialog')).toContainText("The World's Weakest Hunter")
  await expect(page.getByRole('dialog')).toContainText('The ultimate evolution and realization of his power.')
  await expect(page.locator('.rank-info-list li')).toHaveCount(8)
  await page.getByRole('button', { name: 'Close rank information' }).last().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('today completion shows the total XP earned for the day', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.getByRole('link', { name: 'HUNTER LOG' }).click()
  await page.locator('[data-quantity="push"]').fill('2')
  await page.locator('.add-exercise[data-exercise="push"]').click()
  await page.locator('#complete-today').click()
  await expect(page.locator('.today-completion-xp')).toContainText('TOTAL XP TODAY')
  await expect(page.locator('.today-completion-xp strong')).toHaveText('+1.2 XP')
})

test('switching app tabs returns the page to the top', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.getByRole('link', { name: 'CHALLENGES' }).click()
  await page.evaluate(() => {
    const spacer = document.createElement('div')
    spacer.style.height = '1600px'
    document.querySelector('main')!.append(spacer)
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.getByRole('link', { name: 'HOME' }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.locator('.hero-panel')).toBeVisible()
})

test('idle tracking does not repeatedly request native snapshots or scan history', async ({ page }) => {
  await prepare(page, 'stationary')
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).snapshotCalls)).toBe(1)
  const before = await page.evaluate(() => {
    const harness = window as unknown as Harness
    return { snapshots: harness.snapshotCalls, history: harness.historyCalls }
  })
  await page.waitForTimeout(3200)
  expect(await page.evaluate(() => {
    const harness = window as unknown as Harness
    return { snapshots: harness.snapshotCalls, history: harness.historyCalls }
  })).toEqual(before)
})

test('training exercises have no background video before or after logging', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await expect(page.getByRole('heading', { name: 'Log your training' })).toBeVisible()
  await expect(page.locator('.today-training-layout video')).toHaveCount(0)
  await expect(page.locator('.today-training-background')).toHaveCount(0)
  await page.locator('[data-quantity="run"]').fill('1')
  await page.locator('.add-exercise[data-exercise="run"]').click()
  await expect(page.locator('.today-training-layout video')).toHaveCount(0)
  await expect(page.getByText("Today's total: 1 km", { exact: true })).toBeVisible()
})

test('profile video keeps its element across updates and pauses when hidden or off-screen', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.locator('#profile').click()
  const video = page.locator('.profile-rank-video')
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false)
  await video.evaluate((element: HTMLVideoElement) => { element.dataset.retained = 'true' })
  await page.locator('[data-xp-range="90"]').click()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(video).toHaveAttribute('data-retained', 'true')
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false)
  const time = await video.evaluate((element: HTMLVideoElement) => element.currentTime)
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).not.toBe(time)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false)
  await page.evaluate(() => {
    const spacer = document.createElement('div')
    spacer.style.height = '2000px'
    document.querySelector('main')!.append(spacer)
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false)
  const previousVideo = await video.elementHandle()
  await page.locator('a[data-tab="home"]').click()
  expect(await previousVideo!.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true)
  expect(await page.locator('.topbar').evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none')
})

test('a 13 metre tracked run earns 0.0325 XP without losing the fractional credit', async ({ page }) => {
  await prepare(page, 'short-xp')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await expect(page.getByText("Today's total: 0.013 km", { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).acknowledgements)).toEqual(['fresh-pending'])
  expect((await progress(page)).xp).toBe(1.0325)
  const sources = Object.values((await progress(page)).xpBreakdown as Record<string, Record<string, number>>)
  expect(sources[0]['exercise:run']).toBe(0.0325)
  await page.locator('#profile').click()
  await expect(page.locator('.xp-day-sources').getByText('+0.0325 XP', { exact: true })).toBeVisible()
  await page.evaluate(() => dispatchEvent(new Event('online')))
  await expect.poll(() => page.evaluate(() => (window as unknown as Harness).historyCalls)).toBeGreaterThanOrEqual(2)
  expect((await progress(page)).xp).toBe(1.0325)
})

test('a one metre manual entry preserves its 0.0025 XP credit', async ({ page }) => {
  await prepare(page, 'stationary')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await page.getByRole('spinbutton', { name: 'Run kilometres' }).fill('0.001')
  await page.locator('.add-exercise[data-exercise="run"]').click()
  await expect(page.getByText('0.001 km logged · +0.0025 XP', { exact: true })).toBeVisible()
  expect((await progress(page)).xp).toBe(1.0025)
  expect(Object.values((await progress(page)).xpHistory as Record<string, number>)[0]).toBe(1.0025)
})

test('previously rounded-away run XP is restored once and survives reopening', async ({ page }) => {
  await prepare(page, 'rounded-xp')
  await page.getByRole('link', { name: "HUNTER LOG" }).click()
  await expect.poll(async () => (await progress(page)).xp).toBe(1.0325)
  expect((await progress(page)).runs).toHaveLength(1)
  await page.reload()
  await page.locator('#profile').click()
  await expect(page.locator('.xp-day-sources').getByText('+0.0325 XP', { exact: true })).toBeVisible()
  expect((await progress(page)).xp).toBe(1.0325)
  expect((await progress(page)).exerciseTotals.run).toBe(0.013)
  expect((await progress(page)).runs).toHaveLength(1)
})