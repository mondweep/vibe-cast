import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, Inbox, X, ArrowRight, MessageSquare, Lightbulb, Star, CheckCircle2 } from 'lucide-react';
import {
  listPendingRequests,
  updateRequestStatus,
  type SongRequestRow,
} from '../contexts/library/services/songRequestsClient';
import {
  listFeedback,
  updateFeedback,
  type FeedbackRow,
  type FeedbackKind,
} from '../contexts/library/services/feedbackClient';
import { useCurator } from '../contexts/auth/hooks/useCurator';

type Tab = 'songs' | 'feedback';

export function QueuePage() {
  const { isCurator } = useCurator();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: Tab = searchParams.get('tab') === 'feedback' ? 'feedback' : 'songs';
  const [tab, setTab] = useState<Tab>(initialTab);

  // Keep ?tab=… in sync so the curator can deep-link or bookmark.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!isCurator) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center text-gray-400">
        <Inbox size={36} className="mx-auto text-gray-700 mb-3" />
        <p>This page is for the curator only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold text-amber-400">Curator Queue</h2>
      </div>

      <div className="mb-5 flex gap-1 border-b border-gray-800">
        <TabButton active={tab === 'songs'} onClick={() => setTab('songs')}>
          Song requests
        </TabButton>
        <TabButton active={tab === 'feedback'} onClick={() => setTab('feedback')}>
          Feedback &amp; applications
        </TabButton>
      </div>

      {tab === 'songs' ? <SongRequestsList /> : <FeedbackList />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
        active
          ? 'text-amber-400 border-amber-500'
          : 'text-gray-500 border-transparent hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Song-requests list (existing functionality, now living inside a tab)
// ─────────────────────────────────────────────────────────────────────────

function SongRequestsList() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SongRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

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

  if (loading) {
    return <Loading label="Loading song requests…" />;
  }
  if (error) {
    return <ErrorBox message={error} />;
  }
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No pending song requests."
        body="Visitors can submit requests from the Play tab when they're not signed in as the curator. You'll see them here and get a Telegram notification each time."
      />
    );
  }

  return (
    <>
      <p className="text-xs text-gray-500 mb-3">
        {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
      </p>
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
                  <p className="mt-2 text-sm text-gray-400 italic line-clamp-3">"{r.notes}"</p>
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
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Feedback list (new — covers comments, suggestions, curator applications)
// ─────────────────────────────────────────────────────────────────────────

const KIND_ICON: Record<FeedbackKind, typeof MessageSquare> = {
  comment: MessageSquare,
  suggestion: Lightbulb,
  curator_application: Star,
};

const KIND_LABEL: Record<FeedbackKind, string> = {
  comment: 'Comment',
  suggestion: 'Suggestion',
  curator_application: 'Curator application',
};

const KIND_COLOR: Record<FeedbackKind, string> = {
  comment: 'text-gray-400',
  suggestion: 'text-amber-300',
  curator_application: 'text-emerald-300',
};

function FeedbackList() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<FeedbackKind | 'all'>('all');

  async function reload() {
    setLoading(true);
    try {
      const rows = await listFeedback(
        kindFilter === 'all' ? undefined : { kind: kindFilter },
      );
      // Show open items at the top: 'new' and 'in_progress'
      const open = rows.filter((r) => r.status === 'new' || r.status === 'in_progress');
      const closed = rows.filter((r) => r.status !== 'new' && r.status !== 'in_progress');
      setItems([...open, ...closed]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listFeedback(
          kindFilter === 'all' ? undefined : { kind: kindFilter },
        );
        if (cancelled) return;
        const open = rows.filter((r) => r.status === 'new' || r.status === 'in_progress');
        const closed = rows.filter((r) => r.status !== 'new' && r.status !== 'in_progress');
        setItems([...open, ...closed]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load feedback');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kindFilter]);

  async function setStatus(id: string, status: FeedbackRow['status']) {
    setBusyId(id);
    try {
      await updateFeedback(id, { status });
      // Re-sort: closed items drop down
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <Loading label="Loading feedback…" />;
  }
  if (error) {
    return <ErrorBox message={error} />;
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}{' '}
          {kindFilter !== 'all' && `· filtered to ${KIND_LABEL[kindFilter]}`}
        </p>
        <div className="flex gap-1 text-xs">
          <FilterButton active={kindFilter === 'all'} onClick={() => setKindFilter('all')}>
            All
          </FilterButton>
          <FilterButton active={kindFilter === 'comment'} onClick={() => setKindFilter('comment')}>
            <MessageSquare size={10} className="inline mr-1" />
            Comments
          </FilterButton>
          <FilterButton active={kindFilter === 'suggestion'} onClick={() => setKindFilter('suggestion')}>
            <Lightbulb size={10} className="inline mr-1" />
            Suggestions
          </FilterButton>
          <FilterButton
            active={kindFilter === 'curator_application'}
            onClick={() => setKindFilter('curator_application')}
          >
            <Star size={10} className="inline mr-1" />
            Applications
          </FilterButton>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No feedback yet."
          body="When visitors submit comments, suggestions, or curator applications, they'll appear here and you'll get a Telegram notification."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((f) => {
            const Icon = KIND_ICON[f.kind];
            const isOpen = f.status === 'new' || f.status === 'in_progress';
            const when = new Date(f.created_at).toLocaleString();
            const requester = f.applicant_name
              ? `${f.applicant_name}${f.requested_by_email ? ` <${f.requested_by_email}>` : ''}`
              : f.requested_by_email
                ? f.requested_by_email
                : f.display_name
                  ? f.display_name
                  : f.visitor_id
                    ? `anon · ${f.visitor_id.slice(0, 8)}…`
                    : 'anon';
            return (
              <li
                key={f.id}
                className={`rounded-lg border bg-gray-900/60 p-4 ${
                  isOpen ? 'border-gray-800' : 'border-gray-900 opacity-60'
                }`}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <Icon size={14} className={KIND_COLOR[f.kind]} />
                  <span className={`text-xs uppercase tracking-wide ${KIND_COLOR[f.kind]}`}>
                    {KIND_LABEL[f.kind]}
                  </span>
                  {f.is_public && (
                    <span className="text-[10px] uppercase tracking-wide text-emerald-400/80">
                      · marked public
                    </span>
                  )}
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-600">
                    {f.status.replace('_', ' ')}
                  </span>
                </div>

                {f.subject && <h3 className="text-base font-medium text-gray-100 mb-1">{f.subject}</h3>}

                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{f.body}</p>

                {/* Curator-application-only fields */}
                {f.kind === 'curator_application' && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md bg-gray-950/60 p-3 text-xs text-gray-400">
                    {f.sanskrit_background && (
                      <div>
                        <span className="block text-[10px] uppercase text-gray-600">Background</span>
                        {f.sanskrit_background}
                      </div>
                    )}
                    {f.traditions_familiar && (
                      <div>
                        <span className="block text-[10px] uppercase text-gray-600">Traditions</span>
                        {f.traditions_familiar}
                      </div>
                    )}
                    {f.weekly_hours != null && (
                      <div>
                        <span className="block text-[10px] uppercase text-gray-600">Availability</span>
                        {f.weekly_hours} hr/week
                      </div>
                    )}
                    {f.motivation && (
                      <div className="sm:col-span-2">
                        <span className="block text-[10px] uppercase text-gray-600">Motivation</span>
                        <p className="whitespace-pre-wrap">{f.motivation}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span>{requester} · {when}</span>
                  {isOpen && (
                    <div className="flex gap-2">
                      {f.kind === 'curator_application' ? (
                        <>
                          <button
                            onClick={() => setStatus(f.id, 'accepted')}
                            disabled={busyId === f.id}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 px-2 py-1 text-xs transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} /> Accept
                          </button>
                          <button
                            onClick={() => setStatus(f.id, 'rejected')}
                            disabled={busyId === f.id}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-700 text-gray-400 hover:text-red-300 hover:border-red-700 px-2 py-1 text-xs transition-colors disabled:opacity-50"
                          >
                            <X size={12} /> Decline
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setStatus(f.id, 'responded')}
                            disabled={busyId === f.id}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-2 py-1 text-xs transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} /> Mark responded
                          </button>
                          <button
                            onClick={() => setStatus(f.id, 'closed')}
                            disabled={busyId === f.id}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-700 text-gray-400 hover:text-gray-300 px-2 py-1 text-xs transition-colors disabled:opacity-50"
                          >
                            Close
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded transition-colors ${
        active
          ? 'bg-amber-500/20 text-amber-300'
          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-24 text-amber-400 animate-pulse">
      {label}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-900 bg-red-950/50 p-4 text-red-200">{message}</div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl mx-auto mt-10 text-center text-gray-400 space-y-3">
      <Inbox size={36} className="mx-auto text-gray-600" />
      <p className="text-lg">{title}</p>
      <p className="text-sm">{body}</p>
    </div>
  );
}
