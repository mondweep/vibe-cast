import { useRef, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ParsedChord } from '../types';

interface CapturedChord {
  chord_name: string;
  root: string;
  quality: string;
  timestamp_ms: number;
  duration_ms: number;
  source: 'audio' | 'search';
  confidence: number | null;
}

/**
 * Captures session chord data and persists to Supabase.
 * Buffers chords locally and flushes periodically + on session end.
 * Gracefully no-ops when Supabase is not configured or user is not signed in.
 */
export function useSessionCapture(userId: string | null, tuning: string) {
  const sessionIdRef = useRef<string | null>(null);
  const bufferRef = useRef<CapturedChord[]>([]);
  const sessionStartRef = useRef<number>(Date.now());
  const flushTimerRef = useRef<number>(0);

  // Start a new session when user is authenticated
  const startSession = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || !userId) return;

    const { data, error } = await supabase
      .from('sessions')
      .insert({ user_id: userId, tuning, chord_count: 0 })
      .select('id')
      .single();

    if (!error && data) {
      sessionIdRef.current = data.id;
      sessionStartRef.current = Date.now();
      bufferRef.current = [];
    }
  }, [userId, tuning]);

  // Flush buffered chords to Supabase
  const flush = useCallback(async () => {
    if (!supabase || !sessionIdRef.current || bufferRef.current.length === 0) return;

    const chords = [...bufferRef.current];
    bufferRef.current = [];

    const rows = chords.map(c => ({
      session_id: sessionIdRef.current!,
      ...c,
    }));

    await supabase.from('session_chords').insert(rows);

    // Update session chord count
    await supabase
      .from('sessions')
      .update({ chord_count: chords.length })
      .eq('id', sessionIdRef.current!);
  }, []);

  // End current session
  const endSession = useCallback(async () => {
    await flush();

    if (!supabase || !sessionIdRef.current) return;

    const durationMs = Date.now() - sessionStartRef.current;

    await supabase
      .from('sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_ms: durationMs,
      })
      .eq('id', sessionIdRef.current);

    sessionIdRef.current = null;
  }, [flush]);

  // Record a chord event
  const recordChord = useCallback(
    (chord: ParsedChord, source: 'audio' | 'search', confidence: number | null = null) => {
      if (!sessionIdRef.current) return;

      // Update duration of previous chord in buffer
      const now = Date.now();
      const timestampMs = now - sessionStartRef.current;

      if (bufferRef.current.length > 0) {
        const prev = bufferRef.current[bufferRef.current.length - 1];
        prev.duration_ms = timestampMs - prev.timestamp_ms;
      }

      bufferRef.current.push({
        chord_name: chord.displayName,
        root: chord.root,
        quality: chord.quality,
        timestamp_ms: timestampMs,
        duration_ms: 0,
        source,
        confidence,
      });

      // Auto-flush every 20 chords
      if (bufferRef.current.length >= 20) {
        flush();
      }
    },
    [flush],
  );

  // Start session on mount when authenticated
  useEffect(() => {
    if (userId) {
      startSession();
    }
    return () => {
      // End session on unmount
      if (sessionIdRef.current) {
        endSession();
      }
    };
  }, [userId, startSession, endSession]);

  // Periodic flush every 30 seconds
  useEffect(() => {
    if (!userId) return;
    flushTimerRef.current = window.setInterval(flush, 30_000);
    return () => clearInterval(flushTimerRef.current);
  }, [userId, flush]);

  // Flush on page unload
  useEffect(() => {
    function handleUnload() {
      if (!supabase || !sessionIdRef.current || bufferRef.current.length === 0) return;

      const chords = bufferRef.current.map(c => ({
        session_id: sessionIdRef.current!,
        ...c,
      }));

      // Use sendBeacon for reliable delivery on page close
      const blob = new Blob([JSON.stringify(chords)], { type: 'application/json' });
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/session_chords`,
        blob,
      );
    }

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return {
    recordChord,
    endSession,
    startSession,
    isCapturing: !!sessionIdRef.current,
  };
}
