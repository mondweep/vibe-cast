import Anthropic from '@anthropic-ai/sdk'
import type { LyricsLine, TranscriptConfidence } from '../../src/shared/types/database.types.js'

const anthropic = new Anthropic()

const TRANSLATION_SYSTEM_PROMPT = `You are an expert Sanskrit scholar and translator. Given Sanskrit lyrics, provide line-by-line translation.

CRITICAL: DO NOT HALLUCINATE. Only translate the provided text. If no lyrics are provided, or if they appear to be generic placeholders, return an empty array []. DO NOT guess based on the video title or ID unless explicitly asked to 'identify and translate' and you are 100% certain.

Output a JSON array where each element has:
{
  "line": number,
  "start_time": number (seconds),
  "end_time": number (seconds),
  "devanagari": "original Sanskrit text",
  "iast": "IAST transliteration",
  "english_poetic": "natural English capturing the spirit",
  "english_literal": "literal word-for-word translation",
  "explanation": "brief philosophical or grammatical context",
  "words": [
    { "devanagari": "word", "iast": "transliteration", "meaning": "meaning" }
  ]
}

Keep the response concise. Return ONLY the JSON array, no markdown fences.`

function extractAndParseJSON(text: string) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON array found in response')
  }
  
  const jsonStr = text.slice(start, end + 1)
  try {
    return JSON.parse(jsonStr)
  } catch (err) {
    const cleaned = jsonStr
      .replace(/,\s*\]/g, ']')
      .replace(/,\s*\}/g, '}')
    try {
      return JSON.parse(cleaned)
    } catch (innerErr) {
      throw new Error(`JSON parse error: ${innerErr instanceof Error ? innerErr.message : 'Unknown error'}`)
    }
  }
}

export async function translateSanskritLyrics(
  lyrics: string,
  timestamps?: { start: number; end: number }[]
): Promise<LyricsLine[]> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: TRANSLATION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Translate these Sanskrit lyrics line by line. Return a JSON array of line objects.
IMPORTANT: You MUST preserve the provided start_time and end_time for each line in your output.

Lyrics:
${lyrics}

${timestamps ? `Timestamps (seconds): ${JSON.stringify(timestamps)}` : 'Estimate reasonable timestamps assuming 4-8 seconds per line.'}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  return extractAndParseJSON(content.text) as LyricsLine[]
}

/**
 * Confidence-aware variant of translateSanskritLyrics.
 *
 * Translates only the high + medium confidence lines (which is where we trust
 * the transcript enough to spend Anthropic tokens on translation). Low-confidence
 * lines are returned in the output but with empty translation fields and
 * `translation_pending: true` so the UI can render them with a "Translate this
 * anyway?" affordance. This keeps cost roughly where it was before for clean
 * songs while letting the user see every line that Whisper produced.
 */
export interface ConfidenceLine {
  text: string
  start_time: number
  end_time: number
  confidence?: TranscriptConfidence
  confidence_reason?: string
}

export async function translateSanskritLyricsWithConfidence(
  lines: ConfidenceLine[]
): Promise<LyricsLine[]> {
  // Drop low-confidence segments entirely. They turned out to be too noisy in
  // practice — Whisper hallucinations like "In almost a world-condessous kingdom"
  // are not useful to surface to the user even with a warning chip, because
  // they look enough like real sentences that they're misleading. Medium-
  // confidence lines stay in (with an amber disclaimer) because those are
  // usually real Sanskrit that Whisper mis-heard slightly.
  const toTranslate = lines.filter((l) => (l.confidence ?? 'high') !== 'low')
  const droppedLow = lines.length - toTranslate.length

  if (toTranslate.length === 0) return []

  const translated: LyricsLine[] = await translateSanskritLyrics(
    toTranslate.map((l) => l.text).join('\n'),
    toTranslate.map((l) => ({ start: l.start_time, end: l.end_time }))
  )

  // Align translated rows back to the source by closest start_time and attach
  // the confidence label so the UI can render the medium-confidence amber
  // warning band. Claude generally preserves order, but the index-by-time map
  // is defensive.
  const translatedByTime = new Map<number, LyricsLine>()
  for (const t of translated) translatedByTime.set(Math.round(t.start_time * 1000), t)

  const result: LyricsLine[] = []
  for (const l of toTranslate) {
    const key = Math.round(l.start_time * 1000)
    const t = translatedByTime.get(key)
    if (!t) continue // translator dropped this row — skip rather than render empty
    result.push({
      ...t,
      confidence: l.confidence ?? 'high',
      confidence_reason: l.confidence_reason,
      translation_pending: false,
    })
  }

  if (droppedLow > 0) {
    console.log(
      `[translate] dropped ${droppedLow} low-confidence line(s) — too noisy to surface to the user`
    )
  }
  return result
}

export async function translateSingleLine(
  text: string,
  mode: 'literal' | 'poetic'
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Translate this Sanskrit text to English (${mode} mode). Return only the translation, no explanation.

Sanskrit: ${text}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response')
  return content.text.trim()
}

/**
 * Full line translation for a single low-confidence row that the user has
 * opted in to translate. Returns the same shape as translateSanskritLyrics
 * produces per-line so the frontend can patch it in.
 */
export async function translateSingleLyricsLine(
  text: string,
  start_time: number,
  end_time: number
): Promise<LyricsLine> {
  const arr = await translateSanskritLyrics(text, [{ start: start_time, end: end_time }])
  if (arr.length === 0) {
    throw new Error('Translator returned no lines')
  }
  return arr[0]
}

/**
 * Split Sanskrit text into words and provide grammatical info.
 */
export async function splitSanskrit(text: string): Promise<any[]> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    // Long verses (Śāntākāram, Saha-Nāvavatu, multi-clause shlokas) need
    // ~3000+ tokens for the full grammar breakdown. The previous 1024 cap
    // truncated JSON mid-output, dropping the function into the bare-token
    // fallback path which inserts words with empty meanings.
    max_tokens: 4096,
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
    throw new Error('Unexpected response type')
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    // Fallback: simple whitespace split
    return text.split(/\s+/).filter(Boolean).map((w: string) => ({
      devanagari: w,
      iast: w,
      meaning: '',
    }))
  }

  return JSON.parse(jsonMatch[0])
}
