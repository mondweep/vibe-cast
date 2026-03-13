import type { LyricsLine, WordBreakdown } from '../../../shared/types/database.types';

const TRANSLATE_API_URL = '/api/translate';

interface TranslateRequest {
  sanskrit_text: string;
  context?: string;
}

interface TranslateResponse {
  devanagari: string;
  iast: string;
  english_literal: string;
  english_poetic: string;
  explanation: string;
  words: WordBreakdown[];
}

/**
 * Translate a Sanskrit line to English using Claude API (via backend proxy).
 */
export async function translateLine(text: string, context?: string): Promise<TranslateResponse> {
  const response = await fetch(TRANSLATE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sanskrit_text: text, context } satisfies TranslateRequest),
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Translate a full song's lyrics (batch mode for caching).
 */
export async function translateSong(
  lines: { text: string; start_time: number; end_time: number }[],
  songTitle?: string,
): Promise<LyricsLine[]> {
  const response = await fetch(`${TRANSLATE_API_URL}/song`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines, title: songTitle }),
  });

  if (!response.ok) {
    throw new Error(`Song translation failed: ${response.statusText}`);
  }

  return response.json();
}
