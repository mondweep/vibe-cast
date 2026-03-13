import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import { transcribeAudio } from './api/routes/transcribe.js'

const execPromise = promisify(exec)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check endpoint required by Railway - using the one at the end of file instead

// --- API Routes ---

import { translateSanskritLyrics, translateSingleLine, splitSanskrit } from './api/routes/translate.js'

// Translate a full song
app.post('/api/translate', async (req, res) => {
  try {
    const { lyrics, timestamps } = req.body
    if (!lyrics) {
      return res.status(400).json({ error: 'Lyrics required for translation' })
    }

    const lines = await translateSanskritLyrics(lyrics, timestamps)
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
    const translation = await translateSingleLine(text, mode)
    res.json({ translation })
  } catch (err) {
    console.error('Line translation error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Translation failed' })
  }
})

// Sanskrit NLP - sandhi splitting (placeholder for future NLP service)
app.post('/api/sanskrit/split', async (req, res) => {
  try {
    const { text } = req.body
    const words = await splitSanskrit(text)
    res.json(words)
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

// Transcription route using yt-dlp and Whisper
app.post('/api/transcribe', async (req, res) => {
  const { videoId } = req.get('content-type')?.includes('application/json') ? req.body : req.query
  const actualVideoId = videoId || req.body.videoId

  if (!actualVideoId) {
    res.status(400).json({ error: 'videoId required' })
    return
  }

  const tempFile = path.join(process.cwd(), `temp_${actualVideoId}.mp3`)
  try {
    console.log(`Starting transcription for ${actualVideoId}...`)
    // Extract audio using yt-dlp
    // We use a simplified command for speed and reliability
    await execPromise(`yt-dlp -x --audio-format mp3 --max-filesize 15M -o "${tempFile}" "https://www.youtube.com/watch?v=${actualVideoId}"`)
    
    if (!fs.existsSync(tempFile)) {
      throw new Error('Audio extraction failed: File not found')
    }

    const audioBuffer = fs.readFileSync(tempFile)
    const result = await transcribeAudio(audioBuffer)
    
    // Cleanup
    fs.unlinkSync(tempFile)
    
    res.json(result)
  } catch (err) {
    console.error('Transcription error:', err)
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Transcription failed' })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SanskritSync server running on port ${PORT}`)
})
