import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

import { transcribeAudio } from './api/routes/transcribe.js'
import { translateSanskritLyrics, translateSingleLine, splitSanskrit } from './api/routes/translate.js'

const execPromise = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Write the YouTube cookies file once at startup.
//
// YouTube aggressively bot-blocks data-center IPs (Railway, AWS, GCP, etc.)
// with "Sign in to confirm you're not a bot" challenges. Passing a logged-in
// browser's cookies via --cookies bypasses this. Set YOUTUBE_COOKIES on
// Railway to the entire Netscape-format cookies.txt content (export with the
// 'Get cookies.txt LOCALLY' Chrome extension from a logged-in youtube.com tab).
const COOKIES_FILE = '/tmp/yt-cookies.txt'
let COOKIES_AVAILABLE = false
if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.writeFileSync(COOKIES_FILE, process.env.YOUTUBE_COOKIES, { mode: 0o600 })
    COOKIES_AVAILABLE = true
    console.log(`Wrote YouTube cookies file (${process.env.YOUTUBE_COOKIES.length} bytes) to ${COOKIES_FILE}`)
  } catch (e) {
    console.error('Failed to write YouTube cookies file:', e)
  }
} else {
  console.warn(
    'YOUTUBE_COOKIES env var not set — yt-dlp will likely be bot-blocked on cloud hosts. ' +
    'Export cookies from a logged-in youtube.com session and set the env var to enable transcription.'
  )
}

// Hand-curated lyrics that bypass the transcribe pipeline. Add entries here
// only when you have verified Devanagari + accurate timestamps for the full
// song from a trusted source. Sparse fallbacks (a handful of lines covering
// 20% of the runtime) are worse than letting the live pipeline transcribe,
// because they produce a working-but-sync-broken UX.
const FALLBACK_LYRICS: Record<string, any> = {}

// --- API Routes ---

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// YouTube captions proxy (internal fetcher)
app.get('/api/youtube/captions/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params
    console.log(`Attempting caption fetch for ${videoId}...`)
    
    const fetchWithLang = async (lang: string) => {
      const response = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.events) return data
      }
      return null
    }

    let data = await fetchWithLang('sa') 
    if (!data) data = await fetchWithLang('hi')
    if (!data) data = await fetchWithLang('en')

    if (!data) {
      console.log(`No captions found for ${videoId}.`)
      return res.json([])
    }

    const events = (data.events || []) as Array<any>
    const lines = events
      .filter((e) => e.segs)
      .map((e) => ({
        text: (e.segs || []).map((s: any) => s.utf8).join(''),
        start_time: (e.tStartMs || 0) / 1000,
        end_time: ((e.tStartMs || 0) + (e.dDurationMs || 3000)) / 1000,
      }))

    console.log(`Successfully fetched ${lines.length} caption lines.`)
    res.json([{ lines, language: 'sa' }])
  } catch (err) {
    console.error('Caption fetch error:', err)
    res.json([])
  }
})

// Translation endpoints
app.post('/api/translate', async (req, res) => {
  try {
    const { sanskrit_text, context, videoId } = req.body
    
    if (videoId) {
      if (FALLBACK_LYRICS[videoId]) {
        return res.json({ lines: FALLBACK_LYRICS[videoId].segments })
      }
      return res.status(404).json({ error: 'Song not recognized' })
    }

    if (!sanskrit_text) {
      return res.status(400).json({ error: 'sanskrit_text required' })
    }

    const result = await translateSanskritLyrics(sanskrit_text, context)
    res.json({ lines: result }) // Frontend expects { lines: [...] } or direct array?
  } catch (err) {
    console.error('Translation error:', err)
    res.status(500).json({ error: 'Translation failed' })
  }
})

app.post('/api/translate/song', async (req, res) => {
  try {
    const { lines, title } = req.body
    if (!lines || !Array.isArray(lines)) {
      return res.status(400).json({ error: 'lines required' })
    }
    
    const lyricsString = lines.map((l: any) => l.text).join('\n')
    const timestamps = lines.map((l: any) => ({ start: l.start_time, end: l.end_time }))
    
    console.log(`Translating song ${title || 'unknown'} with ${lines.length} lines...`)
    const result = await translateSanskritLyrics(lyricsString, timestamps)
    res.json(result)
  } catch (err) {
    console.error('Song translation error:', err)
    res.status(500).json({ error: 'Song translation failed' })
  }
})

app.post('/api/translate/line', async (req, res) => {
  try {
    const { text, mode } = req.body
    const translation = await translateSingleLine(text, mode || 'poetic')
    res.json({ translation })
  } catch (err) {
    console.error('Line translation error:', err)
    res.status(500).json({ error: 'Translation failed' })
  }
})

app.post('/api/sanskrit/split', async (req, res) => {
  try {
    const { text } = req.body
    const words = await splitSanskrit(text)
    res.json(words)
  } catch (err) {
    console.error('Split error:', err)
    res.status(500).json({ error: 'Split failed' })
  }
})

// Transcription route using yt-dlp and Whisper.
// Speech-to-text first: this route is what the frontend uses when a YouTube
// video has no usable captions. We deliberately do NOT hallucinate lyrics —
// the transcribeAudio() helper filters Whisper output, and if too little
// survives we return 422 so the UI can surface an honest error rather than
// invented Sanskrit.
const MIN_USABLE_SEGMENTS = 2

app.post('/api/transcribe', async (req, res) => {
  const isJson = req.get('content-type')?.includes('application/json')
  const { videoId, language } = isJson ? req.body : req.query
  const actualVideoId = videoId || req.body?.videoId
  // Whisper language hint. Defaults to 'sa' (Sanskrit). Pass 'hi' to coax
  // Whisper into emitting Devanagari for Sanskrit stotras — it tends to do
  // better on the Hindi bucket because that's where its training data lives.
  const whisperLanguage = (typeof language === 'string' && language.length === 2)
    ? language
    : 'sa'

  if (!actualVideoId) {
    return res.status(400).json({ error: 'videoId required' })
  }

  const tempFile = path.join(process.cwd(), `temp_${actualVideoId}.mp3`)
  try {
    // Check for hardcoded fallback first
    if (FALLBACK_LYRICS[actualVideoId]) {
      console.log(`Using hardcoded fallback grounding for ${actualVideoId}`)
      return res.json(FALLBACK_LYRICS[actualVideoId])
    }

    // Extract audio using yt-dlp.
    //
    // Two regimes:
    //  - With cookies (YOUTUBE_COOKIES set, typical on cloud hosts): use the
    //    `web` / `web_safari` clients, which DO accept cookies. Cookies
    //    authenticate the session and bypass the "Sign in to confirm you're
    //    not a bot" challenge that fires on data-center IPs, and they also
    //    bypass the n-challenge / PO-Token requirement that originally pushed
    //    us to the android client. The android client SILENTLY IGNORES
    //    cookies, so combining the two cancels both out.
    //  - Without cookies (local dev, residential IP): use the android client
    //    to skip the n-challenge / PO-Token entirely.
    //
    // Format 18 (mp4 360p with AAC audio) is small and reliably available on
    // both clients; -x extracts it to mp3.
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    const cookiesArg = COOKIES_AVAILABLE ? `--cookies "${COOKIES_FILE}"` : ''
    const playerClient = COOKIES_AVAILABLE ? 'web,web_safari' : 'android'
    const ytDlpCmd = `yt-dlp ${cookiesArg} --user-agent "${userAgent}" --referer "https://www.google.com/" --extractor-args "youtube:player-client=${playerClient}" -f 18 -x --audio-format mp3 --max-filesize 12M -o "${tempFile}" "https://www.youtube.com/watch?v=${actualVideoId}"`

    console.log(`Executing yt-dlp for ${actualVideoId}...`)
    await execPromise(ytDlpCmd)

    if (!fs.existsSync(tempFile)) {
      throw new Error('Audio extraction failed: File not found')
    }

    const audioBuffer = fs.readFileSync(tempFile)
    const result = await transcribeAudio(audioBuffer, whisperLanguage)

    // Cleanup
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)

    // Honest-failure path: if Whisper + filter produced almost nothing usable,
    // refuse rather than send the downstream translator a near-empty payload.
    if (!result.segments || result.segments.length < MIN_USABLE_SEGMENTS) {
      return res.status(422).json({
        error:
          'Could not reliably transcribe this audio. ' +
          'Try a clearer recording, a different video, or call /api/transcribe ' +
          `again with {"language":"${whisperLanguage === 'sa' ? 'hi' : 'sa'}"}.`,
        usableSegments: result.segments?.length ?? 0,
        language: result.language,
      })
    }

    res.json(result)
  } catch (err) {
    console.error('Transcription error:', err)
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Transcription failed' })
  }
})

// --- Serve Frontend (production) ---
const distPath = path.join(process.cwd(), 'dist')
app.use(express.static(distPath))

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
