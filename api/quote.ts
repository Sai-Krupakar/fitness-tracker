import type { VercelRequest, VercelResponse } from '@vercel/node'

// Keeps the Gemini API key server-side; the browser and APK never see it.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // the packaged Android app calls this from a different origin (capacitor://localhost)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'GEMINI_API_KEY is not configured' }); return }

  const tagsParam = typeof req.query.tags === 'string' ? req.query.tags : ''
  const tags = tagsParam.split('|').map((tag) => tag.trim()).filter(Boolean)
  const topics = tags.length ? tags.join(', ') : 'motivational, inspirational'

  const prompt = `Write one short, original, uplifting fitness quote (max 20 words) about: ${topics}. Respond with only the quote text, no author, no quotation marks, no extra commentary.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    )
    if (!response.ok) {
      // surfaced temporarily to diagnose upstream failures; does not include the API key
      const detail = await response.text()
      res.status(502).json({ error: 'Gemini request failed', status: response.status, detail })
      return
    }
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^["“]|["”]$/g, '')
    if (!text) { res.status(502).json({ error: 'Empty Gemini response' }); return }
    res.status(200).json({ text })
  } catch {
    res.status(502).json({ error: 'Gemini request errored' })
  }
}
