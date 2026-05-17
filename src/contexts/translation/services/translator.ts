import type {
  LyricsLine,
  TranscriptConfidence,
  WordBreakdown,
} from '../../../shared/types/database.types';

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
 * Translate a full song's lyrics. Confidence is passed through so the server
 * can skip translation for low-confidence lines (cheaper, and the UI prefers
 * to mark those lines for opt-in translation instead).
 */
export async function translateSong(
  lines: {
    text: string;
    start_time: number;
    end_time: number;
    confidence?: TranscriptConfidence;
    confidence_reason?: string;
  }[],
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

/**
 * On-demand translate of a single line. Kept available for future use (e.g.
 * if we re-introduce an opt-in "translate this anyway" affordance); not
 * currently called from the UI since low-confidence lines are dropped
 * server-side rather than surfaced for opt-in translation.
 */
export async function translateOneLine(
  text: string,
  start_time: number,
  end_time: number,
): Promise<LyricsLine> {
  const response = await fetch(`${TRANSLATE_API_URL}/single-line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, start_time, end_time }),
  });

  if (!response.ok) {
    throw new Error(`Line translation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Attempt to recognize a song by Video ID and get full translation.
 */
export async function recognizeAndTranslate(videoId: string): Promise<LyricsLine[]> {
  const response = await fetch(TRANSLATE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId }),
  });

  if (!response.ok) {
    throw new Error(`Song recognition failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.lines;
}
