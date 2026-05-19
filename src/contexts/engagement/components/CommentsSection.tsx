/**
 * Comments thread for a song, rendered below the lyrics panel on /play.
 *
 * Phase-1 features:
 *   - Authenticated users can post a comment.
 *   - Comments paginated 20 at a time, cursor-based on created_at desc.
 *     A "Load older comments" button fetches the next page; new comments
 *     posted in the current session are prepended so the user sees them
 *     immediately without a refetch.
 *   - Authors can edit / delete their own comments in-place.
 *   - Curator can hide any comment (the same Hide button, gated by isCurator).
 *
 * Non-features (deliberately deferred to ENG-002 / MOD-001):
 *   - Threaded replies — Phase 1 is flat by design.
 *   - Line-scoped suggestions.
 *   - Realtime updates (no Supabase channel subscription yet — would noise
 *     up the UI before we have many active users; revisit when traffic justifies).
 */

import { useCallback, useEffect, useState } from 'react'
import { Trash2, Edit3, X, Save, EyeOff } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import { useCurator } from '../../auth/hooks/useCurator'
import {
  fetchComments,
  postComment,
  editComment,
  moderateComment,
  deleteComment,
  type SongComment,
} from '../services/engagementClient'

interface Props {
  videoId: string
}

const PAGE_SIZE = 20

export function CommentsSection({ videoId }: Props) {
  const { user } = useAuth()
  const { isCurator } = useCurator()
  const [comments, setComments] = useState<SongComment[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await fetchComments(videoId, { limit: PAGE_SIZE })
      setComments(page.comments)
      setNextCursor(page.next_cursor)
      setTotalCount(page.total_count)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load comments')
    } finally {
      setLoading(false)
    }
  }, [videoId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handlePost() {
    const trimmed = draft.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await postComment(videoId, trimmed)
      // Prepend so the user sees their comment instantly without paging.
      setComments((prev) => [created, ...prev])
      setTotalCount((n) => n + 1)
      setDraft('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post comment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLoadMore() {
    if (!nextCursor || loading) return
    setLoading(true)
    try {
      const page = await fetchComments(videoId, {
        before: nextCursor,
        limit: PAGE_SIZE,
      })
      setComments((prev) => [...prev, ...page.comments])
      setNextCursor(page.next_cursor)
      // total_count is authoritative; only refresh if it drifted (shouldn't).
      setTotalCount(page.total_count)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(c: SongComment) {
    setEditingId(c.id)
    setEditDraft(c.body)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }

  async function saveEdit(commentId: string) {
    const trimmed = editDraft.trim()
    if (!trimmed) return
    try {
      const updated = await editComment(commentId, trimmed)
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
      cancelEdit()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save edit')
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setTotalCount((n) => Math.max(0, n - 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete comment')
    }
  }

  async function handleHide(commentId: string) {
    const reason = prompt('Reason for hiding (optional):')
    if (reason === null) return // user cancelled
    try {
      const updated = await moderateComment(commentId, 'hidden', reason || null)
      // Curators see hidden comments; non-curators don't. Replace in-place
      // so the curator's view reflects the new status badge.
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not hide comment')
    }
  }

  return (
    <section className="mt-6 space-y-4">
      <header className="flex items-baseline gap-2">
        <h3 className="text-base font-semibold text-gray-200">Comments</h3>
        <span className="text-xs text-gray-500">
          {totalCount === 0
            ? 'No comments yet'
            : totalCount === 1
              ? '1 comment'
              : `${totalCount} comments`}
        </span>
      </header>

      {/* Composer */}
      {user ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share what you noticed about this song, suggest a correction, or just say hi…"
            rows={3}
            maxLength={4000}
            className="w-full resize-y rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-amber-500 focus:outline-none"
            disabled={submitting}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {draft.length}/4000
            </span>
            <button
              type="button"
              onClick={handlePost}
              disabled={!draft.trim() || submitting}
              className="rounded-full bg-amber-500/20 border border-amber-500/50 px-4 py-1 text-sm text-amber-300 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-sm text-gray-400">
          Sign in to leave a comment or suggest a correction.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* List */}
      <ul className="space-y-3">
        {comments.map((c) => (
          <li
            key={c.id}
            className={`rounded-md border px-3 py-2 ${
              c.status === 'hidden'
                ? 'border-amber-700/40 bg-amber-900/10'
                : 'border-gray-800 bg-gray-900/40'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-gray-200">
                  {c.author_name || 'Anonymous'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(c.created_at)}
                  {c.edited_at && ' · edited'}
                </span>
                {c.status === 'hidden' && (
                  <span className="rounded-full bg-amber-700/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                    hidden
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {c.is_mine && editingId !== c.id && (
                  <>
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => startEdit(c)}
                      className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-200"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => handleDelete(c.id)}
                      className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </>
                )}
                {isCurator && c.status === 'visible' && !c.is_mine && (
                  <button
                    type="button"
                    title="Hide (curator)"
                    onClick={() => handleHide(c.id)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-amber-400"
                  >
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
            </div>
            {editingId === c.id ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  className="w-full resize-y rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-400 hover:text-gray-200"
                  >
                    <X className="h-3 w-3" aria-hidden /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(c.id)}
                    disabled={!editDraft.trim() || editDraft.trim() === c.body}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/50 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-3 w-3" aria-hidden /> Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">
                {c.body}
              </p>
            )}
          </li>
        ))}
      </ul>

      {comments.length === 0 && !loading && !error && (
        <p className="text-sm text-gray-500">Be the first to comment.</p>
      )}

      {nextCursor && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-full border border-gray-700 px-4 py-1 text-sm text-gray-300 hover:border-gray-500 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load older comments'}
          </button>
        </div>
      )}
    </section>
  )
}

/** Lightweight relative-time label. We don't need date-fns for this. */
function formatTimeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
