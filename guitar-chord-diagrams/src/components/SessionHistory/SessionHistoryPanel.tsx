import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  tuning: string;
  chord_count: number;
}

interface SessionChordRow {
  chord_name: string;
  root: string;
  quality: string;
  timestamp_ms: number;
  duration_ms: number;
  source: string;
  confidence: number | null;
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SessionHistoryPanelProps {
  userId: string;
}

export default function SessionHistoryPanel({ userId }: SessionHistoryPanelProps) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chords, setChords] = useState<SessionChordRow[]>([]);
  const [chordsLoading, setChordsLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    async function load() {
      const { data } = await supabase!
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(50);

      setSessions((data as SessionRow[]) ?? []);
      setLoading(false);
    }

    load();
  }, [userId]);

  const toggleExpand = useCallback(async (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      setChords([]);
      return;
    }

    setExpandedId(sessionId);
    setChordsLoading(true);

    if (!supabase) return;

    const { data } = await supabase
      .from('session_chords')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp_ms', { ascending: true });

    setChords((data as SessionChordRow[]) ?? []);
    setChordsLoading(false);
  }, [expandedId]);

  const handleExportSession = useCallback(async (session: SessionRow) => {
    if (!supabase) return;

    const { data: chordData } = await supabase
      .from('session_chords')
      .select('*')
      .eq('session_id', session.id)
      .order('timestamp_ms', { ascending: true });

    const exportData = {
      session: {
        started_at: session.started_at,
        ended_at: session.ended_at,
        duration_ms: session.duration_ms,
        tuning: session.tuning,
        chord_count: session.chord_count,
      },
      chords: chordData ?? [],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chordlab-session-${new Date(session.started_at).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 mt-3">Loading session history...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" strokeWidth={1}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
        <p className="text-gray-400 dark:text-gray-500">No sessions recorded yet.</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Start searching or detecting chords to begin recording.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Session History ({sessions.length})
        </h3>
      </div>

      <div className="space-y-3">
        {sessions.map(session => (
          <div
            key={session.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            {/* Session header */}
            <button
              onClick={() => toggleExpand(session.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                  {session.chord_count}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {formatDate(session.started_at)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDuration(session.duration_ms)} · {session.tuning} tuning
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleExportSession(session); }}
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Export
                </button>
                <svg
                  viewBox="0 0 24 24"
                  className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === session.id ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth={2}
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </div>
            </button>

            {/* Expanded chord list */}
            {expandedId === session.id && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                {chordsLoading ? (
                  <div className="text-center py-4">
                    <div className="w-5 h-5 border-2 border-gray-200 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                  </div>
                ) : chords.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">No chords recorded in this session.</p>
                ) : (
                  <>
                    {/* Progression text */}
                    <div className="mb-3 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 rounded-lg p-2 overflow-x-auto">
                      {chords.map(c => c.chord_name).join(' → ')}
                    </div>

                    {/* Chord timeline */}
                    <div className="flex gap-1.5 flex-wrap">
                      {chords.map((chord, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col items-center px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 text-xs"
                        >
                          <span className="font-bold text-gray-800 dark:text-gray-200">{chord.chord_name}</span>
                          <span className="text-[10px] text-gray-400">
                            {chord.source === 'audio' ? 'mic' : 'search'}
                            {chord.confidence ? ` ${Math.round(chord.confidence * 100)}%` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
