// Audio transcription route
// Uses Whisper API for Sanskrit speech-to-text
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'

const WHISPER_API_URL = process.env.WHISPER_API_URL || 'https://api.groq.com/openai/v1/audio/transcriptions'

const anthropic = new Anthropic()
const VALIDATOR_MODEL = 'claude-haiku-4-5-20251001'

export interface TranscriptionResult {
  text: string
  segments: {
    start: number
    end: number
    text: string
  }[]
  language: string
}

/**
 * Reject Whisper segments that are clearly not Sanskrit/Hindi content.
 *
 * Whisper-large-v3-turbo on noisy or instrumental audio routinely emits:
 *   - CJK / Hangul / Cyrillic / Arabic characters (language drift hallucinations)
 *   - Stock filler phrases ("Subtitles by", "Thanks for watching", "Music")
 *   - One- or two-character debris ("...", "you", "Bye")
 *
 * We drop those rather than passing them downstream, because the translation
 * prompt rightly refuses to translate garbage and we MUST NOT invent lyrics
 * to fill the gap.
 */
const HALLUCINATION_PATTERNS: RegExp[] = [
  /^\s*subtitles?\b/i,
  /\bcaptions?\s+by\b/i,
  /\bsubtitles?\s+by\b/i,
  /\btranscribed\s+by\b/i,
  /\btranslated\s+by\b/i,
  /^\s*thanks?\s+(?:for|to)\s+watching/i,
  /^\s*(?:please\s+)?(?:like\s+and\s+)?subscribe\b/i,
  /^\s*\[?\s*music\s*\]?\s*$/i,
  /^\s*\[?\s*applause\s*\]?\s*$/i,
  /^\s*\[?\s*laughter\s*\]?\s*$/i,
  /^\s*credit[s]?\s*$/i,
  /^\s*you\s*$/i,
  /^\s*bye\.?\s*$/i,
  /^\s*thank\s+you\.?\s*$/i,
  /^\s*\.{2,}\s*$/,
]

// Unicode blocks that should not appear inside Sanskrit/Hindi transcription.
// Devanagari is U+0900–U+097F; Latin (Basic + Supplements) is fine for romanized
// Whisper output. Anything outside those ranges is a language-drift hallucination.
const FOREIGN_SCRIPT_RE =
  /[Ѐ-ӿԀ-ԯ԰-֏֐-׿؀-ۿ܀-ݏݐ-ݿ฀-๿ᄀ-ᇿ぀-ゟ゠-ヿ㐀-䶿一-鿿가-힯豈-﫿]/

const DEVANAGARI_RE = /[ऀ-ॿ]/

// Common English function words. Real romanized Sanskrit contains essentially
// none of these — they're a strong signal that Whisper drifted into English.
const ENGLISH_STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','in','on','at','of','to','for','with',
  'by','from','as','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','this','that','these','those','what','which','who','whom','whose',
  'when','where','why','how','i','you','he','she','it','we','they','me','him','her',
  'us','them','my','your','his','its','our','their','not','no','can','could','would',
  'will','should','may','might','must','shall','about','after','again','all','any',
  'also','because','before','below','between','both','during','each','few','further',
  'here','just','more','most','only','other','out','over','own','same','so','some',
  'such','than','too','very','like','through','up','down','into','off','first',
  'second','third','last','one','two','three','got','told','said','share','well',
  'except','time','arrange','catch','tag','quiet','tube','watch',
])

// Common English content words that Whisper emits as noise on instrumental /
// noisy audio. These almost never appear in a legitimate Sanskrit transliteration.
const ENGLISH_NOISE_WORDS = new Set([
  'speaker','radar','connection','disjektivir','language','support','video','captions',
  'subtitles','events','specialist','incarnation','commencement','translation',
  'translated','transcribed','english','sanskrit','hindi','vertical','horizontal',
  'instructions','linear','terms','weed','cleaver','pot','inhabitants','volunteer',
  'republic','river','grave','minds','margaret','philippine','borneo','oman',
  'parliamentary','symbolically','compressive','cinnamon','word','words','please',
  'welcome','goodbye','music','credit','credits','whisper','initially','manic',
  'actually','channel','century','circle',
  // Observed Whisper noise on rock/instrumental tracks
  'trumpets','cancer','together','deep','ethem','canvas','cmoly','rumors','origin',
  'sub','pod','west','east','north','south','captioned','captioning','disjektive',
  'cushant','arrange','unquote','specialist','events','parliamentary','vedic',
  'chants','poblus','namate','symbolically','compressive','cinnamon','tits','nones',
])

function tokensOf(t: string): string[] {
  return (t.toLowerCase().match(/[a-zÀ-ɏ]+/g) || [])
}

function looksLikeSanskritOrHindi(text: string): boolean {
  const t = (text || '').trim()
  if (t.length < 3) return false
  if (FOREIGN_SCRIPT_RE.test(t)) return false
  for (const pat of HALLUCINATION_PATTERNS) {
    if (pat.test(t)) return false
  }
  // Require at least 4 alphabetic characters (Latin OR Devanagari).
  // Otherwise it's just punctuation, digits, or whitespace.
  const alpha = t.replace(/[^a-zA-Zऀ-ॿÀ-ɏ]/g, '')
  if (alpha.length < 4) return false
  if (alpha.length / t.length < 0.4) return false

  // Segments containing Devanagari are unconditionally accepted — that's the
  // shape we want, and Whisper isn't going to invent Devanagari glyphs.
  if (DEVANAGARI_RE.test(t)) return true

  // Pure-romanized branch — be strict. We want Sanskrit-shaped tokens, not
  // English prose. Any English function word or known noise word is a hard
  // reject; we'd rather drop a real Sanskrit line than translate "Speaker 2".
  const tokens = tokensOf(t)
  if (tokens.length === 0) return false
  for (const tok of tokens) {
    if (tok.length === 1) return false // "T trumpets cancer together." → reject
    if (ENGLISH_STOPWORDS.has(tok)) return false
    if (ENGLISH_NOISE_WORDS.has(tok)) return false
  }
  // Require at least one long-ish token (Sanskrit transliterations are
  // typically compound and run 5+ letters).
  const longTokens = tokens.filter((x) => x.length >= 5)
  if (longTokens.length === 0) return false

  return true
}

/**
 * Second-pass validator: ask Claude to classify each segment as Sanskrit-or-not.
 *
 * Heuristics above catch the obvious garbage (foreign scripts, English stopwords,
 * single-letter tokens). Whisper still occasionally drifts into English content
 * words we haven't enumerated ("Public promotion", "Highway 3"). Claude knows what
 * romanized Sanskrit looks like and can keep/reject without inventing content.
 *
 * IMPORTANT: This function only KEEPS or DROPS segments. It does not edit,
 * transliterate, or correct text — that would risk hallucination.
 */
async function classifySegmentsWithClaude(
  segments: { start: number; end: number; text: string }[]
): Promise<{ start: number; end: number; text: string }[]> {
  if (segments.length === 0) return []
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[transcribe] ANTHROPIC_API_KEY not set; skipping Claude validation pass')
    return segments
  }

  const numbered = segments.map((s, i) => `${i}: ${s.text.trim()}`).join('\n')

  const message = await anthropic.messages.create({
    model: VALIDATOR_MODEL,
    max_tokens: 512,
    system:
      'You validate Whisper speech-to-text output from a Sanskrit song. ' +
      'For each numbered segment, decide if it is recognizable Sanskrit content ' +
      '— either Devanagari script, or a phonetic Latin romanization of real ' +
      'Sanskrit words (e.g. "kalabhairavam bhaje", "śivāya namaḥ", "Yam Yam Yak Salom Pam"). ' +
      'REJECT segments that are: English prose, partial English/Sanskrit mixtures, ' +
      'gibberish, or words from other languages. Be CONSERVATIVE: when in doubt, reject. ' +
      'Do NOT translate, transliterate, or correct anything — only classify. ' +
      'Respond with ONLY a JSON array of integer indices to KEEP, e.g. [0,2,3]. No other text.',
    messages: [{ role: 'user', content: `Segments to validate:\n${numbered}` }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return segments

  const match = content.text.match(/\[[\s\S]*?\]/)
  if (!match) {
    console.warn('[transcribe] validator returned non-JSON; keeping all heuristic-passed segments')
    return segments
  }

  let keepIndices: number[]
  try {
    keepIndices = JSON.parse(match[0])
    if (!Array.isArray(keepIndices)) throw new Error('not an array')
  } catch (e) {
    console.warn('[transcribe] validator parse failed; keeping all heuristic-passed segments')
    return segments
  }

  const keep = new Set(keepIndices.filter((n) => Number.isInteger(n) && n >= 0 && n < segments.length))
  const result = segments.filter((_, i) => keep.has(i))
  const dropped = segments.length - result.length
  if (dropped > 0) {
    console.log(`[transcribe] Claude validator dropped ${dropped}/${segments.length} additional segments`)
  }
  return result
}

export async function transcribeAudio(
  audioInput: ArrayBuffer | Buffer,
  language: string = 'sa' // ISO 639-1: 'sa' (Sanskrit) or 'hi' (Hindi); 'hi' often
                          // yields cleaner Devanagari for Sanskrit stotras because
                          // Whisper has far more Hindi training data.
): Promise<TranscriptionResult> {
  const formData = new FormData()

  const blob = new Blob([audioInput as any], { type: 'audio/webm' })
  formData.append('file', blob, 'audio.webm')
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('language', language)
  formData.append('response_format', 'verbose_json')
  formData.append(
    'prompt',
    'Transcribe the Sanskrit audio accurately, preserving Devanagari script. Focus on Vedic chants or classical Sanskrit stotras.'
  )

  const response = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.statusText}`)
  }

  const data = await response.json()

  const rawSegments: { start: number; end: number; text: string }[] = (data.segments || []).map(
    (seg: any) => ({ start: seg.start, end: seg.end, text: seg.text })
  )

  const heuristicPassed = rawSegments.filter((s) => looksLikeSanskritOrHindi(s.text))

  const heuristicDropped = rawSegments.length - heuristicPassed.length
  if (heuristicDropped > 0) {
    console.log(
      `[transcribe] heuristic filter dropped ${heuristicDropped}/${rawSegments.length} segments`
    )
  }

  // Second-pass: ask Claude to classify what survived the heuristic. Cheap,
  // and removes the whack-a-mole of enumerating Whisper's English noise words.
  let validatedSegments = heuristicPassed
  try {
    validatedSegments = await classifySegmentsWithClaude(heuristicPassed)
  } catch (err) {
    console.warn(
      '[transcribe] Claude validator failed; falling back to heuristic-only output:',
      err instanceof Error ? err.message : err
    )
  }

  return {
    text: validatedSegments.map((s) => s.text.trim()).join(' '),
    segments: validatedSegments,
    language: data.language,
  }
}

// Fetch YouTube auto-generated captions as fallback
export async function fetchYouTubeCaptions(videoId: string): Promise<TranscriptionResult | null> {
  try {
    // YouTube timedtext API (unofficial but widely used)
    const response = await fetch(
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=sa&fmt=json3`
    )

    if (!response.ok) {
      // Try Hindi captions as fallback (many Sanskrit songs have Hindi captions)
      const hindiFallback = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=hi&fmt=json3`
      )
      if (!hindiFallback.ok) return null
      const data = await hindiFallback.json()
      return parseTimedText(data)
    }

    const data = await response.json()
    return parseTimedText(data)
  } catch {
    return null
  }
}

function parseTimedText(data: any): TranscriptionResult {
  const events = data.events || []
  const segments = events
    .filter((e: any) => e.segs)
    .map((e: any) => ({
      start: (e.tStartMs || 0) / 1000,
      end: ((e.tStartMs || 0) + (e.dDurationMs || 3000)) / 1000,
      text: e.segs.map((s: any) => s.utf8).join(''),
    }))

  return {
    text: segments.map((s: any) => s.text).join(' '),
    segments,
    language: 'sa',
  }
}
