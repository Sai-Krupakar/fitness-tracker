import './style.css'

type ExerciseEntry = { id: string; label: string }
type TrainingState = {
  completed: number;
  missionDone: boolean;
  xp: number;
  currentLevel: number;
  exerciseTotals: Record<string, number>;
  dailyLogs: Record<string, Record<string, number>>;
  customExercises: ExerciseEntry[];
  lastDecayDate?: string;
}
type Tab = 'home' | 'today' | 'missions' | 'profile'

const XP_CONFIG = {
  levelThresholds: [0, 300, 700, 1300, 2100, 3000, 4100, 5400, 7000],
  exercise: {
    push: 0.2,
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
const missions = [
  { letter: 'A', name: 'Agility drills', detail: '3 rounds · 30 seconds each' },
  { letter: 'B', name: 'Beginner burpees', detail: '10 controlled reps' },
  { letter: 'C', name: 'Calf raises', detail: '20 controlled reps' },
  { letter: 'D', name: 'Diamond push-up progression', detail: '8 controlled reps' },
]
const stored = localStorage.getItem('level-up-state')
const oldState = stored ? JSON.parse(stored) : {}
const localDateKey = (date: Date) => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}` }
const todayKey = () => localDateKey(new Date())
let state: TrainingState = {
  completed: oldState.completed ?? 0,
  missionDone: oldState.missionDone ?? false,
  xp: oldState.xp ?? 0,
  currentLevel: oldState.currentLevel ?? 1,
  exerciseTotals: oldState.exerciseTotals ?? { push: 0, run: 0 },
  dailyLogs: oldState.dailyLogs ?? {},
  customExercises: oldState.customExercises ?? [],
  lastDecayDate: oldState.lastDecayDate,
}
const save = () => localStorage.setItem('level-up-state', JSON.stringify(state))
const current = () => levels[Math.min(state.currentLevel - 1, levels.length - 1)]
const todayLog = () => state.dailyLogs[todayKey()] ?? {}
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
  const hasLogsToday = Object.keys(state.dailyLogs[dateKey] ?? {}).length > 0
  if (hasLogsToday || state.lastDecayDate === dateKey) return

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

function renderHomeTab(level: ReturnType<typeof current>, ladderRows: string) {
  const progress = getLevelProgress()
  const progressWidth = `${Math.max(0, Math.min(progress.percent, 100))}%`
  const xpRules = `
    <div class="xp-rule"><span>Push-ups : </span><strong>+${XP_CONFIG.exercise.push} XP / rep</strong></div>
    <div class="xp-rule"><span>Run : </span><strong>+${XP_CONFIG.exercise.run} XP / km</strong></div>
    <div class="xp-rule"><span>Custom exercise : </span><strong>+${XP_CONFIG.exercise.custom} XP / unit</strong></div>
    <div class="xp-rule"><span>Daily login credit : </span><strong>+${XP_CONFIG.exercise.dayBonus} XP</strong></div>
    <div class="xp-rule xp-rule-penalty"><span>Missed day : </span><strong>-${XP_CONFIG.exercise.missPenalty} XP</strong></div>`
  return `
    <section class="hero-panel"><div class="eyebrow"><span class="line"></span> REAL-LIFE TRAINING ARC <span class="line"></span></div><div class="hero-copy"><div><p class="muted">CURRENT RANK</p><h1>Level ${String(state.currentLevel).padStart(2, '0')}</h1><p class="rank-name">${level.name}</p></div><div class="rank-emblem">${level.rank}<span>RANK</span></div></div><div class="xp-row"><span>TRAINING DAYS ${state.completed}</span><span>SELF-PACED</span></div><div class="xp-track"><span class="open-progress" style="width: ${progressWidth};"></span></div><div class="xp-progress-meta"><span>${state.xp} XP</span><span>${progress.currentProgress} / ${progress.totalProgress} to next</span></div><div class="xp-rules">${xpRules}</div><details class="tag-dropdown" id="quote-tags" ${tagDropdownOpen ? 'open' : ''}><summary>Quote topics · ${selectedTags.length} selected</summary><div class="tag-options">${TAG_OPTIONS.map((tag) => `<label class="tag-option"><input type="checkbox" data-tag="${tag.id}" ${selectedTags.includes(tag.id) ? 'checked' : ''}> ${tag.label}</label>`).join('')}</div></details><button class="small-button generate-quote-button" id="generate-quote" ${quoteLoading ? 'disabled' : ''}>${quoteLoading ? 'GENERATING…' : 'GENERATE QUOTE'} <span>↻</span></button>${quoteLoading || currentQuote ? `<p class="quote">${quoteLoading ? 'Loading today’s quote…' : `“${currentQuote}”${quoteIsDefault ? ' (Default)' : ''}`}</p>` : ''}</section>
    <section class="section-heading compact"><div><p class="kicker">YOUR PROGRESSION</p><h2>Previous progress</h2></div><span class="muted">${state.currentLevel} / 8</span></section>
    <section class="ladder"><div class="ladder-summary"><span>Total training days</span><b>${state.completed}</b></div>${ladderRows}</section>`
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
        <span class="check-figure ${exercise.icon}">${exerciseVisual(exercise.icon, '')}</span>
        <span class="check-copy"><b>${exercise.label}</b>${exerciseDetail}</span>
        <input class="quantity-input" data-quantity="${exercise.id}" type="number" min="0" value="${isLoggedToday ? loggedQuantity : ''}" placeholder="0" aria-label="${exercise.label} count" ${isLoggedToday ? 'disabled' : ''}>
        <button class="small-button add-exercise" data-exercise="${exercise.id}" type="button" ${isLoggedToday ? 'disabled' : ''}>${isLoggedToday ? 'LOGGED' : 'ADD'}</button>
        ${deleteButton}
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

  return `
    <section class="section-heading"><div><p class="kicker">${todayLabel.toUpperCase()}</p><h2>Log your training</h2></div><span class="day-chip">${Object.keys(log).length} EXERCISES</span></section>
    <section class="mission-card"><div class="mission-top"><div><span class="mission-tag">FLEXIBLE DAILY LOG</span><h3>What did you complete?</h3><p>Enter the real count for each exercise. No fixed daily requirement.</p></div><div class="quest-symbol">◈</div></div><div class="checklist">${exerciseList}${customFormMarkup}<button class="small-button add-custom-exercise" id="add-custom-exercise" type="button">ADD EXERCISE</button></div><div class="metrics"><div><b>${state.completed}</b><span>total training days</span></div></div></section>`
}

function renderMissionsTab(mission: typeof missions[number]) {
  return `
    <section class="section-heading"><div><p class="kicker">COMMUNITY MISSION</p><h2>A–Z challenge</h2></div><span class="mission-count">${mission.letter}</span></section>
    <section class="community-card"><div class="letter-badge">${mission.letter}</div><div class="community-copy"><h3>${mission.name}</h3><p>${mission.detail}</p><span class="community-hint">Top safe comment decides next week</span></div><button class="small-button" id="mission-button">${state.missionDone ? 'DONE' : 'LOG'} <span>↗</span></button></section>`
}

function renderProfileTab(level: ReturnType<typeof current>) {
  return `
    <section class="section-heading"><div><p class="kicker">PLAYER PROFILE</p><h2>Hunter status</h2></div></section>
    <section class="mission-card"><div class="profile-stat"><span>Current rank</span><b>Level ${String(state.currentLevel).padStart(2, '0')} · ${level.name}</b></div><div class="profile-stat"><span>Total training days</span><b>${state.completed}</b></div><div class="profile-stat"><span>Progress style</span><b>SELF-PACED</b></div><button class="reset-button" id="reset-progress">RESET LOCAL PROGRESS</button></section>`
}

function render() {
  const level = current()
  const mission = missions[(state.currentLevel - 1) % missions.length]
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
  if (activeTab === 'home') tabContent = renderHomeTab(level, ladderRows)
  if (activeTab === 'today') tabContent = renderTodayTab(log, todayLabel)
  if (activeTab === 'missions') tabContent = renderMissionsTab(mission)
  if (activeTab === 'profile') tabContent = renderProfileTab(level)

  const navItem = (tab: Tab, icon: string, label: string) => `<a class="${activeTab === tab ? 'active' : ''}" data-tab="${tab}" href="#${tab}"><span>${icon}</span>${label}</a>`

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="app-shell">
      <header class="topbar"><div class="brand-mark"><span class="brand-orbit"></span><span>LEVEL<br><b>UP</b></span></div><div class="header-status"><span class="status-dot"></span> ${todayLabel}</div><button class="icon-button" id="profile" aria-label="Open profile">◎</button></header>
      <main id="top">${tabContent}</main>
      <nav class="bottom-nav">${navItem('home', '⌂', 'HOME')}${navItem('today', '◒', "TODAY'S LOG")}${navItem('missions', '✦', 'MISSIONS')}${navItem('profile', '◉', 'PROFILE')}</nav>
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
    const wasNewDay = Object.keys(dayLog).length === 0
    const enteredCount = Math.floor(quantity)
    dayLog[id] = enteredCount
    state.dailyLogs[date] = dayLog
    state.exerciseTotals[id] = (state.exerciseTotals[id] ?? 0) + enteredCount
    if (wasNewDay) {
      state.completed += 1
      state.xp += XP_CONFIG.exercise.dayBonus
    }

    const xpGain = getExerciseXpGain(id) * enteredCount
    const xpText = id === 'run' ? `${enteredCount} km` : `${enteredCount} reps`
    state.xp += xpGain
    state.lastDecayDate = date
    syncLevelFromXp()
    save(); render(); showToast(`${xpText} logged · +${xpGain.toFixed(1)} XP`)
  }))
  document.querySelector('#quote-tags')?.addEventListener('toggle', (event) => { tagDropdownOpen = (event.target as HTMLDetailsElement).open })
  document.querySelectorAll<HTMLInputElement>('.tag-options input[data-tag]').forEach((checkbox) => checkbox.addEventListener('change', () => {
    selectedTags = Array.from(document.querySelectorAll<HTMLInputElement>('.tag-options input[data-tag]:checked')).map((input) => input.dataset.tag as string)
    tagDropdownOpen = true
    saveTags()
    render()
  }))
  document.querySelector('#generate-quote')?.addEventListener('click', () => loadQuote())

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

  document.querySelector('#mission-button')?.addEventListener('click', () => { state.missionDone = !state.missionDone; state.xp = Math.max(0, state.xp + (state.missionDone ? 35 : -20)); syncLevelFromXp(); save(); render(); showToast(state.missionDone ? 'A–Z mission logged · +35 XP' : 'A–Z mission removed') })
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

    state = { completed: 0, missionDone: false, xp: 0, currentLevel: 1, exerciseTotals: { push: 0, run: 0 }, dailyLogs: {}, customExercises: [], lastDecayDate: undefined }
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