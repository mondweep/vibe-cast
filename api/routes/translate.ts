import Anthropic from '@anthropic-ai/sdk'
import type { LyricsLine } from '../../src/shared/types/database.types'

const anthropic = new Anthropic()

const TRANSLATION_SYSTEM_PROMPT = `You are an expert Sanskrit scholar and translator. Given Sanskrit lyrics (in Devanagari or IAST), provide:

1. Line-by-line translation in both literal and poetic modes
2. Sandhi splitting (compound word decomposition)
3. Word-by-word breakdown with root forms (dhatu)
4. Cultural and philosophical context for each verse
5. Source references (e.g., Bhagavad Gita chapter/verse)

Output JSON matching this schema for each line:
{
  "line": <line_number>,
  "start_time": <seconds>,
  "end_time": <seconds>,
  "devanagari": "<original text>",
  "iast": "<IAST transliteration>",
  "english_literal": "<word-for-word translation>",
  "english_poetic": "<natural English capturing the spirit>",
  "explanation": "<philosophical/cultural context>",
  "words": [
    {
      "devanagari": "<word>",
      "iast": "<transliteration>",
      "meaning": "<English meaning>",
      "root_dhatu": "<root verb/noun>",
      "grammar": "<grammatical form>"
    }
  ]
}`

export async function translateSanskritLyrics(
  lyrics: string,
  timestamps?: { start: number; end: number }[]
): Promise<LyricsLine[]> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: TRANSLATION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Translate these Sanskrit lyrics line by line. Return a JSON array of line objects.

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

  // Extract JSON from response
  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Could not parse translation response')
  }

  return JSON.parse(jsonMatch[0]) as LyricsLine[]
}

export async function translateSingleLine(
  text: string,
  mode: 'literal' | 'poetic'
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
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
