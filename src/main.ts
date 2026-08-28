import './style.css'

type TrainingState = { completed: number; missionDone: boolean; xp: number; currentLevel: number; planMonths: number; exerciseTotals: Record<string, number>; dailyLogs: Record<string, Record<string, number>> }
type Tab = 'home' | 'today' | 'missions' | 'profile'

const quotes: { text: string; tags: string[]; author?: string }[] = [
  { text: 'The iron never lies. Show up, and it shows you who you are becoming.', tags: ['gym', 'motivational'] },
  { text: 'One more rep than yesterday is how champions are built.', tags: ['gym', 'perseverance'] },
  { text: 'The only one who can defeat me is me.', tags: ['motivational', 'courage'] },
  { text: 'Discipline beats motivation.', tags: ['motivational', 'perseverance'] },
  { text: 'Small reps, repeated daily, become strength.', tags: ['perseverance', 'life'] },
  { text: 'You do not rise to the occasion, you fall to your training.', tags: ['motivational', 'success'] },
  { text: 'Every level was once a beginner who refused to quit.', tags: ['inspirational', 'perseverance'] },
  { text: 'The body achieves what the mind believes.', tags: ['inspirational', 'wisdom'] },
  { text: 'Consistency is the real superpower.', tags: ['motivational', 'success'] },
  { text: 'Progress, not perfection.', tags: ['wisdom', 'life'] },
  { text: 'Courage is not the absence of fear, it is training in spite of it.', tags: ['courage', 'inspirational'] },
  { text: 'Happiness follows effort, not the other way around.', tags: ['happiness', 'life'] },
  { text: 'Success is built one honest rep at a time.', tags: ['success', 'motivational'] },
  { text: 'Wisdom is knowing rest is part of training too.', tags: ['wisdom', 'happiness'] },
  { text: 'Love is choosing someone, again, in every ordinary moment.', tags: ['love'] },
  { text: 'A breakup is not the end of your story, only the end of a chapter.', tags: ['breakup', 'sad'] },
  { text: 'It is okay to grieve what you hoped would stay.', tags: ['sad', 'breakup'] },
  { text: 'Loving someone who does not choose you back still taught you how to love.', tags: ['one-side-love', 'sad'] },
  { text: 'Some feelings are meant to be felt, not forced to be returned.', tags: ['one-side-love', 'love'] },
  { text: 'This sadness will not stay forever, even when it feels endless tonight.', tags: ['sad'] },
  { text: 'The unexamined life is not worth living.', tags: ['famous-writers', 'wisdom'], author: 'Socrates' },
  { text: 'It always seems impossible until it is done.', tags: ['famous-writers', 'inspirational'], author: 'Nelson Mandela' },
  { text: 'Whether you think you can, or you think you can not, you are right.', tags: ['famous-writers', 'motivational'], author: 'Henry Ford' },
  { text: 'The only way to do great work is to love what you do.', tags: ['famous-writers', 'success'], author: 'Steve Jobs' },
  { text: 'In the middle of difficulty lies opportunity.', tags: ['famous-writers', 'wisdom'], author: 'Albert Einstein' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', tags: ['famous-writers', 'courage'], author: 'Winston Churchill' },
  { text: 'The way to get started is to quit talking and begin doing.', tags: ['famous-writers', 'motivational'], author: 'Walt Disney' },
  { text: 'Life is what happens to you while you are busy making other plans.', tags: ['famous-writers', 'life'], author: 'John Lennon' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', tags: ['famous-writers', 'inspirational'], author: 'Eleanor Roosevelt' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', tags: ['famous-writers', 'perseverance'], author: 'Confucius' },
  { text: 'Do not go where the path may lead, go instead where there is no path and leave a trail.', tags: ['famous-writers', 'courage'], author: 'Ralph Waldo Emerson' },
  { text: 'Happiness is not something ready made. It comes from your own actions.', tags: ['famous-writers', 'happiness'], author: 'Dalai Lama' },
]

const levels = [
  { name: 'Awakening', rank: '01', push: '20 x 3', squat: '20 x 3', core: '20 x 3', run: '2 km', xp: 120 },
  { name: 'Recruit', rank: '02', push: '22 x 3', squat: '22 x 3', core: '22 x 3', run: '2.5 km', xp: 180 },
  { name: 'Hunter', rank: '03', push: '25 x 3', squat: '25 x 3', core: '25 x 3', run: '3 km', xp: 240 },
  { name: 'Elite', rank: '04', push: '28 x 3', squat: '28 x 3', core: '28 x 3', run: '4 km', xp: 300 },
  { name: 'Commander', rank: '05', push: '30 x 3', squat: '30 x 3', core: '30 x 3', run: '5 km', xp: 380 },
  { name: 'Monarch', rank: '06', push: '25 x 4', squat: '35 x 3', core: '35 x 3', run: '6 km', xp: 470 },
  { name: 'Shadow Monarch', rank: '07', push: '25 x 4', squat: '25 x 4', core: '25 x 4', run: '8 km', xp: 580 },
  { name: 'National Level', rank: '08', push: '100 total', squat: '100 total', core: '100 total', run: '10 km', xp: 720 },
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
  planMonths: oldState.planMonths ?? 12,
  exerciseTotals: oldState.exerciseTotals ?? { push: 0, squat: 0, core: 0, run: 0 },
  dailyLogs: oldState.dailyLogs ?? {},
}
const save = () => localStorage.setItem('level-up-state', JSON.stringify(state))
const current = () => levels[state.currentLevel - 1]
const todayLog = () => state.dailyLogs[todayKey()] ?? {}
const exercises = () => [
  { id: 'push', label: 'Push-ups', icon: 'pushup' },
  { id: 'squat', label: 'Squats', icon: 'squat' },
  { id: 'core', label: 'Core exercise', icon: 'core' },
  { id: 'run', label: 'Run / walk', icon: 'run' },
]

const TAG_OPTIONS = [
  { id: 'gym', label: 'Gym' },
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
let selectedTags: string[] = storedTags ? JSON.parse(storedTags) : ['gym', 'motivational']
const saveTags = () => localStorage.setItem('level-up-quote-tags', JSON.stringify(selectedTags))

let activeTab: Tab = 'home'
let tagDropdownOpen = false
const initialQuote = quotes[Math.floor(Math.random() * quotes.length)]
let currentQuote = initialQuote.author ? `${initialQuote.text} — ${initialQuote.author}` : initialQuote.text
let quoteLoading = false
const pickLocalQuote = () => {
  const tags = selectedTags.length ? selectedTags : ['motivational', 'inspirational']
  const matches = quotes.filter((quote) => quote.tags.some((tag) => tags.includes(tag)))
  const pool = matches.length ? matches : quotes
  let next = pool[Math.floor(Math.random() * pool.length)]
  while (pool.length > 1 && (next.author ? `${next.text} — ${next.author}` : next.text) === currentQuote) next = pool[Math.floor(Math.random() * pool.length)]
  currentQuote = next.author ? `${next.text} — ${next.author}` : next.text
}
async function loadQuote() {
  quoteLoading = true
  render()
  const activeTags = selectedTags.length ? selectedTags : ['motivational', 'inspirational']
  const wantsAuthor = activeTags.includes('famous-writers')
  const promptTags = activeTags.join('|')
  try {
    // famous-writers needs a real attributed quote, which an AI-generated line can't provide
    if (wantsAuthor) throw new Error('skip gemini for attributed quotes')
    // the APK bundles static files locally, so a relative /api path won't reach Vercel —
    // VITE_API_BASE_URL must point at the deployed proxy for mobile builds
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
    const response = await fetch(`${apiBase}/api/quote?tags=${encodeURIComponent(promptTags)}`)
    if (!response.ok) throw new Error('gemini proxy failed')
    const data = await response.json() as { text: string }
    if (!data.text) throw new Error('empty gemini quote')
    currentQuote = data.text
  } catch {
    try {
      // quotable.io is no longer reachable; zenquotes has no topic tags but always returns
      // a real attributed quote, which is exactly what famous-writers needs
      const response = await fetch('https://zenquotes.io/api/random')
      if (!response.ok) throw new Error('zenquotes request failed')
      const data = await response.json() as { q: string; a: string }[]
      if (!data[0]) throw new Error('empty zenquotes response')
      currentQuote = `${data[0].q} — ${data[0].a}`
    } catch {
      // the local tagged list guarantees a quote is always shown, even offline
      pickLocalQuote()
    }
  } finally {
    quoteLoading = false
    render()
  }
}

function exerciseVisual(kind: string, label: string) {
  return `<div class="exercise-tile ${kind}"><div class="figure" aria-hidden="true"><span class="head"></span><span class="torso"></span><span class="arm arm-a"></span><span class="arm arm-b"></span><span class="leg leg-a"></span><span class="leg leg-b"></span></div><span class="exercise-label">${label}</span></div>`
}

function renderHomeTab(level: ReturnType<typeof current>, ladderRows: string) {
  return `
    <section class="hero-panel"><div class="eyebrow"><span class="line"></span> REAL-LIFE TRAINING ARC <span class="line"></span></div><div class="hero-copy"><div><p class="muted">CURRENT RANK · ${state.planMonths}-MONTH PLAN</p><h1>Level ${String(state.currentLevel).padStart(2, '0')}</h1><p class="rank-name">${level.name}</p></div><div class="rank-emblem">${level.rank}<span>RANK</span></div></div><div class="xp-row"><span>TRAINING DAYS ${state.completed}</span><span>SELF-PACED</span></div><div class="xp-track"><span class="open-progress"></span></div><details class="tag-dropdown" id="quote-tags" ${tagDropdownOpen ? 'open' : ''}><summary>Quote topics · ${selectedTags.length} selected</summary><div class="tag-options">${TAG_OPTIONS.map((tag) => `<label class="tag-option"><input type="checkbox" data-tag="${tag.id}" ${selectedTags.includes(tag.id) ? 'checked' : ''}> ${tag.label}</label>`).join('')}</div></details><button class="small-button generate-quote-button" id="generate-quote" ${quoteLoading ? 'disabled' : ''}>${quoteLoading ? 'GENERATING…' : 'GENERATE QUOTE'} <span>↻</span></button><p class="quote">${quoteLoading ? 'Loading today’s quote…' : `“${currentQuote}”`}</p></section>
    <section class="section-heading compact"><div><p class="kicker">YOUR PROGRESSION</p><h2>Previous progress</h2></div><span class="muted">${state.currentLevel} / 8</span></section>
    <section class="ladder"><div class="ladder-summary"><span>Total training days</span><b>${state.completed}</b></div>${ladderRows}</section>`
}

function renderTodayTab(log: Record<string, number>, todayLabel: string) {
  return `
    <section class="section-heading"><div><p class="kicker">${todayLabel.toUpperCase()}</p><h2>Log your training</h2></div><span class="day-chip">${Object.keys(log).length} EXERCISES</span></section>
    <section class="mission-card"><div class="mission-top"><div><span class="mission-tag">FLEXIBLE DAILY LOG</span><h3>What did you complete?</h3><p>Enter the real count for each exercise. No fixed daily requirement.</p></div><div class="quest-symbol">◈</div></div><div class="checklist">${exercises().map((exercise) => `<div class="log-item"><span class="check-figure ${exercise.icon}">${exerciseVisual(exercise.icon, '')}</span><span class="check-copy"><b>${exercise.label}</b><small>Total logged: ${state.exerciseTotals[exercise.id] ?? 0}</small></span><input class="quantity-input" data-quantity="${exercise.id}" type="number" min="0" placeholder="0" aria-label="${exercise.label} count"><button class="small-button add-exercise" data-exercise="${exercise.id}">ADD</button></div>`).join('')}</div><div class="metrics"><div><b>${state.completed}</b><span>total days</span></div><div><b>${Object.keys(log).length}</b><span>today logged</span></div><div><b>${state.xp}</b><span>XP earned</span></div><div><b>ON TRACK</b><span>self-paced plan</span></div></div></section>`
}

function renderMissionsTab(mission: typeof missions[number]) {
  return `
    <section class="section-heading"><div><p class="kicker">COMMUNITY MISSION</p><h2>A–Z challenge</h2></div><span class="mission-count">${mission.letter}</span></section>
    <section class="community-card"><div class="letter-badge">${mission.letter}</div><div class="community-copy"><h3>${mission.name}</h3><p>${mission.detail}</p><span class="community-hint">Top safe comment decides next week</span></div><button class="small-button" id="mission-button">${state.missionDone ? 'DONE' : 'LOG'} <span>↗</span></button></section>`
}

function renderProfileTab(level: ReturnType<typeof current>) {
  return `
    <section class="section-heading"><div><p class="kicker">PLAYER PROFILE</p><h2>Hunter status</h2></div></section>
    <section class="mission-card"><div class="profile-stat"><span>Current rank</span><b>Level ${String(state.currentLevel).padStart(2, '0')} · ${level.name}</b></div><div class="profile-stat"><span>Plan duration</span><select id="plan-duration" aria-label="Plan duration"><option value="1" ${state.planMonths === 1 ? 'selected' : ''}>1 month</option><option value="3" ${state.planMonths === 3 ? 'selected' : ''}>3 months</option><option value="6" ${state.planMonths === 6 ? 'selected' : ''}>6 months</option><option value="9" ${state.planMonths === 9 ? 'selected' : ''}>9 months</option><option value="12" ${state.planMonths === 12 ? 'selected' : ''}>12 months</option></select></div><div class="profile-stat"><span>Total training days</span><b>${state.completed}</b></div><div class="profile-stat"><span>Progress style</span><b>SELF-PACED</b></div><button class="reset-button" id="reset-progress">RESET LOCAL PROGRESS</button></section>`
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
      <nav class="bottom-nav">${navItem('home', '⌂', 'HOME')}${navItem('today', '◒', "TODAY'S PROGRESS")}${navItem('missions', '✦', 'MISSIONS')}${navItem('profile', '◉', 'PROFILE')}</nav>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
    </div>`

  const showToast = (message: string) => { const toast = document.querySelector<HTMLDivElement>('#toast'); if (!toast) { return }; toast.textContent = message; toast.classList.add('visible'); window.setTimeout(() => toast.classList.remove('visible'), 2200) }
  document.querySelectorAll<HTMLButtonElement>('.add-exercise').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.exercise
    const input = document.querySelector<HTMLInputElement>(`[data-quantity="${id}"]`)
    const quantity = Number(input?.value)
    if (!id || !Number.isFinite(quantity) || quantity <= 0) { showToast('Enter a quantity greater than zero'); return }
    const date = todayKey()
    const dayLog = state.dailyLogs[date] ?? {}
    const wasNewDay = Object.keys(dayLog).length === 0
    dayLog[id] = (dayLog[id] ?? 0) + Math.floor(quantity)
    state.dailyLogs[date] = dayLog
    state.exerciseTotals[id] = (state.exerciseTotals[id] ?? 0) + Math.floor(quantity)
    if (wasNewDay) { state.completed += 1; state.xp += 20 }
    save(); render(); showToast(`${Math.floor(quantity)} ${id} logged`)
  }))
  document.querySelector('#quote-tags')?.addEventListener('toggle', (event) => { tagDropdownOpen = (event.target as HTMLDetailsElement).open })
  document.querySelectorAll<HTMLInputElement>('.tag-options input[data-tag]').forEach((checkbox) => checkbox.addEventListener('change', () => {
    selectedTags = Array.from(document.querySelectorAll<HTMLInputElement>('.tag-options input[data-tag]:checked')).map((input) => input.dataset.tag as string)
    tagDropdownOpen = true
    saveTags()
    render()
  }))
  document.querySelector('#generate-quote')?.addEventListener('click', () => loadQuote())
  document.querySelector('#mission-button')?.addEventListener('click', () => { state.missionDone = !state.missionDone; state.xp = Math.max(0, state.xp + (state.missionDone ? 25 : -25)); save(); render(); showToast(state.missionDone ? 'A–Z mission logged · +25 XP' : 'A–Z mission removed') })
  document.querySelector('#profile')?.addEventListener('click', () => { activeTab = 'profile'; render() })
  document.querySelector('#plan-duration')?.addEventListener('change', (event) => { const selectedMonths = Number((event.target as HTMLSelectElement).value); state.planMonths = selectedMonths; save(); render(); showToast(`${selectedMonths}-month plan selected`) })
  document.querySelector('#reset-progress')?.addEventListener('click', () => { state = { completed: 0, missionDone: false, xp: 0, currentLevel: 1, planMonths: 12, exerciseTotals: { push: 0, squat: 0, core: 0, run: 0 }, dailyLogs: {} }; save(); render(); showToast('Progress reset to Level 1') })
  document.querySelectorAll<HTMLAnchorElement>('.bottom-nav a').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault()
    const tab = link.dataset.tab as Tab
    activeTab = tab
    render()
  }))
}
render()