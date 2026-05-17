// Audio transcription route
// Uses Whisper API for Sanskrit speech-to-text
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'

const WHISPER_API_URL = process.env.WHISPER_API_URL || 'https://api.groq.com/openai/v1/audio/transcriptions'

const anthropic = new Anthropic()
const VALIDATOR_MODEL = 'claude-haiku-4-5-20251001'

export type TranscriptConfidence = 'high' | 'medium' | 'low'

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  /**
   * How confident we are that this segment is genuine Sanskrit content vs.
   * Whisper noise. We surface this to the UI so users see every transcribed
   * line but understand which ones to trust.
   */
  confidence: TranscriptConfidence
  /** Short human-readable explanation of how the tier was assigned. */
  confidence_reason: string
  /** Whisper's own per-segment average log-prob, if available (negative; closer to 0 = more confident). */
  avg_logprob?: number
}

export interface TranscriptionResult {
  text: string
  segments: TranscriptSegment[]
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

// High-frequency Sanskrit particles, pronouns, deity names, and devotional terms.
//
// These are short or share letter patterns with English words ("me", "no", "tu",
// "ca", "hi", "ram") and were getting mis-scored as English noise. Anything in
// this allowlist is:
//   1. Never counted as a "suspicious" token (cannot demote a line to medium/low).
//   2. Counted as a POSITIVE Sanskrit signal, so a short line like "om iti tu"
//      can pass at high confidence even without long compound tokens.
//
// Lowercased + diacritic-free is intentional — Whisper romanization is
// inconsistent about diacritics, so we match on the bare letters and on the
// IAST form. Add liberally; false positives here are far cheaper than the
// false negatives we got before (real Sanskrit demoted because "om" looked
// suspicious).
const SANSKRIT_ALLOWLIST = new Set([
  // The sacred sound and its variants
  'om', 'oṃ', 'oṁ', 'aum',
  // Common particles
  'iti', 'tu', 'ca', 'vai', 'hi', 'nu', 'ha', 'eva', 'api', 'atha', 'atho',
  'bho', 'he', 'kim', 'kiṃ', 'na', 'no', 'vā',
  // Demonstratives / pronouns
  'sa', 'sā', 'saḥ', 'tat', 'tad', 'tasya', 'tāni', 'yad', 'yat', 'yasya',
  'te', 'me', 'naḥ', 'vaḥ', 'mama', 'tava', 'aham', 'ahaṃ', 'tvam', 'tvaṃ',
  'asau', 'ayam', 'idam', 'eṣa', 'eṣaḥ',
  // Devotional bowing / invocation
  'namo', 'namaḥ', 'namaha', 'namaste', 'svāhā', 'svaha', 'śrī', 'shri', 'sri',
  'jaya', 'jay', 'śivāya', 'shivaya', 'gurave',
  // Common deity / cosmic names (often appear short or repeated in stotras)
  'hari', 'rāma', 'rama', 'ram', 'kṛṣṇa', 'krishna', 'kṛṣṇāya',
  'śiva', 'shiva', 'shiv', 'śaṅkara', 'shankara', 'durgā', 'durga',
  'gaṇeśa', 'ganesha', 'lakṣmī', 'lakshmi', 'sarasvatī', 'saraswati',
  'viṣṇu', 'vishnu', 'brahmā', 'brahma', 'devī', 'devi',
  'nārāyaṇa', 'narayana', 'nārāyaṇāya', 'narayanaya',
  // Frequently sung devotional terms
  'bhaje', 'bhajāmi', 'bhajami', 'bhajeham', 'bhajaami',
  'pāhi', 'pahi', 'rakṣa', 'raksha', 'śaraṇam', 'sharanam', 'śaraṇaṃ',
  'guru', 'gurudev', 'guruve', 'svāmī', 'swami',
  'bhagavān', 'bhagavan', 'bhagavate', 'mahā', 'maha',
  // Vedic/Sanskrit auxiliaries
  'asti', 'bhavati', 'bhavanti', 'bhūta', 'bhuta',
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
  // Latin a-z + Latin Extended-A/B (À-ɏ) + Latin Extended Additional (ḁ-ỿ).
  // The last range covers IAST diacritics like ṃ ṛ ṅ ṇ ṭ ḍ ḥ ṣ that romanized
  // Sanskrit relies on — without it the tokenizer clips them off mid-word.
  return (t.toLowerCase().match(/[a-zÀ-ɏḁ-ỿ]+/g) || [])
}

/**
 * Score a Whisper segment for "is this Sanskrit?" confidence.
 *
 * Returns a verdict object:
 *   - `verdict: 'reject'` — drop this segment entirely. Used only for things
 *     that are obviously not Sanskrit content at all (foreign scripts,
 *     boilerplate "Subtitles by", punctuation-only segments).
 *   - `verdict: 'keep'` — keep the segment with a confidence tier so the UI
 *     can render it with appropriate visual treatment.
 *
 * This is the "score, don't drop" half of the option-2 design: borderline
 * segments are kept and flagged, not silently discarded.
 */
type HeuristicVerdict =
  | { verdict: 'reject'; reason: string }
  | { verdict: 'keep'; confidence: TranscriptConfidence; reason: string }

function scoreSegmentHeuristic(text: string): HeuristicVerdict {
  const t = (text || '').trim()
  if (t.length < 3) return { verdict: 'reject', reason: 'too short (< 3 chars)' }
  if (FOREIGN_SCRIPT_RE.test(t)) {
    return {
      verdict: 'reject',
      reason: 'contains CJK / Hangul / Cyrillic / Arabic — Whisper language-drift hallucination',
    }
  }
  for (const pat of HALLUCINATION_PATTERNS) {
    if (pat.test(t)) {
      return {
        verdict: 'reject',
        reason: `matches Whisper boilerplate pattern "${pat.source}"`,
      }
    }
  }

  // Require at least 4 alphabetic characters (Latin OR Devanagari OR IAST diacritics).
  const alpha = t.replace(/[^a-zA-Zऀ-ॿÀ-ɏḀ-ỿ]/g, '')
  if (alpha.length < 4) return { verdict: 'reject', reason: 'fewer than 4 alphabetic characters' }
  if (alpha.length / t.length < 0.4) {
    return { verdict: 'reject', reason: 'mostly punctuation / digits' }
  }

  // Segments containing Devanagari are HIGH confidence — Whisper doesn't
  // invent Devanagari glyphs, so if we got them, the text is real.
  if (DEVANAGARI_RE.test(t)) {
    return { verdict: 'keep', confidence: 'high', reason: 'contains Devanagari script' }
  }

  // Pure-romanized branch — score rather than reject.
  const tokens = tokensOf(t)
  if (tokens.length === 0) {
    return { verdict: 'reject', reason: 'no tokenizable words' }
  }

  // Strip diacritics for an extra allowlist lookup pass — Whisper is
  // inconsistent about ṃ vs m, ā vs a, ś vs sh, etc. e.g. "narayan" should
  // match "nārāyaṇa" in the allowlist via this normalization.
  const stripDiacritics = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ṃṁṅṇṭḍḥṛṝḷśṣ]/g, (m) => ({
      ṃ: 'm', ṁ: 'm', ṅ: 'n', ṇ: 'n', ṭ: 't', ḍ: 'd', ḥ: '', ṛ: 'r', ṝ: 'r', ḷ: 'l',
      ś: 's', ṣ: 's',
    } as Record<string, string>)[m] ?? m)

  // Count "suspicious" tokens — English stopwords, known noise words, single
  // letters — and "Sanskrit-signal" tokens — allowlist hits + long compounds.
  // Allowlist tokens NEVER count as suspicious, even if they happen to overlap
  // with an English stopword ("me", "no", "tu" all mean something in Sanskrit).
  let suspicious = 0
  let sanskritSignal = 0
  for (const tok of tokens) {
    const normalized = stripDiacritics(tok)
    if (SANSKRIT_ALLOWLIST.has(tok) || SANSKRIT_ALLOWLIST.has(normalized)) {
      sanskritSignal++
      continue
    }
    if (tok.length === 1) suspicious++
    else if (ENGLISH_STOPWORDS.has(tok)) suspicious++
    else if (ENGLISH_NOISE_WORDS.has(tok)) suspicious++
  }

  // Long compound tokens (≥5 chars) are also Sanskrit signal.
  const longTokens = tokens.filter((x) => x.length >= 5)
  sanskritSignal += longTokens.length

  // Decision matrix:
  //   - Lots of suspicious tokens AND no Sanskrit signal → low confidence
  //   - Some suspicious + low Sanskrit signal → medium
  //   - Suspicious outweighed by Sanskrit signal → high
  if (suspicious >= 3 && sanskritSignal === 0) {
    return {
      verdict: 'keep',
      confidence: 'low',
      reason: `${suspicious} English-shaped tokens, no Sanskrit signal`,
    }
  }
  if (suspicious >= 2 && sanskritSignal < suspicious) {
    return {
      verdict: 'keep',
      confidence: 'low',
      reason: `${suspicious} English-shaped tokens outweigh Sanskrit signal (${sanskritSignal})`,
    }
  }
  if (sanskritSignal === 0) {
    return {
      verdict: 'keep',
      confidence: 'medium',
      reason: 'romanized but no Sanskrit signal (no allowlist words or long compounds)',
    }
  }
  if (suspicious >= 1 && sanskritSignal < suspicious * 2) {
    return {
      verdict: 'keep',
      confidence: 'medium',
      reason: `${suspicious} English-shaped token(s) mixed in with ${sanskritSignal} Sanskrit signal`,
    }
  }
  return {
    verdict: 'keep',
    confidence: 'high',
    reason:
      sanskritSignal >= 2
        ? `${sanskritSignal} Sanskrit-shaped tokens, no English noise`
        : 'romanized Sanskrit-shaped tokens',
  }
}

/**
 * Second-pass scorer: ask Claude to rate each kept segment HIGH / MEDIUM / LOW.
 *
 * Heuristics above already rejected obvious garbage (foreign scripts, boilerplate,
 * punctuation-only). What remains is the borderline middle: plausibly Sanskrit,
 * possibly drifted English. Claude rates each one without dropping anything —
 * the UI will show low-confidence lines with a visual warning rather than hide them.
 *
 * IMPORTANT: This function only RATES segments. It never edits, transliterates,
 * or corrects text — that would risk hallucination.
 *
 * If Claude rates a segment differently from the heuristic, we take the more
 * cautious of the two (i.e. min of high → medium → low). That way Claude can
 * only *demote* confidence, never inflate it past what the heuristic saw.
 */
type ClaudeScore = { index: number; confidence: TranscriptConfidence; reason?: string }

async function scoreSegmentsWithClaude(
  segments: TranscriptSegment[]
): Promise<TranscriptSegment[]> {
  if (segments.length === 0) return []
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[transcribe] ANTHROPIC_API_KEY not set; skipping Claude scoring pass')
    return segments
  }

  const numbered = segments.map((s, i) => `${i}: ${s.text.trim()}`).join('\n')

  const message = await anthropic.messages.create({
    model: VALIDATOR_MODEL,
    max_tokens: 1024,
    temperature: 0, // Deterministic scoring.
    system:
      'You rate Whisper speech-to-text output from a Sanskrit song. ' +
      'For each numbered segment, assign a confidence tier:\n' +
      '  - "high": clearly recognizable Sanskrit — Devanagari script, or romanization ' +
      'of obvious Sanskrit vocabulary (e.g. "śivāya namaḥ", "bhajeham bhajeham", ' +
      '"oṃ namo nārāyaṇāya").\n' +
      '  - "medium": plausibly Sanskrit but unfamiliar or slightly garbled — possibly ' +
      'rare compounds, possibly Whisper mis-hearings of real lyrics.\n' +
      '  - "low": looks more like English prose, gibberish, or a non-Indic language ' +
      '— but we still want to show it to the user with a warning.\n' +
      'NEVER drop a segment — every input index must appear in your output. ' +
      'Repetitive lines are EXPECTED in devotional songs (chorus/refrain). ' +
      'Do NOT translate, transliterate, or correct anything — only score. ' +
      'Respond with ONLY a JSON array like ' +
      '[{"index":0,"confidence":"high","reason":"Devanagari"},...]. No other text.',
    messages: [{ role: 'user', content: `Segments to score:\n${numbered}` }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return segments

  const match = content.text.match(/\[[\s\S]*\]/)
  if (!match) {
    console.warn('[transcribe] scorer returned non-JSON; keeping heuristic scores')
    return segments
  }

  let scores: ClaudeScore[]
  try {
    scores = JSON.parse(match[0])
    if (!Array.isArray(scores)) throw new Error('not an array')
  } catch {
    console.warn('[transcribe] scorer parse failed; keeping heuristic scores')
    return segments
  }

  const order: Record<TranscriptConfidence, number> = { high: 3, medium: 2, low: 1 }
  const byIndex = new Map<number, ClaudeScore>()
  for (const s of scores) {
    if (Number.isInteger(s.index) && order[s.confidence]) byIndex.set(s.index, s)
  }

  return segments.map((seg, i) => {
    const claudeScore = byIndex.get(i)
    if (!claudeScore) return seg
    // Take the more cautious of the two confidences. Claude can demote but
    // never promote past what the heuristic saw.
    const merged: TranscriptConfidence =
      order[claudeScore.confidence] < order[seg.confidence] ? claudeScore.confidence : seg.confidence
    const reason =
      merged === claudeScore.confidence && merged !== seg.confidence
        ? `Claude: ${claudeScore.reason || claudeScore.confidence}`
        : seg.confidence_reason
    return { ...seg, confidence: merged, confidence_reason: reason }
  })
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

  const rawSegments: { start: number; end: number; text: string; avg_logprob?: number }[] = (
    data.segments || []
  ).map((seg: any) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text,
    avg_logprob: typeof seg.avg_logprob === 'number' ? seg.avg_logprob : undefined,
  }))

  // First pass: heuristic scoring. Hard-rejects (foreign scripts, boilerplate)
  // are dropped; everything else is kept with a confidence tier.
  const scoredSegments: TranscriptSegment[] = []
  let hardRejected = 0
  for (let i = 0; i < rawSegments.length; i++) {
    const raw = rawSegments[i]
    const verdict = scoreSegmentHeuristic(raw.text)
    if (verdict.verdict === 'reject') {
      hardRejected++
      console.log(
        `[transcribe]   hard-reject #${i} (${verdict.reason}): ${raw.text.trim().slice(0, 120)}`
      )
      continue
    }
    // Demote to 'low' if Whisper's own confidence was very poor. Groq returns
    // avg_logprob ≈ -0.2 for clean speech, ≈ -1.0+ for noisy/uncertain audio.
    let confidence = verdict.confidence
    let reason = verdict.reason
    if (typeof raw.avg_logprob === 'number' && raw.avg_logprob < -1.0 && confidence === 'high') {
      confidence = 'medium'
      reason = `${verdict.reason}; Whisper avg_logprob ${raw.avg_logprob.toFixed(2)} suggests uncertain audio`
    }
    if (typeof raw.avg_logprob === 'number' && raw.avg_logprob < -1.5 && confidence === 'medium') {
      confidence = 'low'
      reason = `${verdict.reason}; Whisper avg_logprob ${raw.avg_logprob.toFixed(2)} (very low)`
    }
    scoredSegments.push({
      start: raw.start,
      end: raw.end,
      text: raw.text,
      confidence,
      confidence_reason: reason,
      avg_logprob: raw.avg_logprob,
    })
  }

  if (hardRejected > 0) {
    console.log(
      `[transcribe] hard-rejected ${hardRejected}/${rawSegments.length} segments (foreign script / boilerplate / too short)`
    )
  }

  // Second pass: Claude scores each survivor. Can only demote confidence,
  // never promote — protects against Claude over-trusting borderline content.
  let finalSegments = scoredSegments
  try {
    finalSegments = await scoreSegmentsWithClaude(scoredSegments)
  } catch (err) {
    console.warn(
      '[transcribe] Claude scorer failed; falling back to heuristic-only scores:',
      err instanceof Error ? err.message : err
    )
  }

  // Summary log so the terminal output is informative.
  const tally = { high: 0, medium: 0, low: 0 }
  for (const s of finalSegments) tally[s.confidence]++
  console.log(
    `[transcribe] confidence breakdown — high: ${tally.high}, medium: ${tally.medium}, low: ${tally.low}` +
      ` (out of ${rawSegments.length} raw Whisper segments)`
  )
  for (const s of finalSegments) {
    if (s.confidence !== 'high') {
      console.log(
        `[transcribe]   ${s.confidence}: ${s.text.trim().slice(0, 120)}  (${s.confidence_reason})`
      )
    }
  }

  return {
    text: finalSegments.map((s) => s.text.trim()).join(' '),
    segments: finalSegments,
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
  const segments: TranscriptSegment[] = events
    .filter((e: any) => e.segs)
    .map((e: any) => ({
      start: (e.tStartMs || 0) / 1000,
      end: ((e.tStartMs || 0) + (e.dDurationMs || 3000)) / 1000,
      text: e.segs.map((s: any) => s.utf8).join(''),
      // YouTube auto-captions are generally well-curated for Hindi/Sanskrit,
      // so we trust them. Curators can downgrade in the verify UI if needed.
      confidence: 'high' as const,
      confidence_reason: 'YouTube auto-caption (uploader-provided or auto-generated)',
    }))

  return {
    text: segments.map((s) => s.text).join(' '),
    segments,
    language: 'sa',
  }
}
