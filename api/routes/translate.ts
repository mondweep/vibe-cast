import Anthropic from '@anthropic-ai/sdk'
import type { LyricsLine } from '../../src/shared/types/database.types.js'

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
 * Split Sanskrit text into words and provide grammatical info.
 */
export async function splitSanskrit(text: string): Promise<any[]> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
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
