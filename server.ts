import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

import { transcribeAudio } from './api/routes/transcribe.js'
import {
  translateSanskritLyrics,
  translateSanskritLyricsWithConfidence,
  translateSingleLine,
  translateSingleLyricsLine,
  splitSanskrit,
} from './api/routes/translate.js'
import { verifySong, unverifySong } from './api/routes/songs.js'
import { recordConsent, trackProfile } from './api/routes/consent.js'

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

    // Confidence-aware: passes high+medium to Claude, leaves low untranslated
    // with translation_pending=true so the UI can offer "Translate anyway?".
    // If the caller (older clients, captions branch) didn't send confidence
    // fields, every line defaults to 'high' and behaviour matches the
    // pre-confidence pipeline.
    console.log(`Translating song ${title || 'unknown'} with ${lines.length} lines...`)
    const result = await translateSanskritLyricsWithConfidence(
      lines.map((l: any) => ({
        text: l.text,
        start_time: l.start_time,
        end_time: l.end_time,
        confidence: l.confidence,
        confidence_reason: l.confidence_reason,
      }))
    )
    res.json(result)
  } catch (err) {
    console.error('Song translation error:', err)
    res.status(500).json({ error: 'Song translation failed' })
  }
})

// On-demand translate of a single low-confidence line. Used by the UI's
// "Translate anyway" button on the TranslationPanel when the auto-pipeline
// skipped this line because of low confidence.
app.post('/api/translate/single-line', async (req, res) => {
  try {
    const { text, start_time, end_time } = req.body
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text required' })
    }
    const line = await translateSingleLyricsLine(
      text,
      typeof start_time === 'number' ? start_time : 0,
      typeof end_time === 'number' ? end_time : 5
    )
    res.json(line)
  } catch (err) {
    console.error('Single-line translation error:', err)
    res.status(500).json({ error: 'Single-line translation failed' })
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
    // Choice of player-client is a moving target — YouTube periodically
    // changes which clients are scrapeable. Current state:
    //
    //  - With cookies (YOUTUBE_COOKIES set, typical on cloud hosts):
    //    `web` and `web_safari` USED to work but as of late 2024/early 2025
    //    YouTube is forcing SABR streaming on these clients, which strips
    //    the direct media URL (HTTP 403 on download). `tv_embedded` and
    //    `web_creator` are current favourites that accept cookies AND still
    //    yield direct URLs. We list both as fallbacks so yt-dlp tries them
    //    in order.
    //  - Without cookies (local dev, residential IP): the `android` client
    //    avoids the n-challenge / PO-Token requirement, though it silently
    //    ignores any cookies that might be present.
    //
    // Format 18 (mp4 360p with AAC audio) is small and reliably available;
    // -x extracts it to mp3.
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    const cookiesArg = COOKIES_AVAILABLE ? `--cookies "${COOKIES_FILE}"` : ''
    const playerClient = COOKIES_AVAILABLE
      ? 'tv_embedded,web_creator,web_safari,web'
      : 'android'
    // --max-filesize caps the source download (format 18 mp4). Groq Whisper
    // accepts uploads up to 25 MB; format 18's ~189 kbps bitrate means a
    // 25 MB cap covers recordings up to roughly 18 minutes — adequate for
    // multi-shloka prayer compilations. After extraction to mp3 the file
    // typically halves in size.
    const ytDlpCmd = `yt-dlp ${cookiesArg} --user-agent "${userAgent}" --referer "https://www.google.com/" --extractor-args "youtube:player-client=${playerClient}" -f 18 -x --audio-format mp3 --max-filesize 25M -o "${tempFile}" "https://www.youtube.com/watch?v=${actualVideoId}"`

    console.log(`Executing yt-dlp for ${actualVideoId}...`)
    await execPromise(ytDlpCmd)

    if (!fs.existsSync(tempFile)) {
      throw new Error('Audio extraction failed: File not found')
    }

    const audioBuffer = fs.readFileSync(tempFile)
    const result = await transcribeAudio(audioBuffer, whisperLanguage)

    // Cleanup
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)

    // Honest-failure path: if Whisper + filter produced almost nothing
    // *trustable* (high or medium confidence), refuse rather than send the
    // downstream translator a payload that's mostly low-confidence noise.
    // We still want a few solid lines as anchors even if the rest of the
    // transcript is flagged low.
    const trustable = (result.segments || []).filter(
      (s) => s.confidence === 'high' || s.confidence === 'medium'
    )
    if (trustable.length < MIN_USABLE_SEGMENTS) {
      return res.status(422).json({
        error:
          'Could not reliably transcribe this audio. ' +
          'Try a clearer recording, a different video, or call /api/transcribe ' +
          `again with {"language":"${whisperLanguage === 'sa' ? 'hi' : 'sa'}"}.`,
        usableSegments: trustable.length,
        totalSegments: result.segments?.length ?? 0,
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

// --- Verified Library curation routes ---
// Both require an Authorization: Bearer <Supabase JWT> header. The curator
// allowlist + RLS enforce that only mondweep@gmail.com / mondweep@dxsure.uk
// can mutate. Anonymous reads of verified songs go directly to Supabase from
// the frontend (using the anon key), bypassing this server entirely.

function getJwt(req: express.Request): string | null {
  const h = req.headers.authorization
  if (!h || !h.startsWith('Bearer ')) return null
  return h.slice(7)
}

app.post('/api/songs/verify', async (req, res) => {
  const jwt = getJwt(req)
  if (!jwt) return res.status(401).json({ error: 'Authorization Bearer token required' })
  try {
    const result = await verifySong(jwt, req.body)
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verify failed'
    const code = msg.includes('not authorised') || msg.includes('Invalid auth') ? 403 : 500
    res.status(code).json({ error: msg })
  }
})

app.post('/api/songs/unverify', async (req, res) => {
  const jwt = getJwt(req)
  if (!jwt) return res.status(401).json({ error: 'Authorization Bearer token required' })
  try {
    const { videoId } = req.body || {}
    if (!videoId) return res.status(400).json({ error: 'videoId required' })
    const result = await unverifySong(jwt, videoId)
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unverify failed'
    const code = msg.includes('not authorised') || msg.includes('Invalid auth') ? 403 : 500
    res.status(code).json({ error: msg })
  }
})

// --- Consent + profile tracking ---
// Behind a trust proxy so x-forwarded-for is honoured on Railway.
app.set('trust proxy', true)

function clientIp(req: express.Request): string | null {
  const fwd = (req.headers['x-forwarded-for'] || '').toString()
  if (fwd) return fwd.split(',')[0].trim()
  return req.ip || null
}

// Open to anonymous visitors — anyone can record their consent click.
app.post('/api/consent', async (req, res) => {
  try {
    const result = await recordConsent({
      jwt: getJwt(req),
      body: req.body || {},
      ip: clientIp(req),
      userAgent: req.headers['user-agent']?.toString() || null,
    })
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Consent failed' })
  }
})

// Auth required. Looks up the caller's IP, captures geo, writes onto profile.
app.post('/api/profile/track', async (req, res) => {
  const jwt = getJwt(req)
  if (!jwt) return res.status(401).json({ error: 'Authorization Bearer token required' })
  try {
    const result = await trackProfile({ jwt, ip: clientIp(req) })
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Profile track failed'
    const code = msg.includes('Invalid auth') ? 403 : 500
    res.status(code).json({ error: msg })
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
