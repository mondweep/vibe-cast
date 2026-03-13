import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check endpoint required by Railway
app.get('/api/health', (req, res) => {
  res.status(200).send({ status: 'ok' })
})

// --- API Routes ---

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const TRANSLATION_SYSTEM_PROMPT = `You are an expert Sanskrit scholar and translator. Given Sanskrit lyrics, provide line-by-line translation.

Output a JSON array where each element has:
{
  "line": number,
  "start_time": number (seconds),
  "end_time": number (seconds),
  "devanagari": "original Sanskrit text",
  "iast": "IAST transliteration",
  "english_literal": "word-for-word translation",
  "english_poetic": "natural English capturing the spirit",
  "explanation": "philosophical/cultural context, source reference",
  "words": [{ "devanagari": "word", "iast": "transliteration", "meaning": "English", "root_dhatu": "root", "grammar": "form" }]
}

Return ONLY the JSON array, no markdown fences.`

// Translate a full song
app.post('/api/translate', async (req, res) => {
  try {
    const { videoId, lyrics, timestamps } = req.body

    let prompt: string
    if (lyrics) {
      prompt = `Translate these Sanskrit lyrics line by line:\n\n${lyrics}`
      if (timestamps) {
        prompt += `\n\nTimestamps: ${JSON.stringify(timestamps)}`
      } else {
        prompt += '\n\nEstimate reasonable timestamps assuming 4-8 seconds per line, starting at 0.'
      }
    } else {
      prompt = `I have a Sanskrit song (YouTube video ID: ${videoId}). Since you may know common Sanskrit songs, provide the lyrics with translation if you recognize it. Otherwise, provide a sample translation structure with a note that real-time transcription is needed.`
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: TRANSLATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      res.status(500).json({ error: 'Unexpected response type' })
      return
    }

    const jsonMatch = content.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      res.status(500).json({ error: 'Could not parse translation', raw: content.text })
      return
    }

    const lines = JSON.parse(jsonMatch[0])
    res.json({ lines })
  } catch (err) {
    console.error('Translation error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Translation failed' })
  }
})

// Translate a single line
app.post('/api/translate/line', async (req, res) => {
  try {
    const { text, mode } = req.body

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Translate this Sanskrit text to English (${mode} mode). Return only the translation.\n\nSanskrit: ${text}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      res.status(500).json({ error: 'Unexpected response type' })
      return
    }

    res.json({ translation: content.text.trim() })
  } catch (err) {
    console.error('Line translation error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Translation failed' })
  }
})

// Sanskrit NLP - sandhi splitting (placeholder for future NLP service)
app.post('/api/sanskrit/split', async (req, res) => {
  try {
    const { text } = req.body

    // Use Claude for sandhi splitting until dedicated NLP service is set up
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Split this Sanskrit text into individual words (sandhi vigraha). For each word provide:
- devanagari: the word in Devanagari
- iast: IAST transliteration
- meaning: English meaning
- root_dhatu: root form
- grammar: grammatical form (e.g., "noun, nominative singular")

Return a JSON array. Text: ${text}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      res.status(500).json({ error: 'Unexpected response type' })
      return
    }

    const jsonMatch = content.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      // Fallback: simple whitespace split
      const words = text.split(/\s+/).filter(Boolean).map((w: string) => ({
        devanagari: w,
        iast: w,
        meaning: '',
      }))
      res.json(words)
      return
    }

    res.json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('Sandhi split error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Split failed' })
  }
})

// YouTube captions proxy
app.get('/api/youtube/captions/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params

    // Try fetching YouTube auto-generated captions
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=sa&fmt=json3`
    )

    if (!response.ok) {
      // Try Hindi as fallback
      const hindiFallback = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=hi&fmt=json3`
      )
      if (!hindiFallback.ok) {
        res.json([]) // No captions available
        return
      }
      const data = await hindiFallback.json()
      res.json(parseCaptions(data))
      return
    }

    const data = await response.json()
    res.json(parseCaptions(data))
  } catch (err) {
    console.error('Caption fetch error:', err)
    res.json([]) // Return empty on error
  }
})

function parseCaptions(data: Record<string, unknown>) {
  const events = (data.events || []) as Array<Record<string, unknown>>
  const lines = events
    .filter((e) => e.segs)
    .map((e) => ({
      text: ((e.segs as Array<Record<string, string>>) || []).map((s) => s.utf8).join(''),
      start_time: ((e.tStartMs as number) || 0) / 1000,
      end_time: (((e.tStartMs as number) || 0) + ((e.dDurationMs as number) || 3000)) / 1000,
    }))

  return [{ lines, language: 'sa' }]
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// --- Serve Frontend (production) ---
const distPath = path.join(process.cwd(), 'dist')
app.use(express.static(distPath))

// SPA fallback: serve index.html for all non-API routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'))
  } else {
    next()
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SanskritSync server running on port ${PORT}`)
})
