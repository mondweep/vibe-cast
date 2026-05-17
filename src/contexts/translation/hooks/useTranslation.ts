import { useState, useEffect, useRef, useCallback } from 'react';
import type { LyricsLine } from '../../../shared/types/database.types';
import { supabase } from '../../../shared/lib/supabaseClient';
import { fetchCaptions, transcribeVideoAudio } from '../services/transcriber';
import { translateSong } from '../services/translator';

interface TranslationState {
  lines: LyricsLine[];
  currentLineIndex: number;
  currentLine: LyricsLine | null;
  currentExplanation: string;
  loading: boolean;
  error: string | null;
  /** True if these lyrics came from a verified library row (i.e. trusted). */
  isVerified: boolean;
  /** Song row id, present once the song has been written to Supabase. */
  songId: string | null;
  /** The Whisper language hint used by the transcribe pipeline ('sa' or 'hi'). */
  transcriptionLanguage: string | null;
}

const initialState: TranslationState = {
  lines: [],
  currentLineIndex: -1,
  currentLine: null,
  currentExplanation: '',
  loading: false,
  error: null,
  isVerified: false,
  songId: null,
  transcriptionLanguage: null,
};

// Old cache rows used `https://youtube.com/watch?v=...`; the new verify
// endpoint writes `https://www.youtube.com/watch?v=...`. Query both forms so
// legacy data still resolves.
function urlVariants(videoId: string): string[] {
  return [
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtube.com/watch?v=${videoId}`,
  ];
}

/**
 * Pull the canonical (word_id, line_number) mapping from `song_words` for this
 * song, join to `words` for the devanagari/iast/meaning, group by line_number,
 * and inject into each line's `words[]` array. Result: LyricsPanel renders
 * clickable spans + the word-tap popup works for verified-library songs.
 */
async function hydrateLineWords(songId: string, lines: LyricsLine[]): Promise<LyricsLine[]> {
  const { data, error } = await (supabase
    .from('song_words')
    .select('line_number, words(devanagari, iast, meaning_short, root_dhatu)')
    .eq('song_id', songId) as any);

  if (error || !Array.isArray(data)) return lines;

  // Bucket by line_number.
  const byLine = new Map<number, Array<{ devanagari: string; iast: string; meaning: string }>>();
  for (const row of data as Array<{ line_number: number; words: any }>) {
    const w = row.words;
    if (!w?.devanagari || !w?.iast) continue;
    if (!byLine.has(row.line_number)) byLine.set(row.line_number, []);
    byLine.get(row.line_number)!.push({
      devanagari: w.devanagari,
      iast: w.iast,
      meaning: w.meaning_short || '',
    });
  }

  return lines.map((line, i) => ({
    ...line,
    words: byLine.get(i) ?? (line as any).words ?? [],
  }));
}

export function useTranslation(videoId: string | null, currentTime: number) {
  const [state, setState] = useState<TranslationState>(initialState);
  const linesRef = useRef<LyricsLine[]>([]);

  const setLines = useCallback(
    (lines: LyricsLine[], extras: Partial<TranslationState> = {}) => {
      linesRef.current = lines;
      setState((prev) => ({ ...prev, lines, loading: false, error: null, ...extras }));
    },
    []
  );

  // Load lyrics: verified library → live pipeline (no caching).
  useEffect(() => {
    if (!videoId) {
      setState(initialState);
      linesRef.current = [];
      return;
    }

    let cancelled = false;

    async function loadLyrics() {
      setState({ ...initialState, loading: true });

      try {
        // 1. Check the library for a row. We do NOT filter by verified=true
        //    client-side because we want curators to see auto-added drafts
        //    (verified=false rows the nightly task wrote) so they can
        //    review + click Verify & Save. RLS already enforces that
        //    anonymous + non-curator visitors only see fully-public rows
        //    (verified=true AND pending_curator_review=false), so this is
        //    safe to leave unfiltered here — the database will return
        //    nothing to non-curators for unverified rows.
        const { data: verifiedRaw } = await (supabase
          .from('songs')
          .select('id, lyrics_json, title, transcription_language, verified, pending_curator_review')
          .in('youtube_url', urlVariants(videoId!))
          .maybeSingle() as any);
        const verified = verifiedRaw as
          | { id: string; lyrics_json: LyricsLine[]; title?: string;
              transcription_language?: string; verified: boolean;
              pending_curator_review?: boolean }
          | null;

        if (cancelled) return;

        if (verified?.lyrics_json) {
          // Hydrate per-line words[] from the canonical song_words ↔ words
          // join so LyricsPanel can render clickable spans + word popups.
          const hydrated = await hydrateLineWords(verified.id, verified.lyrics_json);
          if (cancelled) return;
          setLines(hydrated, {
            // isVerified reflects the public-ready state, not just "has a row".
            // Auto-added drafts (verified=false, OR verified=true with
            // pending_curator_review=true) show as not-yet-verified so the
            // VerifyBar shows the right CTA ("Verify & Save", not "Save changes").
            isVerified: verified.verified === true && verified.pending_curator_review !== true,
            songId: verified.id,
            transcriptionLanguage: verified.transcription_language ?? null,
          });
          return;
        }

        // 2. Try YouTube captions.
        const captions = await fetchCaptions(videoId!);
        if (cancelled) return;

        if (captions.length > 0) {
          const captionLines = captions[0].lines.map((l) => ({
            text: l.text,
            start_time: l.start_time ?? (l as any).start,
            end_time: l.end_time ?? (l as any).end,
          }));

          const translatedLines = await translateSong(captionLines);
          if (cancelled) return;

          setLines(translatedLines, { isVerified: false, transcriptionLanguage: 'captions' });
          return;
        }

        // 3. Fall through to audio transcription.
        const transcription = await transcribeVideoAudio(videoId!);
        if (cancelled) return;

        if (transcription.segments && transcription.segments.length > 0) {
          const transcribedLines = transcription.segments.map((s: any) => ({
            text: s.text,
            start_time: s.start_time ?? s.start,
            end_time: s.end_time ?? s.end,
            // Pass confidence through to the translator so low-confidence
            // lines are skipped (marked translation_pending) and the UI can
            // offer a per-line "Translate anyway" button.
            confidence: s.confidence,
            confidence_reason: s.confidence_reason,
          }));

          const translatedLines = await translateSong(transcribedLines);
          if (cancelled) return;

          setLines(translatedLines, {
            isVerified: false,
            transcriptionLanguage: (transcription as any).language ?? 'sa',
          });
        } else {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Transcription failed to produce results.',
          }));
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load lyrics',
          }));
        }
      }
    }

    loadLyrics();
    return () => {
      cancelled = true;
    };
  }, [videoId, setLines]);

  // Update current line based on playback time.
  useEffect(() => {
    const lines = linesRef.current;
    if (lines.length === 0) return;
    const index = lines.findIndex(
      (line) => currentTime >= line.start_time && currentTime < line.end_time
    );
    if (index !== -1 && index !== state.currentLineIndex) {
      setState((prev) => ({
        ...prev,
        currentLineIndex: index,
        currentLine: lines[index],
        currentExplanation: lines[index].explanation,
      }));
    }
  }, [currentTime, state.currentLineIndex]);

  /**
   * Locally edit a single line's fields (Devanagari, IAST, translations, etc.).
   * Used by the inline verify UI; the edited state lives in memory until the
   * curator clicks "Verify & Save".
   */
  const updateLine = useCallback((index: number, patch: Partial<LyricsLine>) => {
    const next = linesRef.current.map((l, i) => (i === index ? { ...l, ...patch } : l));
    setLines(next);
  }, [setLines]);

  return { ...state, updateLine };
}
