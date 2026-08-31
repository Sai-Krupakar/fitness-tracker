import type { VercelRequest, VercelResponse } from '@vercel/node'

const buildPrompt = (topics: string, wantsAttribution: boolean) => {
  const topicRule = topics.includes('exercise')
    ? 'Exercise may be mentioned when it naturally fits the selected topics.'
    : 'Do not mention exercise, fitness, training, workouts, reps, gyms, strength, or athletic performance.'
  const formatRule = wantsAttribution
    ? 'Use a real quote by a real famous writer, philosopher, or historical figure. Respond only as "Quote text - Author Name".'
    : 'Write one original uplifting quote with no more than 20 words. Respond only with the quote text, without quotation marks or an author.'
  return `${formatRule} Write exclusively about these selected topics: ${topics}. ${topicRule} Do not introduce unrelated themes or commentary.`
}

async function fetchGemini(apiKey: string, topics: string, wantsAttribution: boolean): Promise<string> {
  const prompt = buildPrompt(topics, wantsAttribution)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  )
  if (!response.ok) throw new Error('Gemini request failed')
  const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^["“]|["”]$/g, '')
  if (!text) throw new Error('Empty Gemini response')
  return text
}

async function fetchGroq(apiKey: string, topics: string, wantsAttribution: boolean): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'groq/compound-mini',
      messages: [{ role: 'user', content: buildPrompt(topics, wantsAttribution) }],
      temperature: 0.9,
    }),
  })
  if (!response.ok) throw new Error('Groq request failed')
  const data = await response.json() as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content?.trim().replace(/^['"“]|['"”]$/g, '')
  if (!text) throw new Error('Empty Groq response')
  return text
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // the packaged Android app calls this from a different origin (capacitor://localhost)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  const tagsParam = typeof req.query.tags === 'string' ? req.query.tags : ''
  const tags = tagsParam.split('|').map((tag) => tag.trim()).filter((tag) => /^[a-z-]+$/.test(tag))
  const topics = tags.length ? tags.map((tag) => tag.replaceAll('-', ' ')).join(', ') : 'motivational, inspirational'
  const wantsAttribution = req.query.attributed === 'true'

  try {
    const groqKey = process.env.GROQ_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY
    if (!groqKey && !geminiKey) {
      res.status(503).json({ error: 'No quote provider is configured' })
      return
    }
    const text = groqKey
      ? await fetchGroq(groqKey, topics, wantsAttribution)
      : await fetchGemini(geminiKey!, topics, wantsAttribution)
    res.status(200).json({ text })
  } catch (error) {
    console.error('Quote generation failed', error)
    res.status(502).json({ error: 'Quote generation failed' })
  }
}

