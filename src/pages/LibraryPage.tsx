import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../shared/lib/supabaseClient';
import { CheckCircle2, Music, Heart, Inbox, Search, X } from 'lucide-react';
import { useCurator } from '../contexts/auth/hooks/useCurator';
import { listPendingRequests } from '../contexts/library/services/songRequestsClient';

interface LibrarySong {
  id: string;
  youtube_url: string;
  title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  transcription_language: string | null;
  verified_at: string | null;
  tags: string[] | null;
  /** Aggregate of song_likes for this song. PostgREST returns this as an
   *  array of one row `[{ count: N }]` from the embedded-resource count
   *  syntax; we normalise to a plain number after the fetch. */
  like_count: number;
}

/** PostgREST raw shape before we flatten the embedded count. */
interface LibrarySongRaw extends Omit<LibrarySong, 'like_count'> {
  song_likes?: Array<{ count: number }> | null;
}

// Pull videoId out of either canonical (`...?v=ID`) or shortened URLs.
function videoIdOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    return u.searchParams.get('v');
  } catch {
    return null;
  }
}

// Pretty-print a tag slug for chip display. "advaita-vedanta" → "Advaita Vedanta",
// "om" → "OM", "bhagavad-gita" → "Bhagavad Gita".
function formatTag(tag: string): string {
  const SPECIAL: Record<string, string> = {
    om: 'OM',
    'om-namo-narayanaya': 'Oṃ Namo Nārāyaṇāya',
    'vedic-metal': 'Vedic Metal',
    'metal-fusion': 'Metal Fusion',
    'advaita-vedanta': 'Advaita Vedānta',
    'bhagavad-gita': 'Bhagavad Gītā',
    'ashtavakra-gita': 'Aṣṭāvakra Gītā',
    'isha-upanishad': 'Īśā Upaniṣad',
    'mandukya-upanishad': 'Māṇḍūkya Upaniṣad',
    upanishadic: 'Upaniṣadic',
    'classical-stotra': 'Classical Stotra',
    'meditative-chant': 'Meditative Chant',
    'progressive-rock': 'Progressive Rock',
    'daily-prayer': 'Daily Prayer',
    rigveda: 'Rigveda',
    ramcaritmanas: 'Rāmcaritmānas',
    tulsidas: 'Tulsidas',
    'swami-brahmananda': 'Swami Brahmananda',
    mahavakya: 'Mahāvākya',
    turiya: 'Turīya',
    shiva: 'Śiva',
    vishnu: 'Viṣṇu',
    hanuman: 'Hanumān',
    agni: 'Agni',
    bhajan: 'Bhajan',
    bhakti: 'Bhakti',
    vedic: 'Vedic',
    contemporary: 'Contemporary',
  };
  if (SPECIAL[tag]) return SPECIAL[tag];
  return tag
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

export function LibraryPage() {
  const navigate = useNavigate();
  const { isCurator } = useCurator();
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  // Filter state
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchQ, setSearchQ] = useState('');

  // Curator-only: count pending song requests for the banner. Failures are
  // silent — the rest of the page works the same.
  useEffect(() => {
    if (!isCurator) {
      setPendingCount(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await listPendingRequests();
        if (!cancelled) setPendingCount(rows.length);
      } catch {
        if (!cancelled) setPendingCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCurator]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase
        .from('songs')
        .select(
          // song_likes(count) is the PostgREST aggregate-on-embed syntax —
          // one round trip, server-side aggregation, no per-card N+1.
          'id, youtube_url, title, thumbnail_url, duration_seconds, transcription_language, verified_at, tags, song_likes(count)'
        )
        .eq('verified', true)
        .order('verified_at', { ascending: false }) as any);

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Flatten the embedded `[{count: N}]` shape to a plain number on each
      // row so downstream filters / renders don't have to know the wire shape.
      const flattened: LibrarySong[] = ((data as LibrarySongRaw[]) || []).map(
        (r) => ({
          id: r.id,
          youtube_url: r.youtube_url,
          title: r.title,
          thumbnail_url: r.thumbnail_url,
          duration_seconds: r.duration_seconds,
          transcription_language: r.transcription_language,
          verified_at: r.verified_at,
          tags: r.tags,
          like_count: r.song_likes?.[0]?.count ?? 0,
        })
      );
      setSongs(flattened);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build the distinct set of tags across all songs, sorted by frequency
  // descending so the most-common categories surface first.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of songs) {
      for (const tag of s.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [songs]);

  // Filtered + searched songs. A song matches if it has ALL selected tags AND
  // (search empty OR title/iast/devanagari substring match).
  const filteredSongs = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const tags = Array.from(selectedTags);
    return songs.filter((s) => {
      if (tags.length > 0) {
        const songTags = new Set((s.tags ?? []).map((t) => t.toLowerCase()));
        if (!tags.every((t) => songTags.has(t))) return false;
      }
      if (q) {
        const title = (s.title || '').toLowerCase();
        const tagText = (s.tags ?? []).join(' ').toLowerCase();
        if (!title.includes(q) && !tagText.includes(q)) return false;
      }
      return true;
    });
  }, [songs, selectedTags, searchQ]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function clearFilters() {
    setSelectedTags(new Set());
    setSearchQ('');
  }

  if (loading) {
    // Skeleton grid that mirrors the real card layout (aspect-video thumb +
    // two title lines + a row of three tag chips). Perceived load time
    // drops a lot vs. a centred spinner because the user sees the page
    // structure immediately. Six placeholders cover roughly two rows on
    // most desktop widths; mobile collapses to a single column naturally.
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold text-amber-400">Verified Library</h2>
          <span className="text-sm text-gray-500 animate-pulse">Loading…</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden bg-gray-900 border border-gray-800 animate-pulse"
              aria-hidden
            >
              <div className="aspect-video bg-gray-800" />
              <div className="p-3 space-y-3">
                <div className="h-4 w-3/4 bg-gray-800 rounded" />
                <div className="h-3 w-1/2 bg-gray-800 rounded" />
                <div className="flex gap-1 pt-1">
                  <div className="h-3 w-12 bg-gray-800 rounded" />
                  <div className="h-3 w-16 bg-gray-800 rounded" />
                  <div className="h-3 w-10 bg-gray-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 rounded-lg border border-red-900 bg-red-950/50 p-4 text-red-200">
        Failed to load library: {error}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center text-gray-400 space-y-3">
        <Music size={36} className="mx-auto text-gray-600" />
        <p className="text-lg">The library is empty.</p>
        <p className="text-sm">
          Play a Sanskrit song on the Play page, review the transcription, and
          press <span className="text-amber-400">Verify &amp; Save</span> to add
          it here.
        </p>
      </div>
    );
  }

  const filtersActive = selectedTags.size > 0 || searchQ.trim().length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold text-amber-400">Verified Library</h2>
        <span className="text-sm text-gray-500">
          {filtersActive
            ? `${filteredSongs.length} of ${songs.length} songs`
            : `${songs.length} verified ${songs.length === 1 ? 'song' : 'songs'}`}
        </span>
      </div>

      {/* Curator-only banner — surfaces pending song requests at-a-glance. */}
      {isCurator && pendingCount !== null && pendingCount > 0 && (
        <Link
          to="/queue"
          className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200 hover:bg-amber-500/20 transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            <Inbox size={14} />
            {pendingCount} song {pendingCount === 1 ? 'request' : 'requests'} pending review
          </span>
          <span className="text-amber-400/80 text-xs">Go to queue →</span>
        </Link>
      )}

      {/* Search + filter chips */}
      {tagCounts.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search by title or tag (e.g. shiva, bhakti, vedic)…"
              className="w-full rounded-md border border-gray-800 bg-gray-950 pl-9 pr-9 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {searchQ && (
              <button
                onClick={() => setSearchQ('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-300 transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {tagCounts.map(([tag, count]) => {
              const active = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
                  }`}
                >
                  {formatTag(tag)}
                  <span className={`ml-1.5 text-[10px] ${active ? 'text-amber-400/70' : 'text-gray-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700 transition-colors"
                title="Clear all filters"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Subtle support strip */}
      <div className="mb-5 flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
        <span className="leading-snug">
          Enjoying the library? Each verified song takes a few hours of careful curation.
          If this is useful to you, please consider supporting it.
        </span>
        <a
          href="https://paypal.me/mondweep"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
        >
          <Heart size={12} /> Support this work
        </a>
      </div>

      {filteredSongs.length === 0 ? (
        <div className="max-w-xl mx-auto mt-12 text-center text-gray-400 space-y-3">
          <Music size={28} className="mx-auto text-gray-700" />
          <p className="text-sm">
            No songs match the current filters.{' '}
            <button onClick={clearFilters} className="text-amber-400 hover:text-amber-300 underline">
              Clear filters
            </button>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSongs.map((s) => {
            const vid = videoIdOf(s.youtube_url);
            const tags = s.tags ?? [];
            return (
              <button
                key={s.id}
                onClick={() => vid && navigate(`/play?v=${vid}`)}
                className="text-left rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-amber-500/50 hover:shadow-lg transition-all group"
              >
                <div className="aspect-video bg-gray-950 relative">
                  {s.thumbnail_url ? (
                    <img
                      src={s.thumbnail_url}
                      alt={s.title || 'Song thumbnail'}
                      className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                      <Music size={32} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-950/80 backdrop-blur px-2 py-0.5 rounded-full text-emerald-300 text-xs">
                    <CheckCircle2 size={12} />
                    Verified
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div>
                    <h3 className="font-medium text-gray-100 line-clamp-2 mb-1">
                      {s.title || 'Untitled'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {s.transcription_language && (
                        <span className="uppercase">{s.transcription_language}</span>
                      )}
                      {s.verified_at && (
                        <span>· added {new Date(s.verified_at).toLocaleDateString()}</span>
                      )}
                      {s.like_count > 0 && (
                        <span className="ml-auto inline-flex items-center gap-1 text-rose-400">
                          <Heart size={12} className="fill-rose-400 stroke-rose-400" />
                          {s.like_count}
                        </span>
                      )}
                    </div>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
                        >
                          {formatTag(tag)}
                        </span>
                      ))}
                      {tags.length > 4 && (
                        <span className="text-[10px] text-gray-600">+{tags.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
