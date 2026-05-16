import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../shared/lib/supabaseClient';
import { CheckCircle2, Music } from 'lucide-react';

interface LibrarySong {
  id: string;
  youtube_url: string;
  title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  transcription_language: string | null;
  verified_at: string | null;
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

export function LibraryPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase
        .from('songs')
        .select(
          'id, youtube_url, title, thumbnail_url, duration_seconds, transcription_language, verified_at'
        )
        .eq('verified', true)
        .order('verified_at', { ascending: false }) as any);

      if (cancelled) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSongs((data as LibrarySong[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-amber-400 animate-pulse">Loading library…</div>
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold text-amber-400">Verified Library</h2>
        <span className="text-sm text-gray-500">
          {songs.length} verified {songs.length === 1 ? 'song' : 'songs'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {songs.map((s) => {
          const vid = videoIdOf(s.youtube_url);
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
              <div className="p-3">
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
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
