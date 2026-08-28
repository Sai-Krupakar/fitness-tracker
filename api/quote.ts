import type { VercelRequest, VercelResponse } from '@vercel/node'

// Keeps the Gemini API key server-side; the browser and APK never see it.
// zenquotes.io is also called from here (not the client) because it sends
// no CORS headers, which silently blocks browser/WebView fetches to it.

async function fetchGemini(apiKey: string, topics: string, wantsAttribution: boolean): Promise<string> {
  const prompt = wantsAttribution
    ? `Recall one real, well-known quote by a famous writer, philosopher, or historical figure related to: ${topics}. Respond with only "Quote text — Author Name", using the author's correct real name. No extra commentary.`
    : `Write one short, original, uplifting fitness quote (max 20 words) about: ${topics}. Respond with only the quote text, no author, no quotation marks, no extra commentary.`
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

async function fetchZenQuote(): Promise<string> {
  const response = await fetch('https://zenquotes.io/api/random')
  if (!response.ok) throw new Error('zenquotes request failed')
  const data = await response.json() as { q: string; a: string }[]
  if (!data[0]) throw new Error('Empty zenquotes response')
  return `${data[0].q} — ${data[0].a}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // the packaged Android app calls this from a different origin (capacitor://localhost)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  const tagsParam = typeof req.query.tags === 'string' ? req.query.tags : ''
  const tags = tagsParam.split('|').map((tag) => tag.trim()).filter(Boolean)
  const topics = tags.length ? tags.join(', ') : 'motivational, inspirational'
  const wantsAttribution = req.query.attributed === 'true'

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      try {
        const text = await fetchGemini(apiKey, topics, wantsAttribution)
        res.status(200).json({ text })
        return
      } catch { /* fall through to zenquotes below */ }
    }
    const text = await fetchZenQuote()
    res.status(200).json({ text })
  } catch {
    res.status(502).json({ error: 'All quote sources failed' })
  }
}

