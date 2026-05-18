/**
 * "Concepts in this song" panel for /play.
 *
 * Renders a row of concept chips for the currently playing song. Click a chip
 * to expand inline and see the member words from that song. Hidden entirely
 * when the song has no clustered concepts yet (e.g. before cluster_concepts.ts
 * has been re-run after the song was verified).
 */

import { useEffect, useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Network } from 'lucide-react';
import { Link } from 'react-router-dom';

type WordRow = {
  id: string;
  devanagari: string;
  iast: string;
  meaning_short: string;
};

type SongConcept = {
  id: string;
  slug: string;
  label: string;
  summary: string | null;
  color: string | null;
  display_order: number;
  word_count: number;
  words_in_song: WordRow[];
};

export function ConceptSidePanel({ videoId }: { videoId: string }) {
  const [concepts, setConcepts] = useState<SongConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExpandedSlug(null);
    fetch(`/api/songs/${encodeURIComponent(videoId)}/concepts`)
      .then((r) => (r.ok ? r.json() : { concepts: [] }))
      .then((data) => {
        if (cancelled) return;
        setConcepts(data.concepts || []);
      })
      .catch(() => {
        if (cancelled) return;
        setConcepts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Hide the panel entirely while loading or if there's nothing to show —
  // we don't want a "concepts coming soon" placeholder on every song.
  if (loading || concepts.length === 0) return null;

  const expanded = concepts.find((c) => c.slug === expandedSlug) || null;

  return (
    <section className="bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3">
      <header className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Sparkles size={14} className="text-amber-400/80" />
          <span className="font-medium">Concepts in this song</span>
          <span className="text-xs text-gray-500">({concepts.length})</span>
        </div>
        <Link
          to="/graph"
          className="inline-flex items-center gap-1 text-xs text-amber-400/80 hover:text-amber-300"
          title="Open the full knowledge graph"
        >
          <Network size={12} /> Open graph
        </Link>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {concepts.map((c) => {
          const isOpen = c.slug === expandedSlug;
          const color = c.color || '#5B7FFF';
          return (
            <button
              key={c.id}
              onClick={() => setExpandedSlug(isOpen ? null : c.slug)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all ${
                isOpen ? 'ring-1 ring-amber-300' : 'hover:brightness-125'
              }`}
              style={{
                backgroundColor: color + '20',
                borderColor: color + '60',
                color: color,
              }}
              title={c.summary || undefined}
            >
              <span className="font-medium">{c.label}</span>
              <span
                className="text-[10px] tabular-nums opacity-80"
                style={{ color }}
              >
                {c.word_count}
              </span>
              {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          );
        })}
      </div>

      {expanded && (
        <div
          className="mt-3 pt-3 border-t border-gray-800/80"
          style={{ borderTopColor: (expanded.color || '#5B7FFF') + '40' }}
        >
          {expanded.summary && (
            <p className="text-xs text-gray-400 italic mb-2 leading-snug">
              {expanded.summary}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {expanded.words_in_song.map((w) => (
              <span
                key={w.id}
                className="inline-block px-2 py-0.5 rounded bg-gray-800/70 border border-gray-700 text-xs text-gray-200"
                title={w.meaning_short}
              >
                <span className="text-amber-300">{w.iast}</span>{' '}
                <span className="text-gray-500">·</span>{' '}
                <span className="text-gray-400">{w.meaning_short}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
