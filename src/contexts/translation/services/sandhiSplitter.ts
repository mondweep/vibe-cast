import type { WordBreakdown } from '../../../shared/types/database.types';

/**
 * Split sandhi (compound words) in a Sanskrit text.
 * Uses backend NLP service for accurate splitting.
 * Falls back to simple whitespace tokenization.
 */
export async function splitSandhi(text: string): Promise<WordBreakdown[]> {
  try {
    const response = await fetch('/api/sanskrit/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return fallbackSplit(text);
    }

    return response.json();
  } catch {
    return fallbackSplit(text);
  }
}

/**
 * Simple whitespace-based fallback when NLP service is unavailable.
 */
function fallbackSplit(text: string): WordBreakdown[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({
      devanagari: word,
      iast: word, // Would need proper transliteration
      meaning: '',
    }));
}
