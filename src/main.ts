import './style.css'
import { cloudEnabled, describeAuthError, saveProgress, sendReset, signInWithEmail, signOutUser, signUpWithEmail, watchProgress, watchUser, type CloudRecord, type CloudUser } from './cloud'
import mountainTownVideo from './assets/From Klickpin.com- Cultural mountain town stories for people who love beauty for creative people to pin for future adve-pin-id-907686499886846221.mp4'
import patternStorageVideo from './assets/From Klickpin.com- Practical pattern storage tips with charm and useful ideas this season for stylish handmade days-pin-id-921267667539985906.mp4'
import oldMoneyOutfitVideo from './assets/From Klickpin.com- Chic old money outfit ideas that make everyday moments look more intentional memorable and beautifully styled for busy people w.mp4'
import travelPackingVideo from './assets/From Klickpin.com- Pin these 28 Practical travel packing tips that are worth saving if you love elegant details and creative inspiration for begin.mp4'
import summerOutfitVideo from './assets/From Klickpin.com- Try Simple summer outfit ideas that can instantly upgrade your look room party or daily routine for your next inspiration board.mp4'
import authBackgroundVideo from './assets/From Klickpin.com- Creative hemming tricks and clever inspiration for simple living to pin for your next project-pin-id-734790495486499121.mp4'

type ExerciseEntry = { id: string; label: string; xpPerUnit: number; unitLabel: string }
type Challenge = { name: string; detail: string; reward: number; className: string }
type DayMode = 'training' | 'recovery'
type TrainingState = {
  completed: number;
  challengeDone: boolean;
  xp: number;
  currentLevel: number;
  exerciseTotals: Record<string, number>;
  dailyLogs: Record<string, Record<string, number>>;
  activityDates: Record<string, true>;
  attendanceDates: Record<string, DayMode>;
  xpHistory: Record<string, number>;
  xpBreakdown: Record<string, Record<string, number>>;
  customExercises: ExerciseEntry[];
  customChallenges: Challenge[];
  savedChallenges: Challenge[];
  lastAttendanceCheckDate?: string;
}
type Tab = 'home' | 'today' | 'progress' | 'missions' | 'profile'

const XP_CONFIG = {
  levelThresholds: [0, 333, 778, 1444, 2333, 3333, 4555, 5999, 7777],
  exercise: {
    push: 0.1,
    run: 2.5,
    custom: 0.1,
    trainingAttendanceBonus: 1,
    recoveryAttendanceBonus: 2,
    missPenalty: 2,
  },
} as const

const levels = [
  { name: 'Awakening', rank: '01', push: '20 x 3', squat: '20 x 3', core: '20 x 3', run: '2 km', xp: 333 },
  { name: 'Recruit', rank: '02', push: '22 x 3', squat: '22 x 3', core: '22 x 3', run: '2.5 km', xp: 778 },
  { name: 'Hunter', rank: '03', push: '25 x 3', squat: '25 x 3', core: '25 x 3', run: '3 km', xp: 1444 },
  { name: 'Elite', rank: '04', push: '28 x 3', squat: '28 x 3', core: '28 x 3', run: '4 km', xp: 2333 },
  { name: 'Commander', rank: '05', push: '30 x 3', squat: '30 x 3', core: '30 x 3', run: '5 km', xp: 3333 },
  { name: 'Monarch', rank: '06', push: '25 x 4', squat: '35 x 3', core: '35 x 3', run: '6 km', xp: 4555 },
  { name: 'Shadow Monarch', rank: '07', push: '25 x 4', squat: '25 x 4', core: '25 x 4', run: '8 km', xp: 5999 },
  { name: 'National Level', rank: '08', push: '100 total', squat: '100 total', core: '100 total', run: '10 km', xp: 7777 },
]
const baseChallenges: Challenge[] = [
  { name: 'Power ladder', detail: 'Complete 5 rounds: 15 push-ups, 20 squats, and 30 high knees. Rest 90 seconds between rounds.', reward: 8, className: 'power' },
  { name: 'Core hold', detail: 'Complete 5 rounds: 60-second plank, 20 dead bugs, and 20 slow mountain climbers. Rest 90 seconds between rounds.', reward: 7, className: 'core' },
  { name: 'Run the line', detail: 'Walk or run for 40 minutes at a sustainable pace. Take brief water breaks as needed.', reward: 9, className: 'run' },
  { name: 'Mobility reset', detail: 'Move through 40 minutes of full-body mobility: hips, ankles, shoulders, spine, and hamstrings.', reward: 5, className: 'mobility' },
  { name: 'Lower body burst', detail: 'Complete 5 rounds: 25 squats, 16 reverse lunges per side, and 20 glute bridges. Rest 90 seconds.', reward: 8, className: 'lower' },
  { name: 'Balance builder', detail: 'Complete 5 rounds: 60-second single-leg balance per side, 20 calf raises, and 12 lateral lunges per side.', reward: 6, className: 'balance' },
  { name: 'Wall sit', detail: 'Complete 5 rounds: 75-second wall sit, 20 squats, and 16 step-back lunges per side. Rest 90 seconds.', reward: 7, className: 'lower' },
  { name: 'Step up', detail: 'Complete 5 rounds: 25 step-ups per side, 15 incline push-ups, and 30 marching high knees. Rest 90 seconds.', reward: 8, className: 'power' },
  { name: 'Easy stride', detail: 'Take a brisk 40-minute walk. Add a 60-second faster interval every 5 minutes.', reward: 5, className: 'run' },
  { name: 'Dead bug drill', detail: 'Complete 5 rounds: 20 dead bugs per side, 20 bird dogs per side, and a 60-second side plank per side.', reward: 7, className: 'core' },
  { name: 'Hip opener', detail: 'Spend 40 minutes on hip mobility: deep squat holds, 90/90 switches, hip flexor stretches, and gentle lunges.', reward: 5, className: 'mobility' },
  { name: 'Calf raise set', detail: 'Complete 5 rounds: 35 calf raises, 20 tibialis raises, 16 split squats per side, and 60 seconds of balance.', reward: 6, className: 'balance' },
]
const stored = localStorage.getItem('level-up-state')
const oldState = stored ? JSON.parse(stored) : {}
const localDateKey = (date: Date) => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}` }
const todayKey = () => localDateKey(new Date())
const buildState = (oldState: Record<string, any>): TrainingState => ({
  completed: oldState.completed ?? 0,
  challengeDone: oldState.challengeDone ?? oldState.missionDone ?? false,
  xp: oldState.xp ?? 0,
  currentLevel: oldState.currentLevel ?? 1,
  exerciseTotals: oldState.exerciseTotals ?? { push: 0, run: 0 },
  dailyLogs: oldState.dailyLogs ?? {},
  activityDates: oldState.activityDates ?? {},
  attendanceDates: oldState.attendanceDates ?? {},
  xpHistory: oldState.xpHistory ?? {},
  xpBreakdown: oldState.xpBreakdown ?? {},
  customExercises: (oldState.customExercises ?? []).map((exercise: Partial<ExerciseEntry>) => ({
    id: exercise.id ?? buildExerciseId(exercise.label ?? 'exercise'),
    label: exercise.label ?? 'Custom exercise',
    xpPerUnit: Number.isFinite(exercise.xpPerUnit) && Number(exercise.xpPerUnit) > 0 ? Number(exercise.xpPerUnit) : XP_CONFIG.exercise.custom,
    unitLabel: exercise.unitLabel?.trim() || 'unit',
  })),
  customChallenges: oldState.customChallenges ?? [],
  savedChallenges: oldState.savedChallenges ?? [...baseChallenges, ...(oldState.customChallenges ?? [])],
  lastAttendanceCheckDate: oldState.lastAttendanceCheckDate ?? oldState.lastDecayDate,
})
let state = buildState(oldState)

const OWNER_KEY = 'level-up-owner'
const DIRTY_KEY = 'level-up-dirty'
const RESET_CREDENTIAL_KEY = 'level-up-reset-code-credential'
type ResetCredential = { salt: string; hash: string }
const storedResetCredential = localStorage.getItem(RESET_CREDENTIAL_KEY)
let resetCredential: ResetCredential | null = (() => {
  try { return storedResetCredential ? JSON.parse(storedResetCredential) as ResetCredential : null } catch { return null }
})()
type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error'
let authReady = !cloudEnabled
let currentUser: CloudUser | null = null
let awaitingFirstSync = false
let firstSyncDone = !cloudEnabled
let syncStatus: SyncStatus = cloudEnabled ? 'syncing' : 'local'
let syncErrorCode = ''
// Survives an app restart so offline changes are pushed instead of overwritten by the cloud copy.
let isDirty = localStorage.getItem(DIRTY_KEY) === '1'
let changeVersion = 0
let syncTimer: number | undefined
let stopProgressWatch: (() => void) | null = null
let authMode: 'signin' | 'signup' = 'signin'
let authBusy = false
let authEmail = ''
let authMessage = ''
let authMessageKind: 'error' | 'info' = 'error'
const save = () => {
  localStorage.setItem('level-up-state', JSON.stringify(state))
  markDirty()
}
const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
async function hashResetCode(code: string): Promise<ResetCredential> {
  if (!crypto.subtle) throw new Error('Secure code storage is not available on this device.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210_000, hash: 'SHA-256' }, key, 256)
  return { salt: bytesToHex(salt), hash: bytesToHex(new Uint8Array(bits)) }
}
async function verifyResetCode(code: string, credential: ResetCredential) {
  if (!crypto.subtle) throw new Error('Secure code verification is not available on this device.')
  const salt = new Uint8Array(credential.salt.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [])
  if (salt.length !== 16 || !/^[a-f0-9]{64}$/i.test(credential.hash)) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210_000, hash: 'SHA-256' }, key, 256)
  const actual = new Uint8Array(bits)
  const expected = credential.hash.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16))
  return actual.every((byte, index) => byte === expected[index])
}
const needsXpBackfill = !oldState.xpHistory
const needsBreakdownBackfill = !oldState.xpBreakdown
const roundXp = (value: number) => Math.round(value * 10) / 10
const addXp = (dateKey: string, amount: number, source: string) => {
  const before = state.xp
  state.xp = Math.max(0, state.xp + amount)
  const applied = state.xp - before
  state.xpHistory[dateKey] = roundXp((state.xpHistory[dateKey] ?? 0) + applied)
  const day = state.xpBreakdown[dateKey] ?? {}
  day[source] = roundXp((day[source] ?? 0) + applied)
  state.xpBreakdown[dateKey] = day
}
const challenges = () => state.savedChallenges
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
const current = () => levels[Math.min(state.currentLevel - 1, levels.length - 1)]
const todayLog = () => state.dailyLogs[todayKey()] ?? {}
const hasTrainingActivity = (dateKey: string) => Boolean(state.activityDates[dateKey]) || Object.keys(state.dailyLogs[dateKey] ?? {}).length > 0
const hunterTitle = () => ['The Awakened', 'Iron Will', 'Dungeon Breaker', 'Distance Hunter', 'Elite Vanguard', 'Commanding Force', 'Shadow Sovereign', 'National Hunter'][state.currentLevel - 1] ?? 'National Hunter'
const hunterStats = () => [
  { label: 'STR', value: Math.floor((state.exerciseTotals.push ?? 0) / 10), detail: 'Strength' },
  { label: 'VIT', value: state.completed, detail: 'Vitality' },
  { label: 'AGI', value: Math.floor(state.exerciseTotals.run ?? 0), detail: 'Agility' },
  { label: 'END', value: getDayCounts().total, detail: 'Plan days' },
  { label: 'DEX', value: state.customExercises.length, detail: 'Dexterity' },
]
const getDayCounts = () => {
  const trainingDates = new Set(Object.keys(state.activityDates))
  Object.entries(state.dailyLogs).forEach(([dateKey, log]) => {
    if (Object.keys(log).length > 0) trainingDates.add(dateKey)
  })
  Object.entries(state.attendanceDates).forEach(([dateKey, mode]) => {
    if (mode === 'training') trainingDates.add(dateKey)
  })

  const recoveryDates = new Set(Object.entries(state.attendanceDates)
    .filter(([dateKey, mode]) => mode === 'recovery' && !trainingDates.has(dateKey))
    .map(([dateKey]) => dateKey))
  const training = Math.max(state.completed, trainingDates.size)
  const recovery = recoveryDates.size
  const total = Math.max(trainingDates.size + recovery, training + recovery)
  return { training, recovery, total }
}
const renderDayCountSummary = (className: string) => {
  const counts = getDayCounts()
  return `<div class="day-count-summary ${className}" aria-label="Training and recovery day totals"><div class="day-count-item"><span>TRAINING</span><strong>${counts.training}</strong></div><div class="day-count-item"><span>RECOVERY</span><strong>${counts.recovery}</strong></div><div class="day-count-item"><span>TOTAL DAYS</span><strong>${counts.total}</strong></div></div>`
}
const recordTrainingDay = (dateKey: string) => {
  if (hasTrainingActivity(dateKey)) return false
  state.activityDates[dateKey] = true
  state.completed += 1
  return true
}
const getNextDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return localDateKey(new Date(year, month - 1, day + 1))
}
const getAttendanceCredit = (mode: DayMode) => mode === 'training'
  ? XP_CONFIG.exercise.trainingAttendanceBonus
  : XP_CONFIG.exercise.recoveryAttendanceBonus
const recordAttendance = (mode: DayMode) => {
  const dateKey = todayKey()
  if (state.attendanceDates[dateKey]) return null

  state.attendanceDates[dateKey] = mode
  if (mode === 'training') recordTrainingDay(dateKey)

  const credit = getAttendanceCredit(mode)
  addXp(dateKey, credit, `attendance:${mode}`)
  syncLevelFromXp()
  save()
  return credit
}
const getExerciseXpGain = (exerciseId: string) => {
  if (exerciseId === 'push') return XP_CONFIG.exercise.push
  if (exerciseId === 'run') return XP_CONFIG.exercise.run
  return state.customExercises.find((exercise) => exercise.id === exerciseId)?.xpPerUnit ?? XP_CONFIG.exercise.custom
}
const getExerciseXpLabel = (exerciseId: string) => {
  if (exerciseId === 'push') return `+${XP_CONFIG.exercise.push} XP / rep`
  if (exerciseId === 'run') return `+${XP_CONFIG.exercise.run} XP / km`
  const exercise = state.customExercises.find((item) => item.id === exerciseId)
  return `+${exercise?.xpPerUnit ?? XP_CONFIG.exercise.custom} XP / ${exercise?.unitLabel ?? 'unit'}`
}
const syncLevelFromXp = () => {
  let nextLevel = 1
  for (let index = 0; index < XP_CONFIG.levelThresholds.length - 1; index += 1) {
    if (state.xp >= XP_CONFIG.levelThresholds[index + 1]) nextLevel = index + 2
  }
  state.currentLevel = Math.min(nextLevel, levels.length)
}
const getLevelProgress = () => {
  const currentThresholdIndex = Math.min(state.currentLevel - 1, XP_CONFIG.levelThresholds.length - 2)
  const previousThreshold = XP_CONFIG.levelThresholds[currentThresholdIndex]
  const nextThreshold = XP_CONFIG.levelThresholds[currentThresholdIndex + 1]
  const currentProgress = Math.max(state.xp - previousThreshold, 0)
  const totalProgress = Math.max(nextThreshold - previousThreshold, 1)
  return {
    previousThreshold,
    nextThreshold,
    currentProgress,
    totalProgress,
    percent: Math.min((currentProgress / totalProgress) * 100, 100),
  }
}
const applyMissedDayPenalties = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const throughDate = localDateKey(yesterday)

  if (!state.lastAttendanceCheckDate) {
    state.lastAttendanceCheckDate = throughDate
    save()
    return
  }

  let dateKey = getNextDateKey(state.lastAttendanceCheckDate)
  while (dateKey <= throughDate) {
    if (!state.attendanceDates[dateKey] && !hasTrainingActivity(dateKey)) {
      addXp(dateKey, -XP_CONFIG.exercise.missPenalty, 'penalty')
    }
    state.lastAttendanceCheckDate = dateKey
    dateKey = getNextDateKey(dateKey)
  }
  syncLevelFromXp()
  save()
}
const baseExercises = [
  { id: 'run', label: 'Run', icon: 'run' },
  { id: 'push', label: 'Push-ups', icon: 'pushup' },
] as const
const exercises = () => [
  ...baseExercises.map((exercise) => ({ ...exercise })),
  ...state.customExercises.map((exercise) => ({ ...exercise, icon: 'custom' }))
]

const buildExerciseId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `exercise-${Date.now()}`

const TAG_OPTIONS = [
  { id: 'exercise', label: 'Exercise' },
  { id: 'motivational', label: 'Motivational' },
  { id: 'inspirational', label: 'Inspirational' },
  { id: 'success', label: 'Success' },
  { id: 'perseverance', label: 'Perseverance' },
  { id: 'courage', label: 'Courage' },
  { id: 'wisdom', label: 'Wisdom' },
  { id: 'happiness', label: 'Happiness' },
  { id: 'life', label: 'Life' },
  { id: 'love', label: 'Love' },
  { id: 'breakup', label: 'Breakup' },
  { id: 'sad', label: 'Sad' },
  { id: 'one-side-love', label: 'One Side Love' },
  { id: 'famous-writers', label: 'Famous Writers' },
]
const storedTags = localStorage.getItem('level-up-quote-tags')
let selectedTags: string[] = storedTags ? JSON.parse(storedTags).map((tag: string) => tag === 'gym' ? 'exercise' : tag) : ['exercise', 'motivational']
const saveTags = () => { localStorage.setItem('level-up-quote-tags', JSON.stringify(selectedTags)); markDirty() }
const storedCustomQuotes = localStorage.getItem('level-up-custom-quotes')
const storedSavedQuotes = localStorage.getItem('level-up-saved-quotes')
const legacyCustomQuotes: string[] = storedCustomQuotes ? JSON.parse(storedCustomQuotes) : []
const legacySavedQuotes: { text?: string; savedAt?: number }[] = storedSavedQuotes ? JSON.parse(storedSavedQuotes) : []
const latestLegacyQuote = [...legacySavedQuotes].sort((left, right) => (right.savedAt ?? 0) - (left.savedAt ?? 0)).find((quote) => quote.text)?.text
let currentQuote: string | null = localStorage.getItem('level-up-current-quote') || latestLegacyQuote || legacyCustomQuotes.at(-1) || null
if (currentQuote) localStorage.setItem('level-up-current-quote', currentQuote)
;['level-up-custom-quotes', 'level-up-saved-quotes'].forEach((key) => localStorage.removeItem(key))
const setCurrentQuote = (text: string) => {
  currentQuote = text
  localStorage.setItem('level-up-current-quote', text)
  markDirty()
}

let activeTab: Tab = 'home'
let tagDropdownOpen = false
let quoteLoading = false
let customQuoteFormOpen = false
let trainingBackgroundVideo: HTMLVideoElement | null = null
let customExerciseFormOpen = false
let resetConfirmationOpen = false
let signOutConfirmationOpen = false
let resetCodeStep: 'setup' | 'verify' | 'confirm' = 'verify'
let resetCodeError = ''
let resetCodeBusy = false
let pendingExerciseDeletion: ExerciseEntry | null = null
let selectedChallengeIndex = 0
let challengeWheelRotation = 0
let challengeSpinning = false
let customChallengeFormOpen = false
let editingChallengeIndex: number | null = null
let todayCompletionOpen = false
let todayMode: 'choose' | 'training' | 'recovery' = 'choose'
let systemInfoOpen = false
let xpChartRange: 7 | 14 | 30 | 90 = 14
let selectedXpDate: string | null = null
const XP_RANGES = [7, 14, 30, 90] as const
async function loadQuote() {
  quoteLoading = true
  render()
  const activeTags = selectedTags.length ? selectedTags : ['motivational', 'inspirational']
  const wantsAuthor = activeTags.includes('famous-writers')
  const promptTags = activeTags.join('|')
  try {
    // The APK bundles static files locally, so VITE_API_BASE_URL must point at the deployed proxy.
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
    const response = await fetch(`${apiBase}/api/quote?tags=${encodeURIComponent(promptTags)}&attributed=${wantsAuthor}`)
    const data = await response.json().catch(() => null) as { text?: string; error?: string } | null
    if (!response.ok) throw new Error(data?.error ?? 'Quote service is unavailable. Please try again.')
    if (!data?.text) throw new Error(data?.error ?? 'Quote service returned an empty response. Please try again.')
    setCurrentQuote(data.text)
  } catch (error) {
    console.error('Quote request failed', error)
  } finally {
    quoteLoading = false
    render()
  }
}

function exerciseMotionClass(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
  if (/\b(run|running|jog|jogging)\b/.test(normalized)) return 'motion-run'
  if (/\b(push ?ups?|pushups?)\b/.test(normalized)) return 'motion-pushup'
  if (/\b(squats?|sit ?squats?)\b/.test(normalized)) return 'motion-squat'
  if (/\b(planks?|mountain climbers?)\b/.test(normalized)) return 'motion-plank'
  if (/\b(sit ?ups?|crunches?)\b/.test(normalized)) return 'motion-situp'
  if (/\b(jumping jacks?|star jumps?)\b/.test(normalized)) return 'motion-jumping-jack'
  if (/\b(lunges?|split squats?)\b/.test(normalized)) return 'motion-lunge'
  if (/\bburpees?\b/.test(normalized)) return 'motion-burpee'
  return 'motion-generic'
}

function exerciseFigureMarkup(motion: string) {
  const figures: Record<string, string> = {
    'motion-run': '<g class="run-bounce"><circle class="art-head" cx="36" cy="10" r="5"/><path class="art-body" d="M34 18 29 32"/><g class="run-arm run-arm-a"><path d="M33 20 25 28 21 23"/></g><g class="run-arm run-arm-b"><path d="M33 20 40 25 44 20"/></g><g class="run-leg run-leg-a"><path d="M29 32 21 41"/><g class="run-shin run-shin-a"><path d="M21 41 18 52"/></g></g><g class="run-leg run-leg-b"><path d="M29 32 39 39"/><g class="run-shin run-shin-b"><path d="M39 39 46 48"/></g></g></g>',
    'motion-pushup': '<g class="pushup-body"><circle class="art-head" cx="13" cy="18" r="5"/><path class="art-body" d="M19 21 46 27 62 29"/><path d="M45 27 54 31 65 31"/></g><g class="pushup-arm pushup-arm-a"><path d="M25 22 20 32 18 42"/></g><g class="pushup-arm pushup-arm-b"><path d="M29 24 26 34 25 42"/></g>',
    'motion-squat': '<circle class="art-head" cx="32" cy="9" r="5"/><path class="squat-body art-body" d="M32 17 32 32"/><path d="M31 20 21 29M33 20 43 29"/><g class="squat-leg squat-leg-a"><path d="M32 32 23 40 20 53"/></g><g class="squat-leg squat-leg-b"><path d="M32 32 41 40 44 53"/></g>',
    'motion-plank': '<circle class="art-head" cx="12" cy="24" r="5"/><path class="art-body" d="M18 26 44 29 58 29"/><path d="M25 27 20 36 18 43M46 29 53 35 60 36"/>',
    'motion-situp': '<circle class="art-head" cx="19" cy="16" r="5"/><path class="situp-body art-body" d="M24 20 34 31 49 34"/><path d="M31 28 24 38M34 31 41 38M49 34 55 45 63 47M49 34 54 43 62 43"/>',
    'motion-jumping-jack': '<circle class="art-head" cx="32" cy="9" r="5"/><path class="art-body" d="M32 17 32 34"/><g class="jack-arm jack-arm-a"><path d="M30 20 20 12 13 8"/></g><g class="jack-arm jack-arm-b"><path d="M34 20 44 12 51 8"/></g><g class="jack-leg jack-leg-a"><path d="M32 34 23 44 16 53"/></g><g class="jack-leg jack-leg-b"><path d="M32 34 41 44 48 53"/></g>',
    'motion-lunge': '<circle class="art-head" cx="32" cy="9" r="5"/><path class="art-body" d="M32 17 32 33"/><path d="M30 21 21 29M34 21 43 29"/><g class="lunge-leg lunge-leg-a"><path d="M32 33 23 40 20 53"/></g><g class="lunge-leg lunge-leg-b"><path d="M32 33 42 40 46 52"/></g>',
    'motion-burpee': '<circle class="art-head" cx="32" cy="9" r="5"/><path class="burpee-body art-body" d="M32 17 32 33"/><g class="burpee-arm"><path d="M30 21 21 29 17 35M34 21 43 29 47 35"/></g><g class="burpee-leg"><path d="M32 33 24 42 20 53M32 33 40 42 44 53"/></g>',
  }
  return figures[motion] ?? '<circle class="art-head" cx="32" cy="10" r="5"/><path class="art-body" d="M32 18 32 34M30 21 22 29M34 21 42 29M32 34 25 51M32 34 39 51"/>'
}

function exerciseVisual(kind: string, label: string, exerciseName: string) {
  const motion = exerciseMotionClass(exerciseName)
  const viewBox = motion === 'motion-run' ? '4 0 48 56' : '0 0 64 64'
  return `<div class="exercise-tile ${kind} ${motion}"><svg class="exercise-art" viewBox="${viewBox}" aria-hidden="true" focusable="false">${exerciseFigureMarkup(motion)}</svg><span class="exercise-label">${label}</span></div>`
}

function renderQuotePanel() {
  let quoteMarkup = ''
  if (quoteLoading) quoteMarkup = '<p class="quote">Loading today’s quote…</p>'
  if (!quoteLoading && currentQuote) quoteMarkup = `<p class="quote">“${escapeHtml(currentQuote)}”</p>`
  return `
    <section class="hero-panel today-quote-panel">
      ${quoteMarkup}
      <details class="tag-dropdown" id="quote-tags" ${tagDropdownOpen ? 'open' : ''}><summary>Quote topics · ${selectedTags.length} selected</summary><div class="tag-options">${TAG_OPTIONS.map((tag) => `<label class="tag-option"><input type="checkbox" data-tag="${tag.id}" ${selectedTags.includes(tag.id) ? 'checked' : ''}> ${tag.label}</label>`).join('')}</div></details>
      <div class="quote-actions">
        <button class="small-button generate-quote-button" id="generate-quote" ${quoteLoading ? 'disabled' : ''}>${quoteLoading ? 'GENERATING…' : 'GENERATE QUOTE'} <span>↻</span></button>
        <button class="small-button custom-quote-button" id="add-custom-quote" type="button">ADD OWN QUOTE</button>
      </div>
      ${customQuoteFormOpen ? `<div class="custom-quote-form" id="custom-quote-form"><textarea id="custom-quote-text" maxlength="240" placeholder="Write your own quote" aria-label="Your own quote"></textarea><div class="custom-quote-actions"><button class="small-button secondary-button" id="cancel-custom-quote" type="button">CANCEL</button><button class="small-button" id="save-custom-quote" type="button">SAVE QUOTE</button></div></div>` : ''}
    </section>`
}

function renderCurrentQuote() {
  return currentQuote ? `<p class="today-current-quote">“${escapeHtml(currentQuote)}”</p>` : ''
}

function renderHomeTab(level: ReturnType<typeof current>) {
  const progress = getLevelProgress()
  const progressWidth = `${Math.max(0, Math.min(progress.percent, 100))}%`
  const nextRank = levels[Math.min(state.currentLevel, levels.length - 1)]
  const nextThreshold = XP_CONFIG.levelThresholds[Math.min(state.currentLevel, XP_CONFIG.levelThresholds.length - 1)]
  const xpToNext = Math.max(nextThreshold - state.xp, 0)
  const objectiveText = state.currentLevel < levels.length
    ? `${xpToNext} XP to ${nextRank.name}`
    : 'National Level reached'
  const battleFeed = [
    `Training days: ${state.completed} total`,
    `Quest board: ${challenges().length} missions loaded`,
    `Next target: ${objectiveText}`,
    `Shadow mode: ${state.challengeDone ? 'quest complete' : 'ready for battle'}`,
  ]
  const xpRules = `
    <div class="xp-rule"><span>Push-ups : </span><strong>+${XP_CONFIG.exercise.push} XP / rep</strong></div>
    <div class="xp-rule"><span>Run : </span><strong>+${XP_CONFIG.exercise.run} XP / km</strong></div>
    <div class="xp-rule"><span>Custom exercise : </span><strong>+${XP_CONFIG.exercise.custom} XP / unit</strong></div>
    <div class="xp-rule"><span>Training attendance : </span><strong>+${XP_CONFIG.exercise.trainingAttendanceBonus} XP</strong></div>
    <div class="xp-rule"><span>Recovery attendance : </span><strong>+${XP_CONFIG.exercise.recoveryAttendanceBonus} XP</strong></div>
    <div class="xp-rule xp-rule-penalty"><span>Missed day : </span><strong>-${XP_CONFIG.exercise.missPenalty} XP</strong></div>`
  return `
    <section class="hero-panel">
      <div class="hero-glow hero-glow-a"></div>
      <div class="hero-glow hero-glow-b"></div>
      <div class="dungeon-scene" aria-hidden="true"><span class="portal-ring"></span><span class="hunter-silhouette"><i></i><i></i></span><span class="shadow-particle particle-one"></span><span class="shadow-particle particle-two"></span><span class="shadow-particle particle-three"></span></div>
      <div class="eyebrow"><span class="line"></span> REAL-LIFE TRAINING ARC <span class="line"></span></div>
      <div class="hero-content">
        <div class="hero-details">
          <div class="hero-copy">
            <div>
              <p class="muted">CURRENT RANK</p>
              <h1>Level ${String(state.currentLevel).padStart(2, '0')}</h1>
              <p class="rank-name">${level.name}</p>
            </div>
            <div class="hero-rank-visual">
              <video class="app-video hero-rank-video" autoplay muted loop playsinline preload="auto" aria-label="Cultural mountain town video">
                <source src="${mountainTownVideo}" type="video/mp4">
              </video>
            </div>
          </div>
          <div class="xp-row"><span>SELF-PACED</span></div>
          <div class="xp-track"><span class="open-progress" style="width: ${progressWidth};"></span></div>
          <div class="xp-progress-meta"><span>${state.xp} XP</span><span>${progress.currentProgress} / ${progress.totalProgress} to next</span></div>
          <div class="xp-rules">${xpRules}</div>
        </div>
      </div>
    </section>
    ${renderDayCountSummary('home-day-counts')}

    <!-- <section class="raid-board">
      <div class="section-heading compact raid-heading">
        <div><p class="kicker">COMMAND FEED</p><h2>Battle status</h2></div>
      </div>
      <div class="battle-feed">
        ${battleFeed.map((entry) => `<div class="feed-item"><span class="feed-dot"></span><p>${entry}</p></div>`).join('')}
      </div>
    </section> -->`
}

function renderProgressTab(ladderRows: string) {
  return `
    <section class="progress-layout">
      <div class="progress-details">
        <section class="section-heading"><div><p class="kicker">YOUR PROGRESSION</p><h2>Rank path</h2></div><span class="muted">${state.currentLevel} / ${levels.length}</span></section>
        ${renderDayCountSummary('progress-day-counts')}
        <section class="ladder">${ladderRows}</section>
      </div>
      <div class="progress-rank-visual">
        <video class="app-video progress-rank-video" autoplay muted loop playsinline preload="auto" aria-label="Pattern storage video">
          <source src="${patternStorageVideo}" type="video/mp4">
        </video>
      </div>
    </section>`
}

function renderTodayTab(log: Record<string, number>, todayLabel: string) {
  const attendanceForToday = state.attendanceDates[todayKey()]
  if (attendanceForToday) todayMode = attendanceForToday
  const hasLoggedTrainingToday = Object.values(log).some((quantity) => quantity > 0)
  const changeDayTypeButton = attendanceForToday
    ? '<button class="small-button change-day-mode" type="button" disabled>CHANGE DAY TYPE</button>'
    : '<button class="small-button change-day-mode" id="change-today-mode" type="button">CHANGE DAY TYPE</button>'
  const exerciseList = exercises().map((exercise) => {
    const isCustom = !baseExercises.some((baseExercise) => baseExercise.id === exercise.id)
    const loggedQuantity = log[exercise.id]
    const isLoggedToday = loggedQuantity !== undefined
    const exerciseDetail = isLoggedToday
      ? `<small><span>All-time total: ${state.exerciseTotals[exercise.id] ?? 0}</span><span>Logged today: ${loggedQuantity}</span><span>Available tomorrow</span></small>`
      : `<small><span>All-time total: ${state.exerciseTotals[exercise.id] ?? 0}</span><span>${getExerciseXpLabel(exercise.id)}</span></small>`
    const deleteButton = isCustom
      ? `<button class="small-button delete-custom-exercise" data-exercise="${exercise.id}" type="button">DELETE</button>`
      : ''

    return `
      <div class="log-item ${isLoggedToday ? 'logged-today' : ''}">
        <div class="log-summary">
          <span class="check-figure ${exercise.icon}">${exerciseVisual(exercise.icon, '', exercise.label)}</span>
          <span class="check-copy"><b>${exercise.label}</b>${exerciseDetail}</span>
        </div>
        <div class="log-actions">
          <input class="quantity-input" data-quantity="${exercise.id}" type="number" min="0" value="${isLoggedToday ? loggedQuantity : ''}" placeholder="0" aria-label="${exercise.label} count" ${isLoggedToday || !attendanceForToday ? 'disabled' : ''}>
          <button class="small-button add-exercise" data-exercise="${exercise.id}" type="button" ${isLoggedToday || !attendanceForToday ? 'disabled' : ''}>${isLoggedToday ? 'LOGGED' : 'ADD'}</button>
          ${deleteButton}
        </div>
      </div>
    `
  }).join('')

  const customFormMarkup = customExerciseFormOpen ? `
    <div class="custom-exercise-form" id="custom-exercise-form">
      <input id="custom-exercise-name" type="text" maxlength="30" placeholder="Exercise name" aria-label="Custom exercise name">
      <div class="custom-exercise-rate">
        <input id="custom-exercise-xp" type="number" min="0.1" step="0.1" value="0.1" placeholder="XP" aria-label="XP earned per unit">
        <span>XP per</span>
        <input id="custom-exercise-unit" type="text" maxlength="12" value="unit" placeholder="unit" aria-label="Exercise unit label">
      </div>
      <div class="custom-exercise-actions">
        <button class="small-button secondary-button" id="cancel-custom-exercise" type="button">CANCEL</button>
        <button class="small-button" id="save-custom-exercise" type="button">SAVE</button>
      </div>
    </div>` : ''

  if (todayCompletionOpen) {
    const isRecoveryDay = todayMode === 'recovery'
    return `
      <section class="today-completion">
        <p class="kicker">${isRecoveryDay ? 'RECOVERY COMPLETE' : 'TARGET CLEARED'}</p>
        <h2>${isRecoveryDay ? 'You made space to reset.' : "Today's target achieved."}</h2>
        <p class="today-completion-quote">${isRecoveryDay ? 'REST IS PART OF THE TRAINING ARC.' : "ARISE. TODAY'S QUEST IS COMPLETE."}</p>
        <div class="today-completion-visual">
          <video class="app-video" autoplay muted loop playsinline preload="auto" aria-label="Travel packing inspiration video">
            <source src="${travelPackingVideo}" type="video/mp4">
          </video>
        </div>
        <button class="small-button" id="return-to-today-log" type="button">${isRecoveryDay ? 'BACK TO RECOVERY DAY' : "BACK TO TODAY'S LOG"}</button>
      </section>`
  }

  if (todayMode === 'choose') {
    return `
      ${renderQuotePanel()}
      <section class="today-mode-picker" aria-label="Choose today's plan">
        <div class="today-mode-options">
          <button class="today-mode-option training-option" data-today-mode="training" type="button"><b>TRAINING DAY</b><span>Run, push-ups, and your exercise log</span></button>
          <button class="today-mode-option recovery-option" data-today-mode="recovery" type="button"><b>RECOVERY DAY</b><span>Easy movement, a view, and a reset</span></button>
        </div>
      </section>`
  }

  const selectedDayMode: DayMode = todayMode === 'recovery' ? 'recovery' : 'training'
  const attendanceActionLabel = selectedDayMode === 'training' ? 'START TRAINING' : 'START RECOVERY'
  const attendanceRecordedLabel = attendanceForToday === 'training' ? 'TRAINING STARTED' : 'RECOVERY STARTED'
  const attendanceButtonMarkup = attendanceForToday
    ? `<button class="small-button attendance-button" type="button" disabled>${attendanceRecordedLabel} · +${getAttendanceCredit(attendanceForToday)} XP</button>`
    : `<button class="small-button attendance-button" id="record-attendance" type="button">${attendanceActionLabel} · +${getAttendanceCredit(selectedDayMode)} XP</button>`
  const canCompleteToday = Boolean(attendanceForToday) && (todayMode === 'recovery' || hasLoggedTrainingToday)
  const completeTodayButton = `<button class="small-button complete-day-button" id="complete-today" type="button" ${canCompleteToday ? '' : 'disabled'}>COMPLETED TODAY'S TARGET</button>`

  if (todayMode === 'recovery') {
    return `
      ${renderCurrentQuote()}
      <section class="today-mode-layout">
        <div class="today-log-details">
          <div class="today-mode-toolbar"><p class="kicker">RECOVERY DAY</p><div class="today-mode-actions">${attendanceButtonMarkup}${changeDayTypeButton}</div></div>
          <section class="section-heading"><div><p class="kicker">MOVE GENTLY</p><h2>A lighter day, your pace.</h2></div></section>
          <section class="mission-card recovery-card">
            <p class="recovery-intro">No workout target today. Give your body room to recover and enjoy moving without pressure.</p>
            <div class="recovery-guidance">
              <div><b>Easy walk</b><span>Take a relaxed walk and enjoy the view.</span></div>
              <div><b>Gentle movement</b><span>Stretch or move in a way that feels comfortable.</span></div>
              <div><b>Mental reset</b><span>Pause, breathe, and get ready for your next session.</span></div>
            </div>
          </section>
          ${completeTodayButton}
        </div>
      </section>`
  }

  return `
    ${renderCurrentQuote()}
    <section class="today-mode-layout today-training-layout">
      <div class="today-log-details">
        <div class="today-mode-toolbar"><p class="kicker">TRAINING DAY</p><div class="today-mode-actions">${attendanceButtonMarkup}${changeDayTypeButton}</div></div>
        <section class="section-heading"><div><p class="kicker">${todayLabel.toUpperCase()}</p><h2>Log your training</h2></div><span class="day-chip">${Object.keys(log).length} EXERCISES</span></section>
      </div>
      <div class="today-training-content">
        <div class="today-training-background" aria-hidden="true">
          <video class="app-video" autoplay muted loop playsinline preload="auto">
            <source src="${oldMoneyOutfitVideo}" type="video/mp4">
          </video>
        </div>
        <section class="mission-card"><div class="checklist">${exerciseList}${customFormMarkup}</div></section>
      </div>
      <div class="today-training-actions">
        <button class="small-button add-custom-exercise" id="add-custom-exercise" type="button" ${attendanceForToday ? '' : 'disabled'}>ADD EXERCISE</button>
        ${completeTodayButton}
      </div>
    </section>
    `
}

function renderChallengesTab() {
  const challengeList = challenges()
  const challenge = challengeList[selectedChallengeIndex] ?? challengeList[0]
  const editingChallenge = editingChallengeIndex === null ? null : challengeList[editingChallengeIndex]
  const segmentDegrees = 360 / challengeList.length
  const wheelLabels = challengeList.map((item, index) => {
    const labelAngle = index * segmentDegrees
    const radians = (labelAngle - 90) * (Math.PI / 180)
    const labelX = 50 + Math.cos(radians) * 34
    const labelY = 50 + Math.sin(radians) * 34
    return `<span class="wheel-label" style="--label-x: ${labelX}%; --label-y: ${labelY}%;">${escapeHtml(item.name)}</span>`
  }).join('')
  const saveChallengeLabel = editingChallenge ? 'SAVE CHANGES' : 'SAVE CHALLENGE'
  const customFormMarkup = customChallengeFormOpen ? `
    <div class="custom-challenge-form" id="custom-challenge-form">
      <input id="custom-challenge-name" type="text" maxlength="30" value="${escapeHtml(editingChallenge?.name ?? '')}" placeholder="Challenge name" aria-label="Custom challenge name">
      <textarea id="custom-challenge-detail" maxlength="180" placeholder="Workout details" aria-label="Custom challenge details">${escapeHtml(editingChallenge?.detail ?? '')}</textarea>
      <input id="custom-challenge-xp" type="number" min="1" max="100" value="${editingChallenge?.reward ?? 5}" aria-label="Custom challenge XP reward">
      <div class="custom-exercise-actions">
        <button class="small-button secondary-button" id="cancel-custom-challenge" type="button">CANCEL</button>
        <button class="small-button" id="save-custom-challenge" type="button">${saveChallengeLabel}</button>
      </div>
    </div>` : ''
  const challengeOptions = (target: string) => challengeList.map((item) => `<button class="challenge-search-option" data-challenge-search="${target}" data-challenge-name="${escapeHtml(item.name)}" type="button">${escapeHtml(item.name)}</button>`).join('')
  const challengeManagementMarkup = customChallengeFormOpen ? '' : `
    <div class="challenge-management">
      <div class="challenge-management-row"><div class="challenge-search"><label for="edit-challenge-search">EDIT CHALLENGE</label><input id="edit-challenge-search" type="search" placeholder="Type to search"><div class="challenge-search-options">${challengeOptions('edit')}</div></div><button class="small-button" id="edit-challenge" type="button">EDIT</button></div>
      <div class="challenge-management-row"><div class="challenge-search"><label for="delete-challenge-search">DELETE CHALLENGE</label><input id="delete-challenge-search" type="search" placeholder="Type to search"><div class="challenge-search-options">${challengeOptions('delete')}</div></div><button class="small-button delete-custom-challenge" id="delete-challenge" type="button">DELETE</button></div>
    </div>`
  return `
    <section class="section-heading"><div><p class="kicker">DAILY CHALLENGE</p><h2>Spin for your quest</h2></div><span class="mission-count">+ XP</span></section>
    <section class="challenge-wheel-panel"><div class="wheel-pointer" aria-hidden="true"></div><div class="challenge-wheel ${challengeSpinning ? 'is-spinning' : ''}" style="--wheel-rotation: ${challengeWheelRotation}deg; --segment-size: ${segmentDegrees}deg;">${wheelLabels}<span class="wheel-hub">SPIN</span></div><button class="spin-button" id="spin-challenge" type="button" ${challengeSpinning ? 'disabled' : ''}>${challengeSpinning ? 'SPINNING...' : 'SPIN THE WHEEL'}</button></section>
    <section class="challenge-result ${challenge.className}"><p class="kicker">YOUR CHALLENGE</p><h3>${escapeHtml(challenge.name)}</h3><p>${escapeHtml(challenge.detail)}</p><div class="challenge-footer"><span>REWARD <b>+${challenge.reward} XP</b></span><button class="small-button" id="challenge-button" type="button" ${state.challengeDone ? 'disabled' : ''}>${state.challengeDone ? 'COMPLETED' : 'COMPLETE'} <span>↗</span></button></div>${customFormMarkup}<button class="small-button add-custom-challenge" id="add-custom-challenge" type="button">ADD CHALLENGE</button>${challengeManagementMarkup}</section>`
}

const formatXp = (value: number) => `${Math.round(value * 10) / 10}`
const renderXpChart = () => {
  const days = Array.from({ length: xpChartRange }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (xpChartRange - 1 - index))
    const dateKey = localDateKey(date)
    return { date, dateKey, xp: state.xpHistory[dateKey] ?? 0 }
  })
  const values = days.map((day) => day.xp)
  const activeDays = values.filter((value) => value > 0).length
  const best = Math.max(...values, 0)
  const selectedKey = days.some((day) => day.dateKey === selectedXpDate) ? selectedXpDate! : days[days.length - 1].dateKey

  const niceCeil = (value: number) => {
    const magnitude = 10 ** Math.floor(Math.log10(value))
    return ([1, 2, 5, 10].find((step) => step * magnitude >= value) ?? 10) * magnitude
  }
  const yMax = niceCeil(Math.max(best, 1))
  const yMin = Math.min(...values) < 0 ? -niceCeil(Math.abs(Math.min(...values))) : 0
  const width = 320
  const height = 150
  const plot = { left: 8, right: 52, top: 12, bottom: 26 }
  const plotWidth = width - plot.left - plot.right
  const plotHeight = height - plot.top - plot.bottom
  const xAt = (index: number) => plot.left + (days.length === 1 ? plotWidth / 2 : (index / (days.length - 1)) * plotWidth)
  const yAt = (value: number) => plot.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight
  const points = days.map((day, index) => ({ x: xAt(index), y: yAt(day.xp), xp: day.xp }))
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const baseline = yAt(0)
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)} ${baseline.toFixed(1)} L${points[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`
  const gridValues = yMin < 0 ? [yMax, 0, yMin] : [yMax, yMax / 2, 0]
  const grid = gridValues.map((value) => `<line class="xp-grid" x1="${plot.left}" x2="${plot.left + plotWidth}" y1="${yAt(value).toFixed(1)}" y2="${yAt(value).toFixed(1)}"/><text class="xp-axis-label" x="${plot.left + plotWidth + 8}" y="${(yAt(value) + 3).toFixed(1)}">${formatXp(value)} XP</text>`).join('')
  const labelIndexes = [0, Math.floor((days.length - 1) / 2), days.length - 1]
  const dateLabels = labelIndexes.map((index, position) => `<text class="xp-date-label" x="${xAt(index).toFixed(1)}" y="${height - 6}" text-anchor="${position === 0 ? 'start' : position === 2 ? 'end' : 'middle'}">${days[index].date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</text>`).join('')
  const dots = points.map((point, index) => `<circle class="xp-dot ${days[index].dateKey === selectedKey ? 'is-selected' : ''}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${days[index].dateKey === selectedKey ? 4.5 : days.length > 30 ? 1.4 : 2.5}"/>`).join('')
  const selectedIndex = days.findIndex((day) => day.dateKey === selectedKey)
  const guide = `<line class="xp-guide" x1="${points[selectedIndex].x.toFixed(1)}" x2="${points[selectedIndex].x.toFixed(1)}" y1="${plot.top}" y2="${plot.top + plotHeight}"/>`
  const columnWidth = days.length === 1 ? plotWidth : plotWidth / (days.length - 1)
  const hitColumns = points.map((point, index) => `<rect class="xp-hit" data-xp-date="${days[index].dateKey}" x="${(point.x - columnWidth / 2).toFixed(1)}" y="${plot.top}" width="${columnWidth.toFixed(1)}" height="${plotHeight}"><title>${days[index].date.toLocaleDateString()}: ${point.xp > 0 ? '+' : ''}${formatXp(point.xp)} XP</title></rect>`).join('')
  const rangeButtons = XP_RANGES.map((range) => `<button class="xp-range-button ${range === xpChartRange ? 'active' : ''}" data-xp-range="${range}" type="button" aria-pressed="${range === xpChartRange}">${range === 90 ? '3M' : `${range}D`}</button>`).join('')
  const hasData = values.some((value) => value !== 0)
  const sourceLabel = (source: string) => {
    if (source === 'attendance:training') return 'Training check-in'
    if (source === 'attendance:recovery') return 'Recovery check-in'
    if (source === 'attendance') return state.attendanceDates[selectedKey] === 'recovery' ? 'Recovery check-in' : 'Training check-in'
    if (source === 'penalty') return 'Missed day penalty'
    if (source.startsWith('exercise:')) {
      const id = source.slice('exercise:'.length)
      return exercises().find((exercise) => exercise.id === id)?.label ?? id
    }
    if (source.startsWith('challenge:')) return `Challenge · ${source.slice('challenge:'.length)}`
    return source
  }
  const sourceDetail = (source: string) => {
    if (!source.startsWith('exercise:')) return ''
    const id = source.slice('exercise:'.length)
    const count = state.dailyLogs[selectedKey]?.[id]
    if (count === undefined) return ''
    const unit = id === 'run' ? 'km' : id === 'push' ? 'reps' : (state.customExercises.find((exercise) => exercise.id === id)?.unitLabel ?? 'unit')
    return `${count} ${unit}`
  }
  const selectedDay = days[selectedIndex]
  const sourceRows: { label: string; amount: number; detail?: string }[] = Object.entries(state.xpBreakdown[selectedKey] ?? {}).filter(([, amount]) => amount !== 0).map(([source, amount]) => ({ label: sourceLabel(source), amount, detail: sourceDetail(source) }))
  const unexplained = roundXp(selectedDay.xp - sourceRows.reduce((sum, row) => sum + row.amount, 0))
  if (unexplained !== 0) sourceRows.push({ label: 'Other activity', amount: unexplained })
  const signed = (value: number) => `${value > 0 ? '+' : ''}${formatXp(value)} XP`
  const dayDetail = `<div class="xp-day-detail" aria-live="polite"><div class="xp-day-head"><span>${selectedDay.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span><strong class="${selectedDay.xp < 0 ? 'is-negative' : ''}">${signed(selectedDay.xp)}</strong></div>${sourceRows.length ? `<ul class="xp-day-sources">${sourceRows.map((row) => `<li><span>${escapeHtml(row.label)}</span>${row.detail ? `<em>${escapeHtml(row.detail)}</em>` : ''}<b class="${row.amount < 0 ? 'is-negative' : ''}">${signed(row.amount)}</b></li>`).join('')}</ul>` : '<p class="xp-day-empty">No XP recorded this day.</p>'}</div>`
  return `<section class="xp-chart-card" aria-label="Daily XP chart">
    <div class="xp-chart-heading"><p class="kicker">DAILY XP</p><div class="xp-range">${rangeButtons}</div></div>
    <div class="xp-chart-stats"><div class="xp-active-days"><span>Active days</span><strong>${activeDays}/${days.length}</strong></div></div>
    <svg class="xp-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="XP earned each day over the last ${days.length} days. Select a day for details."><defs><linearGradient id="xp-area-fill" x1="0" y1="0" x2="0" y2="1"><stop class="xp-fill-top" offset="0"/><stop class="xp-fill-bottom" offset="1"/></linearGradient></defs>${grid}<path class="xp-area" d="${areaPath}"/>${guide}<path class="xp-line" d="${linePath}"/>${dots}${dateLabels}${hitColumns}</svg>
    ${hasData ? '' : '<p class="xp-chart-empty">Log a workout or start a day to see your XP trend.</p>'}
    ${dayDetail}
  </section>`
}

function renderProfileTab(level: ReturnType<typeof current>) {
  const progress = getLevelProgress()
  const stats = hunterStats()
  const dayCounts = getDayCounts()
  const accountCard = `<section class="mission-card account-card"><div class="profile-stat"><span>Cloud backup</span><b id="sync-status" data-state="${syncStatus}">${syncStatusText[syncStatus]}</b></div><div class="account-actions"><button class="small-button account-signout" id="sign-out" type="button">SIGN OUT</button><button class="reset-button" id="reset-progress" type="button">RESET LOCAL PROGRESS</button></div></section>`
  const badgeList = [
    { label: 'Hunter title', value: hunterTitle() },
    { label: 'Total plan days', value: `${dayCounts.total} ${dayCounts.total === 1 ? 'day' : 'days'}` },
    { label: 'Power level', value: `${state.xp} XP` },
    { label: 'Next rank', value: level.name },
  ]
  return `
    <section class="section-heading"><div><p class="kicker">PLAYER PROFILE</p><h2>Hunter status</h2></div></section>
    <section class="mission-card profile-hero">
      <div class="profile-details">
        <div class="profile-hero-main">
          <div class="avatar-ring">${String(state.currentLevel).padStart(2, '0')}</div>
          <div>
            <p class="muted">RANK</p>
            <h3>Level ${String(state.currentLevel).padStart(2, '0')}</h3>
            <p class="profile-rank-name">${level.name}</p>
          </div>
        </div>
        <div class="profile-progress-wrap">
          <div class="profile-progress-meta"><span>Progress to next tier</span><strong>${progress.currentProgress}/${progress.totalProgress}</strong></div>
          <div class="xp-track"><span class="open-progress" style="width: ${Math.min(progress.percent, 100)}%;"></span></div>
        </div>
      </div>
      <div class="profile-rank-visual">
        <video class="app-video profile-rank-video" autoplay muted loop playsinline preload="auto" aria-label="Summer outfit inspiration video">
          <source src="${summerOutfitVideo}" type="video/mp4">
        </video>
      </div>
    </section>
    <section class="achievement-grid">
      ${badgeList.map((badge) => `
        <article class="achievement-card">
          <span>${badge.label}</span>
          <strong>${badge.value}</strong>
        </article>
      `).join('')}
    </section>
    ${renderDayCountSummary('profile-day-counts')}
    ${renderXpChart()}
    <section class="system-stats" aria-label="Hunter stats">
      <div class="system-stats-heading"><p class="kicker">SYSTEM STATUS</p><div class="system-stats-live"><span>LIVE VALUES</span><button class="system-info-button" id="system-stats-info" type="button" aria-label="How Hunter stats are calculated" aria-expanded="${systemInfoOpen}">i</button></div></div>
      ${systemInfoOpen ? `<div class="system-stats-info" id="system-stats-explanation"><p>Values are calculated from your saved training activity.</p><ul><li><b>STR</b> = total push-ups / 10</li><li><b>VIT</b> = completed workout days</li><li><b>AGI</b> = total run distance in km</li><li><b>END</b> = attended workout or recovery days</li><li><b>DEX</b> = custom exercises created</li></ul></div>` : ''}
      <div class="system-stats-grid">
        ${stats.map((stat) => `<div class="system-stat"><b>${stat.label}</b><strong>${stat.value}</strong><span>${stat.detail}</span></div>`).join('')}
      </div>
    </section>
    ${accountCard}`
}

function wirePasswordVisibility() {
  document.querySelectorAll<HTMLButtonElement>('.password-visibility').forEach((button) => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordTarget ?? '') as HTMLInputElement | null
    if (!input) return
    const showValue = input.type === 'password'
    input.type = showValue ? 'text' : 'password'
    button.classList.toggle('is-visible', showValue)
    button.setAttribute('aria-pressed', String(showValue))
    const description = button.dataset.visibilityLabel ?? 'value'
    button.setAttribute('aria-label', `${showValue ? 'Hide' : 'Show'} ${description}`)
    button.title = `${showValue ? 'Hide' : 'Show'} ${description}`
  }))
}

function renderCloudSetupGate() {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `<div class="app-shell auth-shell"><main class="auth-main"><div class="auth-scene" aria-hidden="true"><video class="app-video auth-background-video" autoplay muted loop playsinline preload="auto"><source src="${authBackgroundVideo}" type="video/mp4"></video><span class="auth-video-overlay"></span><span class="auth-portal"></span><span class="auth-shadow"><i></i><i></i></span><span class="auth-particle auth-particle-a"></span><span class="auth-particle auth-particle-b"></span><span class="auth-particle auth-particle-c"></span><span class="auth-floor"></span></div><div class="brand-mark"><span class="brand-orbit"></span><span>LEVEL<br><b>UP</b></span></div><section class="auth-card"><p class="kicker">CLOUD REQUIRED</p><h2>Cloud sync is not configured</h2><p class="auth-hint">This app requires a Firebase account to store your progress. Add all four Firebase web app values to <code>.env</code>, then restart the dev server or rebuild the Android app.</p></section></main></div>`
  const backgroundVideo = document.querySelector<HTMLVideoElement>('.auth-background-video')
  const revealBackground = () => backgroundVideo?.classList.add('is-ready')
  backgroundVideo?.addEventListener('canplay', revealBackground, { once: true })
  if (backgroundVideo && backgroundVideo.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) revealBackground()
}

function render() {
  if (!cloudEnabled) { renderCloudSetupGate(); return }
  if (cloudEnabled && (!authReady || !currentUser || awaitingFirstSync)) { renderAuthGate(); return }
  const level = current()
  const log = todayLog()
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const ladderRows = levels.map((item, index) => {
    const rank = index + 1
    let status = 'LOCKED'
    if (rank < state.currentLevel) status = 'CLEARED'
    if (rank === state.currentLevel) status = 'ACTIVE'
    return `<div class="ladder-row ${rank === state.currentLevel ? 'active' : ''} ${rank < state.currentLevel ? 'cleared' : ''}"><span class="ladder-number">${item.rank}</span><span class="ladder-name">${item.name}</span><span class="ladder-meta"><span class="ladder-state">${status}</span><span class="ladder-xp">${item.xp.toLocaleString()} XP</span></span></div>`
  }).join('')

  let tabContent = ''
  if (activeTab === 'home') tabContent = renderHomeTab(level)
  if (activeTab === 'today') tabContent = renderTodayTab(log, todayLabel)
  if (activeTab === 'progress') tabContent = renderProgressTab(ladderRows)
  if (activeTab === 'missions') tabContent = renderChallengesTab()
  if (activeTab === 'profile') tabContent = renderProfileTab(level)

  const navItem = (tab: Tab, icon: string, label: string) => `<a class="${activeTab === tab ? 'active' : ''}" data-tab="${tab}" href="#${tab}"><span>${icon}</span>${label}</a>`

  const currentTrainingVideo = document.querySelector<HTMLVideoElement>('.today-training-background video')
  if (currentTrainingVideo) trainingBackgroundVideo = currentTrainingVideo

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="app-shell">
      <header class="topbar"><div class="brand-mark"><span class="brand-orbit"></span><span>LEVEL<br><b>UP</b></span></div><div class="header-status"><span class="status-dot"></span> ${todayLabel}</div><button class="icon-button" id="profile" aria-label="Open profile">◎</button></header>
      <main id="top">${tabContent}</main>
      <nav class="bottom-nav">${navItem('home', '⌂', 'HOME')}${navItem('today', '◒', "TODAY'S LOG")}${navItem('progress', '▥', 'PROGRESS')}${navItem('missions', '✦', 'CHALLENGES')}${navItem('profile', '◉', 'PROFILE')}</nav>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
      ${resetConfirmationOpen ? `<div class="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title">
        <div class="confirmation-backdrop" id="cancel-reset"></div>
        <section class="confirmation-panel">
          <p class="kicker">RESET PROGRESS</p>
          <h2 id="reset-dialog-title">${resetCodeStep === 'setup' ? 'Set a reset code' : resetCodeStep === 'verify' ? 'Enter your reset code' : 'Start over?'}</h2>
          <p>${resetCodeStep === 'setup'
            ? 'Choose a six-digit code used only to confirm that you really want to erase your progress. It is not your sign-in or account recovery code.'
            : resetCodeStep === 'verify'
              ? 'Enter your six-digit reset code to continue. Your progress will not be changed until you confirm the reset on the next screen.'
              : `This will permanently remove your XP, exercise logs, completed days, and custom exercises.${cloudEnabled ? ' It also clears your cloud backup.' : ''}`}</p>
          ${resetCodeStep === 'setup' ? `<div class="reset-code-fields"><label class="auth-field"><span>NEW SIX-DIGIT CODE</span><div class="auth-password-control"><input id="reset-code-new" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password">${renderVisibilityToggle('reset-code-new', 'reset code')}</div></label><label class="auth-field"><span>CONFIRM CODE</span><div class="auth-password-control"><input id="reset-code-confirm" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password">${renderVisibilityToggle('reset-code-confirm', 'confirmation code')}</div></label></div>` : ''}
          ${resetCodeStep === 'verify' ? `<label class="auth-field reset-code-fields"><span>RESET CODE</span><div class="auth-password-control"><input id="reset-code-entry" type="password" inputmode="numeric" maxlength="6" autocomplete="off">${renderVisibilityToggle('reset-code-entry', 'reset code')}</div></label>` : ''}
          ${resetCodeError ? `<p class="auth-message error" role="alert">${escapeHtml(resetCodeError)}</p>` : ''}
          <div class="confirmation-actions">
            <button class="small-button secondary-button" id="cancel-reset" type="button">CANCEL</button>
            ${resetCodeStep === 'setup' ? `<button class="small-button reset-confirm-button" id="save-reset-code" type="button" ${resetCodeBusy ? 'disabled' : ''}>${resetCodeBusy ? 'SAVING…' : 'SAVE CODE'}</button>` : ''}
            ${resetCodeStep === 'verify' ? `<button class="small-button reset-confirm-button" id="verify-reset-code" type="button" ${resetCodeBusy ? 'disabled' : ''}>${resetCodeBusy ? 'CHECKING…' : 'VERIFY CODE'}</button>` : ''}
            ${resetCodeStep === 'confirm' ? '<button class="small-button reset-confirm-button" id="confirm-reset" type="button">RESET PROGRESS</button>' : ''}
          </div>
        </section>
      </div>` : ''}
      ${signOutConfirmationOpen ? renderSignOutConfirmation() : ''}
      ${pendingExerciseDeletion ? `<div class="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
        <div class="confirmation-backdrop" id="cancel-exercise-delete"></div>
        <section class="confirmation-panel">
          <p class="kicker">REMOVE EXERCISE</p>
          <h2 id="delete-dialog-title">Delete ${pendingExerciseDeletion.label}?</h2>
          <p>This removes the exercise and all of its saved entries from your local progress.</p>
          <div class="confirmation-actions">
            <button class="small-button secondary-button" id="cancel-exercise-delete" type="button">CANCEL</button>
            <button class="small-button reset-confirm-button" id="confirm-exercise-delete" type="button">DELETE EXERCISE</button>
          </div>
        </section>
      </div>` : ''}
    </div>`

  const trainingVideoSlot = document.querySelector<HTMLVideoElement>('.today-training-background video')
  if (trainingVideoSlot && trainingBackgroundVideo && trainingVideoSlot !== trainingBackgroundVideo) {
    trainingVideoSlot.replaceWith(trainingBackgroundVideo)
  } else if (trainingVideoSlot) {
    trainingBackgroundVideo = trainingVideoSlot
  }
  wirePasswordVisibility()
  document.querySelectorAll<HTMLVideoElement>('video.app-video').forEach((video) => {
    const revealVideo = () => video.classList.add('is-ready')
    if (video.matches('.today-training-background video')) {
      video.onplaying = () => {
        revealVideo()
        video.closest('.today-training-background')?.classList.add('is-playing')
      }
      if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        revealVideo()
        video.closest('.today-training-background')?.classList.add('is-playing')
      }
      return
    }
    video.addEventListener('canplay', revealVideo, { once: true })
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) revealVideo()
  })
  if (activeTab === 'today' && todayMode === 'training' && trainingBackgroundVideo?.paused) {
    trainingBackgroundVideo.play().catch((error: unknown) => console.error('Training background video failed to resume', error))
  }

  const showToast = (message: string) => { const toast = document.querySelector<HTMLDivElement>('#toast'); if (!toast) { return }; toast.textContent = message; toast.classList.add('visible'); window.setTimeout(() => toast.classList.remove('visible'), 2200) }
  document.querySelectorAll<HTMLButtonElement>('.add-exercise').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.exercise
    const input = document.querySelector<HTMLInputElement>(`[data-quantity="${id}"]`)
    const quantity = Number(input?.value)
    if (!id || !Number.isFinite(quantity) || quantity <= 0) { showToast('Enter a quantity greater than zero'); return }
    const date = todayKey()
    const dayLog = state.dailyLogs[date] ?? {}
    if (dayLog[id] !== undefined) { showToast('This exercise is already logged for today'); return }
    recordTrainingDay(date)
    const enteredCount = Math.floor(quantity)
    dayLog[id] = enteredCount
    state.dailyLogs[date] = dayLog
    state.exerciseTotals[id] = (state.exerciseTotals[id] ?? 0) + enteredCount
    const xpGain = getExerciseXpGain(id) * enteredCount
    const xpText = id === 'run' ? `${enteredCount} km` : `${enteredCount} reps`
    addXp(date, xpGain, `exercise:${id}`)
    syncLevelFromXp()
    save(); render(); showToast(`${xpText} logged · +${xpGain.toFixed(1)} XP`)
  }))
  document.querySelectorAll<HTMLButtonElement>('.today-mode-option').forEach((button) => button.addEventListener('click', () => {
    const mode = button.dataset.todayMode
    if (mode !== 'training' && mode !== 'recovery') return
    todayMode = mode
    todayCompletionOpen = false
    render()
  }))
  document.querySelector('#change-today-mode')?.addEventListener('click', () => {
    if (state.attendanceDates[todayKey()]) return
    todayMode = 'choose'
    todayCompletionOpen = false
    render()
  })
  document.querySelector('#record-attendance')?.addEventListener('click', () => {
    if (todayMode === 'choose') return
    const credit = recordAttendance(todayMode)
    if (credit === null) return
    render()
    showToast(`Attendance recorded · +${credit} XP`)
  })
  document.querySelector('#complete-today')?.addEventListener('click', () => {
    todayCompletionOpen = true
    render()
  })
  document.querySelector('#return-to-today-log')?.addEventListener('click', () => {
    todayCompletionOpen = false
    render()
  })
  document.querySelector('#quote-tags')?.addEventListener('toggle', (event) => { tagDropdownOpen = (event.target as HTMLDetailsElement).open })
  document.querySelectorAll<HTMLInputElement>('.tag-options input[data-tag]').forEach((checkbox) => checkbox.addEventListener('change', () => {
    selectedTags = Array.from(document.querySelectorAll<HTMLInputElement>('.tag-options input[data-tag]:checked')).map((input) => input.dataset.tag as string)
    tagDropdownOpen = true
    saveTags()
    render()
  }))
  document.querySelector('#generate-quote')?.addEventListener('click', () => loadQuote())
  document.querySelector('#add-custom-quote')?.addEventListener('click', () => {
    customQuoteFormOpen = true
    render()
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('#custom-quote-text')?.focus())
  })
  document.querySelector('#cancel-custom-quote')?.addEventListener('click', () => {
    customQuoteFormOpen = false
    render()
  })
  document.querySelector('#save-custom-quote')?.addEventListener('click', () => {
    const quote = document.querySelector<HTMLTextAreaElement>('#custom-quote-text')?.value.trim() ?? ''
    if (!quote) {
      showToast('Write a quote first')
      return
    }
    setCurrentQuote(quote)
    customQuoteFormOpen = false
    render()
    showToast('Your quote was added')
  })
  document.querySelector('#system-stats-info')?.addEventListener('click', () => {
    systemInfoOpen = !systemInfoOpen
    render()
  })

  const customInput = document.querySelector<HTMLInputElement>('#custom-exercise-name')
  const openCustomForm = () => {
    customExerciseFormOpen = true
    render()
    requestAnimationFrame(() => {
      const nextInput = document.querySelector<HTMLInputElement>('#custom-exercise-name')
      nextInput?.focus()
    })
  }
  const closeCustomForm = () => {
    customExerciseFormOpen = false
    if (customInput) customInput.value = ''
    render()
  }

  document.querySelector('#add-custom-exercise')?.addEventListener('click', () => {
    openCustomForm()
  })

  document.querySelector('#cancel-custom-exercise')?.addEventListener('click', () => {
    closeCustomForm()
  })

  document.querySelector('#save-custom-exercise')?.addEventListener('click', () => {
    const customName = customInput?.value.trim() ?? ''
    const xpPerUnit = Number(document.querySelector<HTMLInputElement>('#custom-exercise-xp')?.value)
    const unitLabel = document.querySelector<HTMLInputElement>('#custom-exercise-unit')?.value.trim() ?? ''
    if (!customName) {
      showToast('Enter an exercise name')
      return
    }
    if (!Number.isFinite(xpPerUnit) || xpPerUnit <= 0 || !unitLabel) {
      showToast('Enter XP per unit and a unit name')
      return
    }

    const normalized = customName.toLowerCase()
    const matchesExisting = [...baseExercises, ...state.customExercises].some((exercise) => exercise.label.toLowerCase() === normalized)
    if (matchesExisting) {
      showToast('This exercise already exists')
      closeCustomForm()
      return
    }

    const customId = buildExerciseId(customName)
    state.customExercises.push({ id: customId, label: customName, xpPerUnit, unitLabel })
    state.exerciseTotals[customId] = state.exerciseTotals[customId] ?? 0
    save()
    closeCustomForm()
    showToast(`${customName} added`)
  })

  document.querySelectorAll<HTMLButtonElement>('.delete-custom-exercise').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.exercise
    if (!id) return

    const exercise = state.customExercises.find((item) => item.id === id)
    if (!exercise) return

    pendingExerciseDeletion = exercise
    render()
  }))

  const openCustomChallengeForm = () => {
    editingChallengeIndex = null
    customChallengeFormOpen = true
    render()
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#custom-challenge-name')?.focus())
  }
  document.querySelector('#add-custom-challenge')?.addEventListener('click', () => openCustomChallengeForm())
  document.querySelector('#cancel-custom-challenge')?.addEventListener('click', () => {
    customChallengeFormOpen = false
    editingChallengeIndex = null
    render()
  })
  document.querySelector('#save-custom-challenge')?.addEventListener('click', () => {
    const name = document.querySelector<HTMLInputElement>('#custom-challenge-name')?.value.trim() ?? ''
    const detail = document.querySelector<HTMLTextAreaElement>('#custom-challenge-detail')?.value.trim() ?? ''
    const reward = Number(document.querySelector<HTMLInputElement>('#custom-challenge-xp')?.value)
    if (!name || !detail || !Number.isInteger(reward) || reward < 1 || reward > 100) {
      showToast('Enter a name, workout details, and 1-100 XP')
      return
    }
    const hasDuplicateName = challenges().some((challenge, index) => {
      const isCurrentChallenge = editingChallengeIndex !== null && index === editingChallengeIndex
      return challenge.name.toLowerCase() === name.toLowerCase() && !isCurrentChallenge
    })
    if (hasDuplicateName) {
      showToast('This challenge already exists')
      return
    }
    if (editingChallengeIndex === null) {
      state.savedChallenges.push({ name, detail, reward, className: 'custom' })
    } else {
      state.savedChallenges[editingChallengeIndex] = { name, detail, reward, className: state.savedChallenges[editingChallengeIndex]?.className ?? 'custom' }
    }
    customChallengeFormOpen = false
    editingChallengeIndex = null
    save()
    render()
    showToast(`${name} saved`)
  })
  document.querySelectorAll<HTMLInputElement>('.challenge-search input').forEach((input) => {
    const search = () => {
      const query = input.value.trim().toLowerCase()
      input.closest('.challenge-search')?.classList.add('is-open')
      input.parentElement?.querySelectorAll<HTMLButtonElement>('.challenge-search-option').forEach((option) => {
        option.hidden = !option.textContent?.toLowerCase().includes(query)
      })
    }
    input.addEventListener('focus', search)
    input.addEventListener('input', search)
  })
  document.addEventListener('click', (event) => {
    const target = event.target as Node
    document.querySelectorAll<HTMLElement>('.challenge-search.is-open').forEach((search) => {
      if (!search.contains(target)) search.classList.remove('is-open')
    })
  })
  document.querySelectorAll<HTMLButtonElement>('.challenge-search-option').forEach((option) => option.addEventListener('click', () => {
    const target = option.dataset.challengeSearch
    const input = document.querySelector<HTMLInputElement>(`#${target}-challenge-search`)
    if (!input) return
    input.value = option.dataset.challengeName ?? ''
    input.closest('.challenge-search')?.classList.remove('is-open')
  }))
  const findChallengeIndex = (name: string) => challenges().findIndex((challenge) => challenge.name.toLowerCase() === name.trim().toLowerCase())
  document.querySelector('#edit-challenge')?.addEventListener('click', () => {
    const name = document.querySelector<HTMLInputElement>('#edit-challenge-search')?.value ?? ''
    const challengeIndex = findChallengeIndex(name)
    if (challengeIndex < 0) {
      showToast('Select a challenge from the list')
      return
    }
    editingChallengeIndex = challengeIndex
    customChallengeFormOpen = true
    render()
  })
  document.querySelector('#delete-challenge')?.addEventListener('click', () => {
    if (state.savedChallenges.length === 1) {
      showToast('Keep at least one challenge on the wheel')
      return
    }
    const name = document.querySelector<HTMLInputElement>('#delete-challenge-search')?.value ?? ''
    const challengeIndex = findChallengeIndex(name)
    const challenge = state.savedChallenges[challengeIndex]
    if (!challenge) {
      showToast('Select a challenge from the list')
      return
    }
    state.savedChallenges.splice(challengeIndex, 1)
    selectedChallengeIndex = 0
    state.challengeDone = false
    save()
    render()
    showToast(`${challenge.name} deleted`)
  })

  document.querySelector('#spin-challenge')?.addEventListener('click', () => {
    if (challengeSpinning) return
    challengeSpinning = true
    const challengeList = challenges()
    const randomValues = new Uint32Array(1)
    const randomIndex = crypto.getRandomValues(randomValues)[0] % challengeList.length
    const nextChallengeIndex = randomIndex
    const segmentDegrees = 360 / challengeList.length
    const targetDegrees = 360 - (nextChallengeIndex * segmentDegrees)
    const currentDegrees = challengeWheelRotation % 360
    const nextRotation = challengeWheelRotation + 2160 + targetDegrees - currentDegrees
    render()
    requestAnimationFrame(() => {
      challengeWheelRotation = nextRotation
      document.querySelector<HTMLElement>('.challenge-wheel')?.style.setProperty('--wheel-rotation', `${challengeWheelRotation}deg`)
    })
    window.setTimeout(() => {
      selectedChallengeIndex = nextChallengeIndex
      state.challengeDone = false
      challengeSpinning = false
      save()
      render()
      showToast(`${challengeList[nextChallengeIndex].name} selected`)
    }, 5000)
  })
  document.querySelector('#challenge-button')?.addEventListener('click', () => {
    if (state.challengeDone) return
    const challenge = challenges()[selectedChallengeIndex]
    recordTrainingDay(todayKey())
    state.challengeDone = true
    addXp(todayKey(), challenge.reward, `challenge:${challenge.name}`)
    syncLevelFromXp()
    save()
    render()
    showToast(`${challenge.name} completed · +${challenge.reward} XP`)
  })
  document.querySelector('#profile')?.addEventListener('click', () => { activeTab = 'profile'; render() })
  document.querySelector('#sign-out')?.addEventListener('click', () => {
    signOutConfirmationOpen = true
    render()
  })
  document.querySelectorAll<HTMLElement>('#cancel-sign-out').forEach((element) => element.addEventListener('click', () => {
    signOutConfirmationOpen = false
    render()
  }))
  document.querySelector('#confirm-sign-out')?.addEventListener('click', async () => {
    signOutConfirmationOpen = false
    const signedOut = await signOutAndClear()
    if (!signedOut) { render(); showToast('Could not save your latest changes. Check your connection and try again.') }
  })
  document.querySelectorAll<HTMLButtonElement>('.xp-range-button').forEach((button) => button.addEventListener('click', () => {
    const range = Number(button.dataset.xpRange)
    if (range !== 7 && range !== 14 && range !== 30 && range !== 90) return
    xpChartRange = range
    render()
  }))
  document.querySelectorAll<SVGRectElement>('.xp-hit').forEach((column) => column.addEventListener('click', () => {
    selectedXpDate = column.dataset.xpDate ?? null
    render()
  }))
  document.querySelector('#reset-progress')?.addEventListener('click', () => {
    resetConfirmationOpen = true
    resetCodeStep = resetCredential ? 'verify' : 'setup'
    resetCodeError = ''
    render()
  })
  document.querySelectorAll<HTMLElement>('#cancel-reset').forEach((element) => element.addEventListener('click', () => {
    resetConfirmationOpen = false
    resetCodeError = ''
    render()
  }))
  document.querySelector('#save-reset-code')?.addEventListener('click', async () => {
    const code = document.querySelector<HTMLInputElement>('#reset-code-new')?.value ?? ''
    const confirmation = document.querySelector<HTMLInputElement>('#reset-code-confirm')?.value ?? ''
    if (!/^\d{6}$/.test(code)) { resetCodeError = 'Enter a six-digit number.'; render(); return }
    if (code !== confirmation) { resetCodeError = 'The codes do not match.'; render(); return }
    resetCodeBusy = true
    resetCodeError = ''
    render()
    try {
      resetCredential = await hashResetCode(code)
      localStorage.setItem(RESET_CREDENTIAL_KEY, JSON.stringify(resetCredential))
      markDirty()
      resetCodeStep = 'confirm'
    } catch (error) {
      resetCodeError = error instanceof Error ? error.message : 'Could not save your reset code.'
    }
    resetCodeBusy = false
    render()
  })
  document.querySelector('#verify-reset-code')?.addEventListener('click', async () => {
    const code = document.querySelector<HTMLInputElement>('#reset-code-entry')?.value ?? ''
    if (!/^\d{6}$/.test(code)) { resetCodeError = 'Enter your six-digit code.'; render(); return }
    if (!resetCredential) { resetCodeStep = 'setup'; resetCodeError = ''; render(); return }
    resetCodeBusy = true
    resetCodeError = ''
    render()
    try {
      if (await verifyResetCode(code, resetCredential)) resetCodeStep = 'confirm'
      else resetCodeError = 'That code is incorrect. Try again.'
    } catch (error) {
      resetCodeError = error instanceof Error ? error.message : 'Could not verify your reset code.'
    }
    resetCodeBusy = false
    render()
  })
  document.querySelector('#confirm-reset')?.addEventListener('click', () => {
    if (resetCodeStep !== 'confirm') return
    resetConfirmationOpen = false
    resetCodeError = ''

    state = { completed: 0, challengeDone: false, xp: 0, currentLevel: 1, exerciseTotals: { push: 0, run: 0 }, dailyLogs: {}, activityDates: {}, attendanceDates: {}, xpHistory: {}, xpBreakdown: {}, customExercises: [], customChallenges: [], savedChallenges: [...baseChallenges], lastAttendanceCheckDate: undefined }
    save()
    render()
    showToast('Progress reset to Level 1')
  })
  document.querySelectorAll<HTMLElement>('#cancel-exercise-delete').forEach((element) => element.addEventListener('click', () => {
    pendingExerciseDeletion = null
    render()
  }))
  document.querySelector('#confirm-exercise-delete')?.addEventListener('click', () => {
    const exercise = pendingExerciseDeletion
    if (!exercise) return

    pendingExerciseDeletion = null
    state.customExercises = state.customExercises.filter((item) => item.id !== exercise.id)
    delete state.exerciseTotals[exercise.id]
    Object.keys(state.dailyLogs).forEach((dateKey) => {
      delete state.dailyLogs[dateKey][exercise.id]
    })
    save()
    render()
    showToast(`${exercise.label} deleted`)
  })
  document.querySelectorAll<HTMLAnchorElement>('.bottom-nav a').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault()
    const tab = link.dataset.tab as Tab
    activeTab = tab
    render()
  }))
}
const stableStringify = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
  : item)
const cloudSnapshot = () => JSON.parse(JSON.stringify({ ...state, quoteTags: selectedTags, currentQuote, resetCredential }))
const legacyQuoteFromCloud = (data: CloudRecord) => {
  if (Array.isArray(data.savedQuotes)) {
    const quotes = data.savedQuotes as { text?: string; savedAt?: number }[]
    const quote = [...quotes].sort((left, right) => (right.savedAt ?? 0) - (left.savedAt ?? 0)).find((item) => item.text)?.text
    if (quote) return quote
  }
  return Array.isArray(data.customQuotes) ? (data.customQuotes as string[]).at(-1) ?? null : null
}
const normalizeRemote = (data: CloudRecord) => JSON.parse(JSON.stringify({
  ...buildState(data),
  quoteTags: Array.isArray(data.quoteTags) ? data.quoteTags : selectedTags,
  currentQuote: typeof data.currentQuote === 'string' ? data.currentQuote : legacyQuoteFromCloud(data),
  resetCredential: data.resetCredential ?? null,
}))
const hasMeaningfulProgress = () => state.xp > 0 || Object.keys(state.dailyLogs).length > 0 || Object.keys(state.attendanceDates).length > 0
const syncStatusText: Record<SyncStatus, string> = {
  local: 'Cloud required',
  syncing: 'Syncing',
  synced: 'Saved',
  offline: 'Offline',
  error: 'Sync error',
}

function setSyncStatus(next: SyncStatus) {
  syncStatus = next
  const element = document.querySelector<HTMLElement>('#sync-status')
  if (element) { element.textContent = syncStatusText[next]; element.dataset.state = next }
}

function markDirty() {
  if (!cloudEnabled) return
  isDirty = true
  changeVersion += 1
  localStorage.setItem(DIRTY_KEY, '1')
  scheduleCloudPush()
}

function scheduleCloudPush(delay = 800) {
  if (!currentUser) return
  window.clearTimeout(syncTimer)
  setSyncStatus(navigator.onLine ? 'syncing' : 'offline')
  syncTimer = window.setTimeout(() => { void pushToCloud() }, delay)
}

async function pushToCloud() {
  const user = currentUser
  if (!user) return false
  const version = changeVersion
  try {
    await saveProgress(user.uid, cloudSnapshot())
    localStorage.setItem(OWNER_KEY, user.uid)
    if (version === changeVersion) {
      isDirty = false
      localStorage.removeItem(DIRTY_KEY)
      setSyncStatus('synced')
    }
    return true
  } catch (error) {
    console.error('Cloud save failed', error)
    syncErrorCode = (error as { code?: string } | null)?.code ?? ''
    scheduleCloudPush(15000)
    setSyncStatus(navigator.onLine ? 'error' : 'offline')
    return false
  }
}

function adoptRemote(data: CloudRecord, uid: string) {
  state = buildState(data)
  const credential = data.resetCredential as ResetCredential | null | undefined
  resetCredential = credential?.salt && credential?.hash ? credential : null
  if (resetCredential) localStorage.setItem(RESET_CREDENTIAL_KEY, JSON.stringify(resetCredential))
  else localStorage.removeItem(RESET_CREDENTIAL_KEY)
  currentQuote = typeof data.currentQuote === 'string' ? data.currentQuote : legacyQuoteFromCloud(data)
  if (currentQuote) localStorage.setItem('level-up-current-quote', currentQuote)
  else localStorage.removeItem('level-up-current-quote')
  if (Array.isArray(data.quoteTags)) { selectedTags = data.quoteTags as string[]; localStorage.setItem('level-up-quote-tags', JSON.stringify(selectedTags)) }
  localStorage.setItem('level-up-state', JSON.stringify(state))
  localStorage.setItem(OWNER_KEY, uid)
  isDirty = false
  localStorage.removeItem(DIRTY_KEY)
}

function handleRemoteProgress(data: CloudRecord | null, meta: { pending: boolean; fromCache: boolean }) {
  const user = currentUser
  if (!user || meta.pending) return
  const owner = localStorage.getItem(OWNER_KEY)
  let changed = false

  if (!data) {
    // A cache miss only means the server has not answered yet.
    if (meta.fromCache) return
    if (owner && owner !== user.uid) {
      state = buildState({})
      currentQuote = null
      localStorage.removeItem('level-up-current-quote')
      resetCredential = null
      localStorage.removeItem(RESET_CREDENTIAL_KEY)
      changed = true
    }
    localStorage.setItem(OWNER_KEY, user.uid)
    markDirty()
  } else if (stableStringify(normalizeRemote(data)) === stableStringify(cloudSnapshot())) {
    localStorage.setItem(OWNER_KEY, user.uid)
    isDirty = false
    localStorage.removeItem(DIRTY_KEY)
    setSyncStatus('synced')
  } else if (isDirty && owner === user.uid) {
    scheduleCloudPush(0)
  } else {
    if (owner !== user.uid && hasMeaningfulProgress()) localStorage.setItem('level-up-state-backup', JSON.stringify(state))
    adoptRemote(data, user.uid)
    setSyncStatus('synced')
    changed = true
  }

  // Missed-day penalties wait for a server-confirmed copy so a stale device cannot overwrite newer progress.
  if (!meta.fromCache && !firstSyncDone) {
    firstSyncDone = true
    applyMissedDayPenalties()
    changed = true
  }
  if (awaitingFirstSync) { awaitingFirstSync = false; changed = true }
  if (changed) render()
}

function startCloudSync() {
  window.addEventListener('online', () => {
    if (!currentUser) return
    if (isDirty) scheduleCloudPush(0)
    else setSyncStatus('synced')
  })
  window.addEventListener('offline', () => { if (currentUser) setSyncStatus('offline') })
  watchUser((user) => {
    stopProgressWatch?.()
    stopProgressWatch = null
    window.clearTimeout(syncTimer)
    currentUser = user
    authReady = true
    firstSyncDone = false
    awaitingFirstSync = user !== null && localStorage.getItem(OWNER_KEY) !== user.uid
    if (user) {
      setSyncStatus(navigator.onLine ? 'syncing' : 'offline')
      stopProgressWatch = watchProgress(user.uid, handleRemoteProgress, (error) => {
        console.error('Cloud sync failed', error)
        syncErrorCode = (error as { code?: string } | null)?.code ?? ''
        setSyncStatus(navigator.onLine ? 'error' : 'offline')
        if (awaitingFirstSync) render()
      })
    }
    render()
  })
}

async function signOutAndClear() {
  window.clearTimeout(syncTimer)
  if (isDirty && currentUser) {
    const saved = await Promise.race([pushToCloud(), new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 8000))])
    if (!saved) return false
  }
  stopProgressWatch?.()
  stopProgressWatch = null
  await signOutUser()
  // The cloud copy is the source of truth, so nothing from this account stays on the device.
  ;['level-up-state', OWNER_KEY, DIRTY_KEY, RESET_CREDENTIAL_KEY, 'level-up-quote-tags', 'level-up-custom-quotes', 'level-up-saved-quotes', 'level-up-current-quote'].forEach((key) => localStorage.removeItem(key))
  state = buildState({})
  resetCredential = null
  selectedTags = ['exercise', 'motivational']
  isDirty = false
  activeTab = 'home'
  todayMode = 'choose'
  todayCompletionOpen = false
  currentQuote = null
  return true
}

function renderVisibilityToggle(targetId: string, description: string) {
  return `<button class="password-visibility" type="button" data-password-target="${targetId}" data-visibility-label="${description}" aria-label="Show ${description}" aria-controls="${targetId}" aria-pressed="false" title="Show ${description}"><svg class="eye-open" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg><svg class="eye-closed" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c6.1 0 9.5 6 9.5 6a16 16 0 0 1-3 3.5M6.2 6.3C3.9 7.8 2.5 12 2.5 12s3.4 6 9.5 6c1 0 1.9-.2 2.7-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button>`
}

function renderSignOutConfirmation() {
  return `<div class="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="sign-out-dialog-title"><div class="confirmation-backdrop" id="cancel-sign-out"></div><section class="confirmation-panel"><p class="kicker">ACCOUNT</p><h2 id="sign-out-dialog-title">Sign out?</h2><p>Your progress stays saved to your cloud account. Any pending changes will be uploaded before signing out.</p><div class="confirmation-actions"><button class="small-button secondary-button" id="cancel-sign-out" type="button">CANCEL</button><button class="small-button account-signout" id="confirm-sign-out" type="button">SIGN OUT</button></div></section></div>`
}

function renderAuthGate() {
  let body: string
  if (!authReady) {
    body = '<p class="kicker">LEVEL UP</p><h2>Loading…</h2>'
  } else if (currentUser) {
    const problem = syncStatus === 'error' || syncStatus === 'offline'
    const problemText = syncErrorCode === 'permission-denied'
      ? 'The cloud database refused access. In the Firebase console, publish the Firestore rules from firestore.rules, then reload the app.'
      : 'Your saved progress is not reachable yet. Check your connection; this continues automatically once it is.'
    body = `<p class="kicker">SYNCING</p><h2>Loading your progress…</h2><p class="auth-hint">${problem ? problemText : 'Fetching your saved progress from your account.'}</p><button class="small-button auth-secondary" id="auth-signout" type="button">SIGN OUT</button>`
  } else {
    const isSignUp = authMode === 'signup'
    const disabled = authBusy ? 'disabled' : ''
    body = `<p class="kicker">ACCOUNT</p><h2>${isSignUp ? 'Create account' : 'Sign in'}</h2>
      <p class="auth-hint">Your progress is saved to your account, so you can continue on any device.</p>
      <form id="auth-form" novalidate>
        <label class="auth-field"><span>EMAIL</span><input id="auth-email" type="email" inputmode="email" autocomplete="email" value="${escapeHtml(authEmail)}" ${disabled}></label>
        <label class="auth-field"><span>PASSWORD</span><div class="auth-password-control"><input id="auth-password" type="password" autocomplete="${isSignUp ? 'new-password' : 'current-password'}" placeholder="${isSignUp ? 'At least 6 characters' : ''}" ${disabled}>${renderVisibilityToggle('auth-password', 'password')}</div></label>
        ${isSignUp ? `<p class="auth-hint auth-reset-code-note">Choose a six-digit reset code. It will be used only as an extra confirmation before permanently erasing your progress. It is not your sign-in or account recovery code.</p><label class="auth-field"><span>RESET CODE</span><div class="auth-password-control"><input id="auth-reset-code" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="6 digits" ${disabled}>${renderVisibilityToggle('auth-reset-code', 'reset code')}</div></label><label class="auth-field"><span>CONFIRM RESET CODE</span><div class="auth-password-control"><input id="auth-reset-code-confirm" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="Enter it again" ${disabled}>${renderVisibilityToggle('auth-reset-code-confirm', 'confirmation code')}</div></label>` : ''}
        ${authMessage ? `<p class="auth-message ${authMessageKind}" role="alert">${escapeHtml(authMessage)}</p>` : ''}
        <button class="small-button auth-submit" type="submit" ${disabled}>${authBusy ? 'PLEASE WAIT…' : isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}</button>
      </form>
      <div class="auth-links"><button type="button" id="auth-toggle">${isSignUp ? 'I already have an account' : 'Create an account'}</button>${isSignUp ? '' : '<button type="button" id="auth-reset">Forgot password?</button>'}</div>`
  }
  const app = document.querySelector<HTMLDivElement>('#app')!
  const existingAuthCard = app.querySelector<HTMLElement>('.auth-shell .auth-card')
  if (existingAuthCard) {
    existingAuthCard.innerHTML = body
    app.querySelector('.confirmation-dialog')?.remove()
    if (signOutConfirmationOpen) app.querySelector('.auth-main')?.insertAdjacentHTML('beforeend', renderSignOutConfirmation())
  } else {
    app.innerHTML = `<div class="app-shell auth-shell"><main class="auth-main"><div class="auth-scene" aria-hidden="true"><video class="app-video auth-background-video" autoplay muted loop playsinline preload="auto"><source src="${authBackgroundVideo}" type="video/mp4"></video><span class="auth-video-overlay"></span><span class="auth-portal"></span><span class="auth-shadow"><i></i><i></i></span><span class="auth-particle auth-particle-a"></span><span class="auth-particle auth-particle-b"></span><span class="auth-particle auth-particle-c"></span><span class="auth-floor"></span></div><div class="brand-mark"><span class="brand-orbit"></span><span>LEVEL<br><b>UP</b></span></div><section class="auth-card">${body}</section>${signOutConfirmationOpen ? renderSignOutConfirmation() : ''}</main></div>`
    const backgroundVideo = document.querySelector<HTMLVideoElement>('.auth-background-video')
    const revealBackground = () => backgroundVideo?.classList.add('is-ready')
    backgroundVideo?.addEventListener('canplay', revealBackground, { once: true })
    if (backgroundVideo && backgroundVideo.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) revealBackground()
  }

  const emailInput = document.querySelector<HTMLInputElement>('#auth-email')
  emailInput?.addEventListener('input', () => { authEmail = emailInput.value })
  wirePasswordVisibility()
  document.querySelector('#auth-signout')?.addEventListener('click', () => {
    signOutConfirmationOpen = true
    renderAuthGate()
  })
  document.querySelectorAll<HTMLElement>('#cancel-sign-out').forEach((element) => element.addEventListener('click', () => {
    signOutConfirmationOpen = false
    renderAuthGate()
  }))
  document.querySelector('#confirm-sign-out')?.addEventListener('click', async () => {
    signOutConfirmationOpen = false
    const signedOut = await signOutAndClear()
    if (!signedOut) renderAuthGate()
  })
  document.querySelector('#auth-toggle')?.addEventListener('click', () => {
    authMode = authMode === 'signin' ? 'signup' : 'signin'
    authMessage = ''
    renderAuthGate()
  })
  document.querySelector('#auth-reset')?.addEventListener('click', async () => {
    authEmail = emailInput?.value.trim() ?? ''
    if (!authEmail) {
      authMessage = 'Enter your email above, then tap "Forgot password?".'
      authMessageKind = 'error'
    } else {
      try {
        await sendReset(authEmail)
        authMessage = 'Password reset email sent. Check your inbox.'
        authMessageKind = 'info'
      } catch (error) {
        authMessage = describeAuthError(error)
        authMessageKind = 'error'
      }
    }
    renderAuthGate()
  })
  document.querySelector('#auth-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    authEmail = emailInput?.value.trim() ?? ''
    const password = document.querySelector<HTMLInputElement>('#auth-password')?.value ?? ''
    const isSignUp = authMode === 'signup'
    const resetCode = document.querySelector<HTMLInputElement>('#auth-reset-code')?.value ?? ''
    const resetCodeConfirmation = document.querySelector<HTMLInputElement>('#auth-reset-code-confirm')?.value ?? ''
    if (!authEmail || !password) {
      authMessage = 'Enter your email and password.'
      authMessageKind = 'error'
      renderAuthGate()
      return
    }
    if (isSignUp && !/^\d{6}$/.test(resetCode)) {
      authMessage = 'Choose a six-digit reset code.'
      authMessageKind = 'error'
      renderAuthGate()
      return
    }
    if (isSignUp && resetCode !== resetCodeConfirmation) {
      authMessage = 'The reset codes do not match.'
      authMessageKind = 'error'
      renderAuthGate()
      return
    }
    const previousCredential = resetCredential
    authBusy = true
    authMessage = ''
    renderAuthGate()
    let succeeded = true
    try {
      if (isSignUp) {
        resetCredential = await hashResetCode(resetCode)
        localStorage.setItem(RESET_CREDENTIAL_KEY, JSON.stringify(resetCredential))
        await signUpWithEmail(authEmail, password)
      }
      else await signInWithEmail(authEmail, password)
    } catch (error) {
      succeeded = false
      if (isSignUp) {
        resetCredential = previousCredential
        if (resetCredential) localStorage.setItem(RESET_CREDENTIAL_KEY, JSON.stringify(resetCredential))
        else localStorage.removeItem(RESET_CREDENTIAL_KEY)
      }
      authMessage = error instanceof Error && !('code' in error) ? error.message : describeAuthError(error)
      authMessageKind = 'error'
    }
    authBusy = false
    // On success the auth listener renders the next screen.
    if (!succeeded) renderAuthGate()
  })
}

// Legacy saves have no per-day XP, so estimate it once from logged exercises and check-ins.
if (cloudEnabled && (needsXpBackfill || needsBreakdownBackfill)) {
  const recordSource = (dateKey: string, source: string, amount: number) => {
    state.xpBreakdown[dateKey] = { ...(state.xpBreakdown[dateKey] ?? {}), [source]: roundXp(amount) }
  }
  Object.entries(state.attendanceDates).forEach(([dateKey, mode]) => recordSource(dateKey, `attendance:${mode}`, getAttendanceCredit(mode)))
  Object.entries(state.dailyLogs).forEach(([dateKey, log]) => {
    Object.entries(log).forEach(([id, count]) => recordSource(dateKey, `exercise:${id}`, getExerciseXpGain(id) * count))
  })
  if (needsXpBackfill) {
    Object.entries(state.xpBreakdown).forEach(([dateKey, sources]) => {
      state.xpHistory[dateKey] = roundXp(Object.values(sources).reduce((sum, amount) => sum + amount, 0))
    })
  }
  localStorage.setItem('level-up-state', JSON.stringify(state))
}
if (cloudEnabled) {
  startCloudSync()
}
render()