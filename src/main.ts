import './style.css'
import mountainTownVideo from './assets/From Klickpin.com- Cultural mountain town stories for people who love beauty for creative people to pin for future adve-pin-id-907686499886846221.mp4'
import patternStorageVideo from './assets/From Klickpin.com- Practical pattern storage tips with charm and useful ideas this season for stylish handmade days-pin-id-921267667539985906.mp4'
import oldMoneyOutfitVideo from './assets/From Klickpin.com- Chic old money outfit ideas that make everyday moments look more intentional memorable and beautifully styled for busy people w.mp4'
import travelPackingVideo from './assets/From Klickpin.com- Pin these 28 Practical travel packing tips that are worth saving if you love elegant details and creative inspiration for begin.mp4'
import summerOutfitVideo from './assets/From Klickpin.com- Try Simple summer outfit ideas that can instantly upgrade your look room party or daily routine for your next inspiration board.mp4'

type ExerciseEntry = { id: string; label: string }
type Challenge = { name: string; detail: string; reward: number; className: string }
type TrainingState = {
  completed: number;
  challengeDone: boolean;
  xp: number;
  currentLevel: number;
  exerciseTotals: Record<string, number>;
  dailyLogs: Record<string, Record<string, number>>;
  activityDates: Record<string, true>;
  customExercises: ExerciseEntry[];
  customChallenges: Challenge[];
  savedChallenges: Challenge[];
  lastDecayDate?: string;
}
type Tab = 'home' | 'today' | 'progress' | 'missions' | 'profile'

const XP_CONFIG = {
  levelThresholds: [0, 300, 700, 1300, 2100, 3000, 4100, 5400, 7000],
  exercise: {
    push: 0.1,
    run: 5,
    custom: 0.1,
    dayBonus: 1,
    missPenalty: 5,
  },
} as const

const levels = [
  { name: 'Awakening', rank: '01', push: '20 x 3', squat: '20 x 3', core: '20 x 3', run: '2 km', xp: 300 },
  { name: 'Recruit', rank: '02', push: '22 x 3', squat: '22 x 3', core: '22 x 3', run: '2.5 km', xp: 700 },
  { name: 'Hunter', rank: '03', push: '25 x 3', squat: '25 x 3', core: '25 x 3', run: '3 km', xp: 1300 },
  { name: 'Elite', rank: '04', push: '28 x 3', squat: '28 x 3', core: '28 x 3', run: '4 km', xp: 2100 },
  { name: 'Commander', rank: '05', push: '30 x 3', squat: '30 x 3', core: '30 x 3', run: '5 km', xp: 3000 },
  { name: 'Monarch', rank: '06', push: '25 x 4', squat: '35 x 3', core: '35 x 3', run: '6 km', xp: 4100 },
  { name: 'Shadow Monarch', rank: '07', push: '25 x 4', squat: '25 x 4', core: '25 x 4', run: '8 km', xp: 5400 },
  { name: 'National Level', rank: '08', push: '100 total', squat: '100 total', core: '100 total', run: '10 km', xp: 7000 },
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
let state: TrainingState = {
  completed: oldState.completed ?? 0,
  challengeDone: oldState.challengeDone ?? oldState.missionDone ?? false,
  xp: oldState.xp ?? 0,
  currentLevel: oldState.currentLevel ?? 1,
  exerciseTotals: oldState.exerciseTotals ?? { push: 0, run: 0 },
  dailyLogs: oldState.dailyLogs ?? {},
  activityDates: oldState.activityDates ?? {},
  customExercises: oldState.customExercises ?? [],
  customChallenges: oldState.customChallenges ?? [],
  savedChallenges: oldState.savedChallenges ?? [...baseChallenges, ...(oldState.customChallenges ?? [])],
  lastDecayDate: oldState.lastDecayDate,
}
const save = () => localStorage.setItem('level-up-state', JSON.stringify(state))
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
  { label: 'END', value: Object.keys(state.activityDates).length, detail: 'Endurance' },
  { label: 'DEX', value: state.customExercises.length, detail: 'Dexterity' },
]
const recordTrainingDay = (dateKey: string) => {
  if (hasTrainingActivity(dateKey)) return false
  state.activityDates[dateKey] = true
  state.completed += 1
  state.xp += XP_CONFIG.exercise.dayBonus
  state.lastDecayDate = dateKey
  return true
}
const getExerciseXpGain = (exerciseId: string) => {
  if (exerciseId === 'push') return XP_CONFIG.exercise.push
  if (exerciseId === 'run') return XP_CONFIG.exercise.run
  return XP_CONFIG.exercise.custom
}
const getExerciseXpLabel = (exerciseId: string) => {
  if (exerciseId === 'push') return `+${XP_CONFIG.exercise.push} XP / rep`
  if (exerciseId === 'run') return `+${XP_CONFIG.exercise.run} XP / km`
  return `+${XP_CONFIG.exercise.custom} XP / unit`
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
const applyMissedDayPenalty = () => {
  const dateKey = todayKey()
  if (hasTrainingActivity(dateKey) || state.lastDecayDate === dateKey) return

  const penalty = XP_CONFIG.exercise.missPenalty
  state.xp = Math.max(0, state.xp - penalty)
  state.lastDecayDate = dateKey
  syncLevelFromXp()
  save()
}
const baseExercises = [
  { id: 'run', label: 'Run', icon: 'run' },
  { id: 'push', label: 'Push-ups', icon: 'pushup' },
] as const
const exercises = () => [
  ...baseExercises.map((exercise) => ({ ...exercise })),
  ...state.customExercises.map((exercise) => ({ id: exercise.id, label: exercise.label, icon: 'custom' }))
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
const saveTags = () => localStorage.setItem('level-up-quote-tags', JSON.stringify(selectedTags))

let activeTab: Tab = 'home'
let tagDropdownOpen = false
let currentQuote: string | null = null
let quoteLoading = false
let quoteIsDefault = false
let customExerciseFormOpen = false
let resetConfirmationOpen = false
let pendingExerciseDeletion: ExerciseEntry | null = null
let selectedChallengeIndex = 0
let challengeWheelRotation = 0
let challengeSpinning = false
let customChallengeFormOpen = false
let editingChallengeIndex: number | null = null
let todayCompletionOpen = false
let systemInfoOpen = false
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
    if (!response.ok) throw new Error('quote proxy failed')
    const data = await response.json() as { text: string }
    if (!data.text) throw new Error('empty proxy quote')
    currentQuote = data.text
    quoteIsDefault = false
  } catch {
    currentQuote = 'Unable to generate a quote right now. Please try again.'
    quoteIsDefault = false
  } finally {
    quoteLoading = false
    render()
  }
}

function exerciseVisual(kind: string, label: string) {
  return `<div class="exercise-tile ${kind}"><div class="figure" aria-hidden="true"><span class="head"></span><span class="torso"></span><span class="arm arm-a"></span><span class="arm arm-b"></span><span class="leg leg-a"></span><span class="leg leg-b"></span></div><span class="exercise-label">${label}</span></div>`
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
    <div class="xp-rule"><span>Daily login credit : </span><strong>+${XP_CONFIG.exercise.dayBonus} XP</strong></div>
    <div class="xp-rule xp-rule-penalty"><span>Missed day : </span><strong>-${XP_CONFIG.exercise.missPenalty} XP</strong></div>`
  const quoteSuffix = quoteIsDefault ? ' (Default)' : ''
  let quoteMarkup = ''
  if (quoteLoading) quoteMarkup = '<p class="quote">Loading today’s quote…</p>'
  if (!quoteLoading && currentQuote) quoteMarkup = `<p class="quote">“${currentQuote}”${quoteSuffix}</p>`
  const questStatus = state.challengeDone ? 'DONE' : 'LIVE'

  return `
    <section class="hero-panel">
      <div class="hero-glow hero-glow-a"></div>
      <div class="hero-glow hero-glow-b"></div>
      <div class="dungeon-scene" aria-hidden="true"><span class="portal-ring"></span><span class="hunter-silhouette"><i></i><i></i></span><span class="shadow-particle particle-one"></span><span class="shadow-particle particle-two"></span><span class="shadow-particle particle-three"></span></div>
      <div class="eyebrow"><span class="line"></span> REAL-LIFE TRAINING ARC <span class="line"></span></div>
      ${quoteMarkup}
      <details class="tag-dropdown" id="quote-tags" ${tagDropdownOpen ? 'open' : ''}><summary>Quote topics · ${selectedTags.length} selected</summary><div class="tag-options">${TAG_OPTIONS.map((tag) => `<label class="tag-option"><input type="checkbox" data-tag="${tag.id}" ${selectedTags.includes(tag.id) ? 'checked' : ''}> ${tag.label}</label>`).join('')}</div></details>
      <button class="small-button generate-quote-button" id="generate-quote" ${quoteLoading ? 'disabled' : ''}>${quoteLoading ? 'GENERATING…' : 'GENERATE QUOTE'} <span>↻</span></button>
      <div class="hero-content">
        <div class="hero-details">
          <div class="hero-copy">
            <div>
              <p class="muted">CURRENT RANK</p>
              <h1>Level ${String(state.currentLevel).padStart(2, '0')}</h1>
              <p class="rank-name">${level.name}</p>
            </div>
          </div>
          <div class="hero-metrics">
            <div class="metric-pill"><span>XP</span><strong>${state.xp}</strong></div>
            <div class="metric-pill"><span>TOTAL DAYS</span><strong>${state.completed}</strong></div>
            <div class="metric-pill"><span>QUEST</span><strong>${questStatus}</strong></div>
          </div>
          <div class="xp-row"><span>SELF-PACED</span></div>
          <div class="xp-track"><span class="open-progress" style="width: ${progressWidth};"></span></div>
          <div class="xp-progress-meta"><span>${state.xp} XP</span><span>${progress.currentProgress} / ${progress.totalProgress} to next</span></div>
          <div class="xp-rules">${xpRules}</div>
        </div>
        <div class="hero-rank-visual">
          <video class="hero-rank-video" autoplay muted loop playsinline aria-label="Cultural mountain town video">
            <source src="${mountainTownVideo}" type="video/mp4">
          </video>
        </div>
      </div>
    </section>

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
        <section class="ladder"><div class="ladder-summary"><span>Total training days</span><b>${state.completed}</b></div>${ladderRows}</section>
      </div>
      <div class="progress-rank-visual">
        <video class="progress-rank-video" autoplay muted loop playsinline aria-label="Pattern storage video">
          <source src="${patternStorageVideo}" type="video/mp4">
        </video>
      </div>
    </section>`
}

function renderTodayTab(log: Record<string, number>, todayLabel: string) {
  const exerciseList = exercises().map((exercise) => {
    const isCustom = !baseExercises.some((baseExercise) => baseExercise.id === exercise.id)
    const loggedQuantity = log[exercise.id]
    const isLoggedToday = loggedQuantity !== undefined
    const exerciseDetail = isLoggedToday
      ? `<small><span>All-time total: ${state.exerciseTotals[exercise.id] ?? 0}</span><span>Logged today: ${loggedQuantity}</span><span>Available tomorrow</span></small>`
      : `<small>All-time total: ${state.exerciseTotals[exercise.id] ?? 0} • ${getExerciseXpLabel(exercise.id)}</small>`
    const deleteButton = isCustom
      ? `<button class="small-button delete-custom-exercise" data-exercise="${exercise.id}" type="button">DELETE</button>`
      : ''

    return `
      <div class="log-item ${isLoggedToday ? 'logged-today' : ''}">
        <div class="log-summary">
          <span class="check-figure ${exercise.icon}">${exerciseVisual(exercise.icon, '')}</span>
          <span class="check-copy"><b>${exercise.label}</b>${exerciseDetail}</span>
        </div>
        <div class="log-actions">
          <input class="quantity-input" data-quantity="${exercise.id}" type="number" min="0" value="${isLoggedToday ? loggedQuantity : ''}" placeholder="0" aria-label="${exercise.label} count" ${isLoggedToday ? 'disabled' : ''}>
          <button class="small-button add-exercise" data-exercise="${exercise.id}" type="button" ${isLoggedToday ? 'disabled' : ''}>${isLoggedToday ? 'LOGGED' : 'ADD'}</button>
          ${deleteButton}
        </div>
      </div>
    `
  }).join('')

  const customFormMarkup = customExerciseFormOpen ? `
    <div class="custom-exercise-form" id="custom-exercise-form">
      <input id="custom-exercise-name" type="text" maxlength="30" placeholder="Exercise name" aria-label="Custom exercise name">
      <div class="custom-exercise-actions">
        <button class="small-button secondary-button" id="cancel-custom-exercise" type="button">CANCEL</button>
        <button class="small-button" id="save-custom-exercise" type="button">SAVE</button>
      </div>
    </div>` : ''

  if (todayCompletionOpen) {
    return `
      <section class="today-completion">
        <p class="kicker">TARGET CLEARED</p>
        <h2>Today's target achieved.</h2>
        <p class="today-completion-quote">ARISE. TODAY'S QUEST IS COMPLETE.</p>
        <div class="today-completion-visual">
          <video autoplay muted loop playsinline aria-label="Travel packing inspiration video">
            <source src="${travelPackingVideo}" type="video/mp4">
          </video>
        </div>
        <button class="small-button" id="return-to-today-log" type="button">BACK TO TODAY'S LOG</button>
      </section>`
  }

  return `
    <section class="today-log-layout">
      <div class="today-log-details">
        <section class="section-heading"><div><p class="kicker">${todayLabel.toUpperCase()}</p><h2>Log your training</h2></div><span class="day-chip">${Object.keys(log).length} EXERCISES</span></section>
        <section class="mission-card"><div class="mission-top"><div><span class="mission-tag">FLEXIBLE DAILY LOG</span><h3>What did you complete?</h3><p>Enter the real count for each exercise. No fixed daily requirement.</p></div><div class="quest-symbol">◈</div></div><div class="checklist">${exerciseList}${customFormMarkup}<button class="small-button add-custom-exercise" id="add-custom-exercise" type="button">ADD EXERCISE</button></div></section>
      </div>
      <div class="today-log-visual">
        <video class="today-log-video" autoplay muted loop playsinline aria-label="Old money outfit inspiration video">
          <source src="${oldMoneyOutfitVideo}" type="video/mp4">
        </video>
        <button class="small-button complete-day-button" id="complete-today" type="button">COMPLETED TODAY'S TARGET</button>
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

function renderProfileTab(level: ReturnType<typeof current>) {
  const progress = getLevelProgress()
  const stats = hunterStats()
  const badgeList = [
    { label: 'Hunter title', value: hunterTitle() },
    { label: 'Training days', value: `${state.completed} days` },
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
        <video class="profile-rank-video" autoplay muted loop playsinline aria-label="Summer outfit inspiration video">
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
    <section class="system-stats" aria-label="Hunter stats">
      <div class="system-stats-heading"><p class="kicker">SYSTEM STATUS</p><div class="system-stats-live"><span>LIVE VALUES</span><button class="system-info-button" id="system-stats-info" type="button" aria-label="How Hunter stats are calculated" aria-expanded="${systemInfoOpen}">i</button></div></div>
      ${systemInfoOpen ? `<div class="system-stats-info" id="system-stats-explanation"><p>Values are calculated from your saved training activity.</p><ul><li><b>STR</b> = total push-ups / 10</li><li><b>VIT</b> = completed training days</li><li><b>AGI</b> = total run distance in km</li><li><b>END</b> = days with recorded activity</li><li><b>DEX</b> = custom exercises created</li></ul></div>` : ''}
      <div class="system-stats-grid">
        ${stats.map((stat) => `<div class="system-stat"><b>${stat.label}</b><strong>${stat.value}</strong><span>${stat.detail}</span></div>`).join('')}
      </div>
    </section>
    <section class="mission-card"><div class="profile-stat"><span>Current rank</span><b>Level ${String(state.currentLevel).padStart(2, '0')} · ${level.name}</b></div><div class="profile-stat"><span>Total training days</span><b>${state.completed}</b></div><div class="profile-stat"><span>Progress style</span><b>SELF-PACED</b></div><div class="profile-stat"><span>Active quests</span><b>${challenges().length}</b></div><button class="reset-button" id="reset-progress">RESET LOCAL PROGRESS</button></section>`
}

function render() {
  const level = current()
  const log = todayLog()
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const ladderRows = levels.map((item, index) => {
    const rank = index + 1
    let status = 'LOCKED'
    if (rank < state.currentLevel) status = 'CLEARED'
    if (rank === state.currentLevel) status = 'ACTIVE'
    return `<div class="ladder-row ${rank === state.currentLevel ? 'active' : ''} ${rank < state.currentLevel ? 'cleared' : ''}"><span class="ladder-number">${item.rank}</span><span class="ladder-name">${item.name}</span><span class="ladder-state">${status}</span></div>`
  }).join('')

  let tabContent = ''
  if (activeTab === 'home') tabContent = renderHomeTab(level)
  if (activeTab === 'today') tabContent = renderTodayTab(log, todayLabel)
  if (activeTab === 'progress') tabContent = renderProgressTab(ladderRows)
  if (activeTab === 'missions') tabContent = renderChallengesTab()
  if (activeTab === 'profile') tabContent = renderProfileTab(level)

  const navItem = (tab: Tab, icon: string, label: string) => `<a class="${activeTab === tab ? 'active' : ''}" data-tab="${tab}" href="#${tab}"><span>${icon}</span>${label}</a>`

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
          <h2 id="reset-dialog-title">Start over?</h2>
          <p>This will permanently remove your XP, exercise logs, completed days, and custom exercises.</p>
          <div class="confirmation-actions">
            <button class="small-button secondary-button" id="cancel-reset" type="button">CANCEL</button>
            <button class="small-button reset-confirm-button" id="confirm-reset" type="button">RESET PROGRESS</button>
          </div>
        </section>
      </div>` : ''}
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
    state.xp += xpGain
    state.lastDecayDate = date
    syncLevelFromXp()
    save(); render(); showToast(`${xpText} logged · +${xpGain.toFixed(1)} XP`)
  }))
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
    if (!customName) {
      showToast('Enter an exercise name')
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
    state.customExercises.push({ id: customId, label: customName })
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
    state.xp += challenge.reward
    syncLevelFromXp()
    save()
    render()
    showToast(`${challenge.name} completed · +${challenge.reward} XP`)
  })
  document.querySelector('#profile')?.addEventListener('click', () => { activeTab = 'profile'; render() })
  document.querySelector('#reset-progress')?.addEventListener('click', () => {
    resetConfirmationOpen = true
    render()
  })
  document.querySelectorAll<HTMLElement>('#cancel-reset').forEach((element) => element.addEventListener('click', () => {
    resetConfirmationOpen = false
    render()
  }))
  document.querySelector('#confirm-reset')?.addEventListener('click', () => {
    resetConfirmationOpen = false

    state = { completed: 0, challengeDone: false, xp: 0, currentLevel: 1, exerciseTotals: { push: 0, run: 0 }, dailyLogs: {}, activityDates: {}, customExercises: [], customChallenges: [], savedChallenges: [...baseChallenges], lastDecayDate: undefined }
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
applyMissedDayPenalty()
render()