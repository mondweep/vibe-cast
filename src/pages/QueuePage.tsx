import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Inbox, X, ArrowRight } from 'lucide-react';
import {
  listPendingRequests,
  updateRequestStatus,
  type SongRequestRow,
} from '../contexts/library/services/songRequestsClient';
import { useCurator } from '../contexts/auth/hooks/useCurator';

export function QueuePage() {
  const navigate = useNavigate();
  const { isCurator } = useCurator();
  const [requests, setRequests] = useState<SongRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isCurator) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await listPendingRequests();
        if (!cancelled) setRequests(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load queue');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCurator]);

  async function handleReject(id: string) {
    const reason = window.prompt(
      'Reason for rejecting? (optional — visible only to you in the audit trail)',
    );
    setBusyId(id);
    try {
      await updateRequestStatus(id, 'rejected', reason || undefined);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  }

  if (!isCurator) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center text-gray-400">
        <Inbox size={36} className="mx-auto text-gray-700 mb-3" />
        <p>This page is for the curator only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-amber-400 animate-pulse">
        Loading queue…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 rounded-lg border border-red-900 bg-red-950/50 p-4 text-red-200">
        {error}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center text-gray-400 space-y-3">
        <Inbox size={36} className="mx-auto text-gray-600" />
        <p className="text-lg">No pending song requests.</p>
        <p className="text-sm">
          Visitors can submit requests from the Play tab when they're not signed in as the curator.
          You'll see them here and get a Telegram notification each time.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold text-amber-400">Curator Queue</h2>
        <span className="text-sm text-gray-500">
          {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
        </span>
      </div>

      <ul className="space-y-3">
        {requests.map((r) => {
          const requester = r.requested_by_email
            ? r.requested_by_email
            : r.visitor_id
              ? `anon · ${r.visitor_id.slice(0, 8)}…`
              : 'unknown';
          const when = new Date(r.created_at).toLocaleString();
          return (
            <li
              key={r.id}
              className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-medium text-gray-100 truncate">
                  {r.title || '(no title fetched)'}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <a
                    href={r.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-amber-400/80 hover:text-amber-300"
                  >
                    <ExternalLink size={12} />
                    {r.video_id}
                  </a>
                  <span>·</span>
                  <span>{requester}</span>
                  <span>·</span>
                  <span>{when}</span>
                </div>
                {r.notes && (
                  <p className="mt-2 text-sm text-gray-400 italic line-clamp-3">
                    "{r.notes}"
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => navigate(`/play?v=${r.video_id}`)}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-gray-950 hover:bg-amber-400 transition-colors"
                  title="Open in Play to transcribe + verify"
                >
                  Take this <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => handleReject(r.id)}
                  disabled={busyId === r.id}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-red-300 hover:border-red-700 transition-colors disabled:opacity-50"
                  title="Reject this request"
                >
                  <X size={14} />
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs text-gray-600 leading-relaxed">
        "Take this" opens the request video in the Play tab so you can review and verify it. When
        you click <span className="text-amber-400/80">Verify &amp; Save</span> there, the request
        is automatically moved out of this queue.
      </p>
    </div>
  );
}
