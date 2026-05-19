// Frontend client for the engagement API (likes + comments).
//
// All write endpoints require a JWT; we forward whatever Supabase has cached
// on the current session via `Authorization: Bearer …`. Reads work without
// auth and return the public-visible subset.

import { supabase } from '../../../shared/lib/supabaseClient'

export interface LikeStatus {
  song_id: string
  like_count: number
  liked_by_me: boolean
}

export interface SongComment {
  id: string
  song_id: string
  user_id: string | null
  author_name: string | null
  body: string
  status: 'visible' | 'hidden' | 'flagged'
  created_at: string
  edited_at: string | null
  is_mine: boolean
}

export interface CommentsPage {
  comments: SongComment[]
  next_cursor: string | null
  total_count: number
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function jsonOrThrow<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let detail = ''
    try {
      const body = (await resp.json()) as { error?: string }
      detail = body?.error || ''
    } catch {
      detail = await resp.text().catch(() => '')
    }
    throw new Error(detail || `${resp.status} ${resp.statusText}`)
  }
  return resp.json() as Promise<T>
}

// --- Likes ---

export async function fetchLikeStatus(videoId: string): Promise<LikeStatus> {
  const headers = await authHeaders()
  const r = await fetch(`/api/songs/${encodeURIComponent(videoId)}/likes`, { headers })
  return jsonOrThrow<LikeStatus>(r)
}

export async function postLike(videoId: string): Promise<LikeStatus> {
  const headers = await authHeaders()
  const r = await fetch(`/api/songs/${encodeURIComponent(videoId)}/likes`, {
    method: 'POST',
    headers,
  })
  return jsonOrThrow<LikeStatus>(r)
}

export async function deleteLike(videoId: string): Promise<LikeStatus> {
  const headers = await authHeaders()
  const r = await fetch(`/api/songs/${encodeURIComponent(videoId)}/likes`, {
    method: 'DELETE',
    headers,
  })
  return jsonOrThrow<LikeStatus>(r)
}

// --- Comments ---

export async function fetchComments(
  videoId: string,
  opts: { before?: string | null; limit?: number } = {}
): Promise<CommentsPage> {
  const headers = await authHeaders()
  const params = new URLSearchParams()
  if (opts.before) params.set('before', opts.before)
  if (opts.limit) params.set('limit', String(opts.limit))
  const qs = params.toString()
  const r = await fetch(
    `/api/songs/${encodeURIComponent(videoId)}/comments${qs ? `?${qs}` : ''}`,
    { headers }
  )
  return jsonOrThrow<CommentsPage>(r)
}

export async function postComment(
  videoId: string,
  body: string
): Promise<SongComment> {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
  const r = await fetch(`/api/songs/${encodeURIComponent(videoId)}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ body }),
  })
  return jsonOrThrow<SongComment>(r)
}

export async function editComment(
  commentId: string,
  body: string
): Promise<SongComment> {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
  const r = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ body }),
  })
  return jsonOrThrow<SongComment>(r)
}

export async function moderateComment(
  commentId: string,
  status: 'visible' | 'hidden' | 'flagged',
  hidden_reason?: string | null
): Promise<SongComment> {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
  const r = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status, hidden_reason }),
  })
  return jsonOrThrow<SongComment>(r)
}

export async function deleteComment(commentId: string): Promise<{ ok: true }> {
  const headers = await authHeaders()
  const r = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers,
  })
  return jsonOrThrow<{ ok: true }>(r)
}
