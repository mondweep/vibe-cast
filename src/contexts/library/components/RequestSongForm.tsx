import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitSongRequest } from '../services/songRequestsClient';

/**
 * Request-a-song form shown to non-curator visitors on /play when no
 * verified video is selected. Submits to /api/song-requests, which
 * notifies the curator on Telegram and adds the request to the queue.
 */
export function RequestSongForm() {
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    kind: 'ok' | 'info' | 'error';
    message: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await submitSongRequest({ url: url.trim(), notes: notes.trim() });
      if (res.status === 'created') {
        setResult({
          kind: 'ok',
          message: 'Thanks — your request has been added to the curator\'s queue.',
        });
        setUrl('');
        setNotes('');
      } else if (res.status === 'already-in-library') {
        setResult({
          kind: 'info',
          message:
            res.message || 'This song is already in the library — you can play it now.',
        });
      } else if (res.status === 'already-requested') {
        setResult({
          kind: 'info',
          message: res.message || 'Someone has already requested this song.',
        });
      } else if (res.status === 'rate-limited') {
        setResult({
          kind: 'info',
          message:
            res.message ||
            'You\'ve hit the daily request limit. Sign in to submit more, or try again tomorrow.',
        });
      } else {
        setResult({
          kind: 'error',
          message: res.message || 'Could not submit the request. Check the URL and try again.',
        });
      }
    } catch (err) {
      setResult({
        kind: 'error',
        message:
          err instanceof Error ? err.message : 'Something went wrong submitting the request.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <h3 className="text-lg font-semibold text-amber-400 mb-1">Request a Sanskrit song</h3>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">
          The Play tab only opens songs already in the verified library — this keeps the
          translations accurate. To add a new song, paste its YouTube link below. The
          curator will receive your request and add it after verifying the lyrics.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
              YouTube URL
            </label>
            {/* type="text", not "url" — browser HTML5 url-validation rejects
                "www.youtube.com/..." (no scheme) and "youtu.be/abc123" (also
                no scheme), which is how most people paste URLs from the
                address bar. The server's extractVideoId accepts both forms
                plus raw 11-char videoIds. */}
            <input
              type="text"
              required
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="youtube.com/watch?v=... or youtu.be/... or just the 11-character video ID"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
              Note (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Anything that would help — song name, composer, source, why you'd like it added…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!url.trim() || submitting}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-gray-950 transition-colors hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send size={14} />
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>

        {result && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              result.kind === 'ok'
                ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200'
                : result.kind === 'info'
                  ? 'border-amber-700 bg-amber-950/40 text-amber-200'
                  : 'border-red-800 bg-red-950/40 text-red-200'
            }`}
          >
            {result.kind === 'ok' ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
