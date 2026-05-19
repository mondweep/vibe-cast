/**
 * /roadmap — public, view-only Kanban board.
 *
 * Three columns: Backlog · In Progress · Done.
 *   - Backlog sorts by vote_count desc (most-wanted first). Ties fall
 *     back to manual display_order, then creation date.
 *   - In Progress sorts by display_order asc.
 *   - Done sorts by completed_at desc (most recently shipped first).
 *
 * Anyone can read. Authenticated users see a vote button on each card.
 * Anonymous visitors see the count + a "Sign in to vote" tooltip.
 *
 * No admin UI here. The curator adds / moves / completes items via
 * Cowork (chat-driven SQL writes). KANBAN.md in the repo is the
 * downstream mirror of this table, regenerated for git-history audit.
 */

import { useEffect, useMemo, useState } from 'react'
import { ChevronUp, ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/auth/hooks/useAuth'
import { useCurator } from '../contexts/auth/hooks/useCurator'
import {
  fetchKanban,
  castVote as apiCastVote,
  removeVote as apiRemoveVote,
  updateItemStatus,
  type KanbanItem,
} from '../contexts/kanban/services/kanbanClient'

type Lane = KanbanItem['status']

const LANE_LABELS: Record<Lane, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  done: 'Done',
}

const LANE_HINTS: Record<Lane, string> = {
  backlog: 'Ideas — vote to push them up the priority list',
  in_progress: 'Actively being built',
  done: 'Shipped',
}

export function RoadmapPage() {
  const { user } = useAuth()
  const { isCurator } = useCurator()
  const [items, setItems] = useState<KanbanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [movingItem, setMovingItem] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetchKanban()
        if (!cancelled) setItems(r.items)
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Could not load roadmap')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const byLane = useMemo(() => {
    const groups: Record<Lane, KanbanItem[]> = {
      backlog: [],
      in_progress: [],
      done: [],
    }
    for (const it of items) groups[it.status].push(it)

    // Backlog: votes desc, then display_order, then created_at.
    groups.backlog.sort((a, b) => {
      if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count
      if (a.display_order !== b.display_order)
        return a.display_order - b.display_order
      return a.created_at.localeCompare(b.created_at)
    })
    // In Progress: manual display_order.
    groups.in_progress.sort((a, b) => a.display_order - b.display_order)
    // Done: most-recently-completed first.
    groups.done.sort((a, b) => {
      const ax = a.completed_at || a.created_at
      const bx = b.completed_at || b.created_at
      return bx.localeCompare(ax)
    })
    return groups
  }, [items])

  async function handleVoteToggle(item: KanbanItem) {
    if (!user || busyItem) return
    setBusyItem(item.id)
    // Optimistic update so the chevron feels instant.
    const optimistic = items.map((it) =>
      it.id === item.id
        ? {
            ...it,
            voted_by_me: !it.voted_by_me,
            vote_count: it.vote_count + (it.voted_by_me ? -1 : 1),
          }
        : it
    )
    setItems(optimistic)
    try {
      const result = item.voted_by_me
        ? await apiRemoveVote(item.id)
        : await apiCastVote(item.id)
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                vote_count: result.vote_count,
                voted_by_me: result.voted_by_me,
              }
            : it
        )
      )
    } catch (e) {
      // Roll back.
      setItems(items)
      setError(e instanceof Error ? e.message : 'Vote failed')
    } finally {
      setBusyItem(null)
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleMove(item: KanbanItem, to: Lane) {
    if (!isCurator || movingItem || item.status === to) return
    setMovingItem(item.id)
    setError(null)
    // Optimistic: flip the status immediately, leave timestamps to the
    // server response (it sets started_at / completed_at on first entry).
    const optimistic = items.map((it) =>
      it.id === item.id ? { ...it, status: to } : it
    )
    setItems(optimistic)
    try {
      const updated = await updateItemStatus(item.id, to)
      setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)))
    } catch (e) {
      // Roll back.
      setItems(items)
      setError(e instanceof Error ? e.message : 'Move failed')
    } finally {
      setMovingItem(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-100">Roadmap</h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          What's coming to SanskritSync. Vote on ideas in the Backlog to nudge
          them up the priority list — we build user-led. Items move through
          In Progress to Done as they ship. The curator edits items directly
          in the database; this board is read-only.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {(Object.keys(LANE_LABELS) as Lane[]).map((lane) => (
          <section key={lane} className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-200">
                {LANE_LABELS[lane]}
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {byLane[lane].length}
                </span>
              </h2>
              <p className="text-xs text-gray-500">{LANE_HINTS[lane]}</p>
            </div>

            {loading && byLane[lane].length === 0 ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : byLane[lane].length === 0 ? (
              <p className="text-sm text-gray-600 italic">
                {lane === 'backlog'
                  ? 'No ideas yet.'
                  : lane === 'in_progress'
                    ? 'Nothing currently in flight.'
                    : 'Nothing shipped yet.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {byLane[lane].map((item) => {
                  const isExpanded = expanded.has(item.id)
                  return (
                    <li
                      key={item.id}
                      className="rounded-md border border-gray-800 bg-gray-900/50 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <VoteButton
                          item={item}
                          authed={!!user}
                          busy={busyItem === item.id}
                          onToggle={() => handleVoteToggle(item)}
                        />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="text-left w-full group"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="text-[10px] font-mono uppercase tracking-wide text-gray-500">
                                {item.code}
                              </span>
                              <h3 className="text-sm font-semibold text-gray-200 group-hover:text-gray-100">
                                {item.title}
                              </h3>
                            </div>
                            <p className="mt-1 text-sm text-gray-400">
                              {item.summary}
                            </p>
                          </button>
                          {isExpanded && item.body && (
                            <pre className="mt-3 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300 font-sans">
                              {item.body}
                            </pre>
                          )}
                          {lane === 'done' && item.completed_at && (
                            <p className="mt-2 text-[11px] text-gray-500">
                              Shipped {new Date(item.completed_at).toLocaleDateString()}
                            </p>
                          )}
                          {isCurator && (
                            <CuratorMoveButtons
                              item={item}
                              busy={movingItem === item.id}
                              onMove={(to) => handleMove(item, to)}
                            />
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

/** Curator-only move-between-lanes toolbar shown under each card.
 *  Buttons are contextual: backlog cards offer "→ In Progress"; in-progress
 *  cards offer "← Backlog" and "→ Done"; done cards offer "← In Progress".
 *  This keeps the destinations visible without a separate dropdown. */
interface CuratorMoveButtonsProps {
  item: KanbanItem
  busy: boolean
  onMove: (to: Lane) => void
}

function CuratorMoveButtons({ item, busy, onMove }: CuratorMoveButtonsProps) {
  const baseBtn =
    'inline-flex items-center gap-1 rounded-full border border-gray-700 px-2.5 py-0.5 text-[11px] text-gray-400 hover:border-gray-500 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-800/60 pt-2">
      <span className="text-[10px] uppercase tracking-wide text-gray-600 mr-1 self-center">
        Curator
      </span>
      {item.status !== 'backlog' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onMove('backlog')}
          className={baseBtn}
          title="Move to Backlog"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden /> Backlog
        </button>
      )}
      {item.status !== 'in_progress' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onMove('in_progress')}
          className={baseBtn}
          title="Move to In Progress"
        >
          {item.status === 'backlog' ? (
            <ArrowRight className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowLeft className="h-3 w-3" aria-hidden />
          )}{' '}
          In Progress
        </button>
      )}
      {item.status !== 'done' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onMove('done')}
          className={baseBtn}
          title="Move to Done"
        >
          <ArrowRight className="h-3 w-3" aria-hidden /> Done
        </button>
      )}
    </div>
  )
}

interface VoteButtonProps {
  item: KanbanItem
  authed: boolean
  busy: boolean
  onToggle: () => void
}

function VoteButton({ item, authed, busy, onToggle }: VoteButtonProps) {
  const disabled = !authed || busy
  const tooltip = !authed
    ? 'Sign in to vote'
    : item.voted_by_me
      ? 'Remove your vote'
      : 'Vote for this idea'
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={tooltip}
      aria-pressed={item.voted_by_me}
      aria-label={tooltip}
      className={`flex shrink-0 flex-col items-center justify-center rounded-md border px-2 py-1.5 text-xs transition-colors min-w-[44px] ${
        item.voted_by_me
          ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
          : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
      } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
    >
      <ChevronUp
        className={`h-4 w-4 ${item.voted_by_me ? 'stroke-amber-300' : ''}`}
        aria-hidden
      />
      <span className="tabular-nums font-medium">{item.vote_count}</span>
    </button>
  )
}
