/**
 * Heart toggle below the lyrics panel on /play. Anyone can read the count;
 * only authenticated users can toggle. We show a friendly "Sign in to like"
 * tooltip for anon visitors instead of failing silently on click.
 */

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth'
import {
  fetchLikeStatus,
  postLike,
  deleteLike,
  type LikeStatus,
} from '../services/engagementClient'

interface Props {
  videoId: string
}

export function LikeButton({ videoId }: Props) {
  const { user } = useAuth()
  const [status, setStatus] = useState<LikeStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await fetchLikeStatus(videoId)
        if (!cancelled) setStatus(s)
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Could not load likes')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [videoId])

  async function handleToggle() {
    if (!user) return // tooltip explains why
    if (!status || busy) return
    setBusy(true)
    setError(null)
    // Optimistic update so the heart feels instant on slow connections.
    const optimistic: LikeStatus = {
      ...status,
      liked_by_me: !status.liked_by_me,
      like_count: status.like_count + (status.liked_by_me ? -1 : 1),
    }
    setStatus(optimistic)
    try {
      const next = status.liked_by_me ? await deleteLike(videoId) : await postLike(videoId)
      setStatus(next)
    } catch (e) {
      // Roll back on failure.
      setStatus(status)
      setError(e instanceof Error ? e.message : 'Like failed')
    } finally {
      setBusy(false)
    }
  }

  const count = status?.like_count ?? 0
  const liked = !!status?.liked_by_me
  const disabled = !user || busy
  const tooltip = !user
    ? 'Sign in to like this song'
    : liked
      ? 'Unlike'
      : 'Like'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title={tooltip}
        aria-pressed={liked}
        aria-label={tooltip}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
          liked
            ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
            : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
        } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
      >
        <Heart
          className={`h-4 w-4 ${liked ? 'fill-rose-400 stroke-rose-400' : ''}`}
          aria-hidden
        />
        <span className="tabular-nums">{count}</span>
      </button>
      {error && (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
