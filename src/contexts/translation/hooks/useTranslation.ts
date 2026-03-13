import { useState, useEffect, useRef } from 'react';
import type { LyricsLine } from '../../../shared/types/database.types';
import { supabase } from '../../../shared/lib/supabaseClient';
import { fetchCaptions } from '../services/transcriber';
import { translateSong } from '../services/translator';

interface TranslationState {
  lines: LyricsLine[];
  currentLineIndex: number;
  currentLine: LyricsLine | null;
  currentExplanation: string;
  loading: boolean;
  error: string | null;
}

export function useTranslation(videoId: string | null, currentTime: number) {
  const [state, setState] = useState<TranslationState>({
    lines: [],
    currentLineIndex: -1,
    currentLine: null,
    currentExplanation: '',
    loading: false,
    error: null,
  });
  const linesRef = useRef<LyricsLine[]>([]);

  // Load lyrics — first check cache, then fetch + translate
  useEffect(() => {
    if (!videoId) return;

    let cancelled = false;

    async function loadLyrics() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // Check Supabase cache first
        const { data: cached } = await (supabase
          .from('songs')
          .select('lyrics_json, title')
          .eq('youtube_url', `https://youtube.com/watch?v=${videoId}`)
          .maybeSingle() as any);

        if (cached?.lyrics_json && !cancelled) {
          const lines = cached.lyrics_json as LyricsLine[];
          linesRef.current = lines;
          setState((prev) => ({ ...prev, lines, loading: false }));
          return;
        }

        // Fetch captions from YouTube
        const captions = await fetchCaptions(videoId!);
        if (cancelled) return;

        if (captions.length > 0) {
          // Translate caption lines
          const captionLines = captions[0].lines.map((l) => ({
            text: l.text,
            start_time: l.start_time,
            end_time: l.end_time,
          }));

          const translatedLines = await translateSong(captionLines);
          if (cancelled) return;

          linesRef.current = translatedLines;
          setState((prev) => ({ ...prev, lines: translatedLines, loading: false }));

          // Cache in Supabase
          await (supabase.from('songs') as any).upsert({
            youtube_url: `https://youtube.com/watch?v=${videoId}`,
            lyrics_json: translatedLines,
          });
        } else {
          // No captions — would trigger Whisper transcription
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'No captions found. Audio transcription will be available soon.',
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
    return () => { cancelled = true; };
  }, [videoId]);

  // Update current line based on playback time
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

  return state;
}
