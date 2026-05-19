// Song engagement: likes + comments.
//
// Phase 1 of ENG-001 (see KANBAN.md). Authenticated users can like songs
// (toggle on/off, one (song,user) row) and post plain text comments below
// the lyrics on /play. Comments are paginated cursor-style on `created_at`
// so a fresh comment arriving while the user is mid-scroll doesn't shift
// page boundaries. The curator gets a daily Telegram digest of new
// activity (separate scheduled job, not this file).
//
// Trust model:
//   - Likes / comments: authenticated-only, RLS enforces "you can only
//     write rows where user_id = auth.uid()". Reads are public for likes
//     (anyone sees aggregate counts) and for visible comments. The DB
//     enforces those rules; the route just rejects unauth requests early
//     with a friendly message instead of letting the RLS error bubble.
//   - Moderation: curator may hide/edit/delete any row. Phase-1 surfaces
//     "hide" via PATCH /api/comments/:id { status: 'hidden' }.
//
// Pagination:
//   - GET /api/songs/:videoId/comments?before=<iso>&limit=20
//   - Cursor `before` is the createdAt of the oldest comment the client
//     already has; we return the next page newer-first older-than-cursor.
//   - First page omits `before` and gets the latest 20.
//   - Stable under inserts: a new comment doesn't shift older pages.

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { isCuratorEmail } from '../lib/curatorAllowlist.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

function clientForJwt(jwt: string | null): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : {},
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function serviceClient(): SupabaseClient | null {
  if (!SUPABASE_SERVICE_ROLE) return null
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ---------------------------------------------------------------------------
// Helpers: resolve a songId from a videoId (incoming URL param)
// ---------------------------------------------------------------------------

function urlVariants(videoId: string): string[] {
  return [
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtube.com/watch?v=${videoId}`,
  ]
}

async function resolveSongId(
  sb: SupabaseClient,
  videoId: string
): Promise<string | null> {
  const { data } = await (sb
    .from('songs')
    .select('id')
    .in('youtube_url', urlVariants(videoId))
    .maybeSingle() as any)
  return data?.id ?? null
}

async function callerIdentity(
  jwt: string | null
): Promise<{ userId: string | null; email: string | null; name: string | null }> {
  if (!jwt) return { userId: null, email: null, name: null }
  const sb = clientForJwt(jwt)
  const { data } = await sb.auth.getUser(jwt)
  if (!data?.user) return { userId: null, email: null, name: null }
  const meta = (data.user.user_metadata || {}) as Record<string, unknown>
  // Prefer explicit display name, then full_name (set by some OAuth providers),
  // then the local-part of the email, then "anon".
  const name =
    (typeof meta.display_name === 'string' && meta.display_name) ||
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (data.user.email ? data.user.email.split('@')[0] : null)
  return {
    userId: data.user.id,
    email: (data.user.email || '').toLowerCase() || null,
    name: name || null,
  }
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export interface LikeStatus {
  song_id: string
  like_count: number
  liked_by_me: boolean
}

/** Public read: total like count + whether the current caller has liked. */
export async function getLikeStatus(
  jwt: string | null,
  videoId: string
): Promise<LikeStatus | { error: string }> {
  const { userId } = await callerIdentity(jwt)
  // Use service client where available so we can count likes even when the
  // caller has no JWT (anonymous /play visitors should still see the count).
  const sb = serviceClient() ?? clientForJwt(jwt)

  const songId = await resolveSongId(sb, videoId)
  if (!songId) return { error: 'song-not-found' }

  const { count } = await sb
    .from('song_likes')
    .select('*', { count: 'exact', head: true })
    .eq('song_id', songId)

  let likedByMe = false
  if (userId) {
    const { data } = await (sb
      .from('song_likes')
      .select('song_id')
      .eq('song_id', songId)
      .eq('user_id', userId)
      .maybeSingle() as any)
    likedByMe = !!data
  }

  return { song_id: songId, like_count: count ?? 0, liked_by_me: likedByMe }
}

export async function likeSong(
  jwt: string | null,
  videoId: string
): Promise<LikeStatus | { error: string }> {
  const { userId } = await callerIdentity(jwt)
  if (!userId) return { error: 'auth-required' }

  // Use the user-scoped client so RLS sees them as the inserting user.
  const sb = clientForJwt(jwt)

  const songId = await resolveSongId(sb, videoId)
  if (!songId) return { error: 'song-not-found' }

  // Idempotent: re-liking is a no-op (PK conflict swallowed).
  await sb.from('song_likes').upsert(
    { song_id: songId, user_id: userId },
    { onConflict: 'song_id,user_id', ignoreDuplicates: true }
  )

  return getLikeStatus(jwt, videoId)
}

export async function unlikeSong(
  jwt: string | null,
  videoId: string
): Promise<LikeStatus | { error: string }> {
  const { userId } = await callerIdentity(jwt)
  if (!userId) return { error: 'auth-required' }

  const sb = clientForJwt(jwt)
  const songId = await resolveSongId(sb, videoId)
  if (!songId) return { error: 'song-not-found' }

  await sb
    .from('song_likes')
    .delete()
    .eq('song_id', songId)
    .eq('user_id', userId)

  return getLikeStatus(jwt, videoId)
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

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
  /** ISO timestamp of the oldest comment in this page; pass back as `before` to fetch the next page. */
  next_cursor: string | null
  /** Total visible comments on the song (cheap aggregate, helps UI render "N comments"). */
  total_count: number
}

export async function listComments(
  jwt: string | null,
  videoId: string,
  opts: { before?: string | null; limit?: number } = {}
): Promise<CommentsPage | { error: string }> {
  const { userId, email } = await callerIdentity(jwt)
  const isCurator = email ? await isCuratorEmail(email) : false
  const sb = serviceClient() ?? clientForJwt(jwt)

  const songId = await resolveSongId(sb, videoId)
  if (!songId) return { error: 'song-not-found' }

  const limit = Math.min(
    Math.max(1, Number(opts.limit) || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  )

  // Build the page query: newest-first, optionally older than the cursor.
  // Curators see hidden rows too (for moderation triage); everyone else only
  // sees visible. RLS would already enforce this, but filtering at the query
  // level keeps the count + page consistent.
  let query = sb
    .from('song_comments')
    .select('id, song_id, user_id, author_name, body, status, created_at, edited_at')
    .eq('song_id', songId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!isCurator) {
    query = query.eq('status', 'visible')
  }
  if (opts.before) {
    query = query.lt('created_at', opts.before)
  }

  const { data: rows, error } = await query
  if (error) return { error: error.message }

  // Total visible count — also cheap with the (song_id, created_at) index.
  // We always count "visible" here, even for curators, so the public-facing
  // "N comments" label matches what non-curators see.
  const { count: totalCount } = await sb
    .from('song_comments')
    .select('*', { count: 'exact', head: true })
    .eq('song_id', songId)
    .eq('status', 'visible')

  const comments: SongComment[] = (rows || []).map((r: any) => ({
    id: r.id,
    song_id: r.song_id,
    user_id: r.user_id,
    author_name: r.author_name,
    body: r.body,
    status: r.status,
    created_at: r.created_at,
    edited_at: r.edited_at,
    is_mine: userId !== null && r.user_id === userId,
  }))

  const next_cursor =
    comments.length === limit ? comments[comments.length - 1].created_at : null

  return { comments, next_cursor, total_count: totalCount ?? 0 }
}

export interface PostCommentArgs {
  body: string
}

export async function postComment(
  jwt: string | null,
  videoId: string,
  args: PostCommentArgs
): Promise<SongComment | { error: string }> {
  const { userId, name } = await callerIdentity(jwt)
  if (!userId) return { error: 'auth-required' }

  const body = (args.body || '').trim()
  if (!body) return { error: 'body-required' }
  if (body.length > 4000) return { error: 'body-too-long' }

  const sb = clientForJwt(jwt)
  const songId = await resolveSongId(sb, videoId)
  if (!songId) return { error: 'song-not-found' }

  const { data, error } = await sb
    .from('song_comments')
    .insert({
      song_id: songId,
      user_id: userId,
      author_name: name,
      body,
    })
    .select('id, song_id, user_id, author_name, body, status, created_at, edited_at')
    .single()

  if (error || !data) return { error: error?.message || 'insert-failed' }

  return {
    id: (data as any).id,
    song_id: (data as any).song_id,
    user_id: (data as any).user_id,
    author_name: (data as any).author_name,
    body: (data as any).body,
    status: (data as any).status,
    created_at: (data as any).created_at,
    edited_at: (data as any).edited_at,
    is_mine: true,
  }
}

export interface PatchCommentArgs {
  body?: string
  status?: 'visible' | 'hidden' | 'flagged'
  hidden_reason?: string | null
}

export async function patchComment(
  jwt: string | null,
  commentId: string,
  args: PatchCommentArgs
): Promise<SongComment | { error: string }> {
  const { userId, email } = await callerIdentity(jwt)
  if (!userId) return { error: 'auth-required' }
  const isCurator = email ? await isCuratorEmail(email) : false

  const sb = clientForJwt(jwt)

  // Authors may only update `body`; curators may update status/hidden_reason.
  const patch: Record<string, unknown> = {}
  if (typeof args.body === 'string') {
    const body = args.body.trim()
    if (!body) return { error: 'body-required' }
    if (body.length > 4000) return { error: 'body-too-long' }
    patch.body = body
    patch.edited_at = new Date().toISOString()
  }
  if (isCurator && args.status) {
    patch.status = args.status
    if (args.status === 'hidden') {
      patch.hidden_at = new Date().toISOString()
      patch.hidden_by = userId
      if (args.hidden_reason !== undefined) patch.hidden_reason = args.hidden_reason
    } else {
      patch.hidden_at = null
      patch.hidden_by = null
      patch.hidden_reason = null
    }
  }
  if (Object.keys(patch).length === 0) return { error: 'no-fields-to-update' }

  const { data, error } = await sb
    .from('song_comments')
    .update(patch)
    .eq('id', commentId)
    .select('id, song_id, user_id, author_name, body, status, created_at, edited_at')
    .single()

  if (error || !data) return { error: error?.message || 'update-failed' }

  return {
    id: (data as any).id,
    song_id: (data as any).song_id,
    user_id: (data as any).user_id,
    author_name: (data as any).author_name,
    body: (data as any).body,
    status: (data as any).status,
    created_at: (data as any).created_at,
    edited_at: (data as any).edited_at,
    is_mine: (data as any).user_id === userId,
  }
}

export async function deleteComment(
  jwt: string | null,
  commentId: string
): Promise<{ ok: true } | { error: string }> {
  const { userId } = await callerIdentity(jwt)
  if (!userId) return { error: 'auth-required' }

  const sb = clientForJwt(jwt)
  // RLS enforces "author or curator". A delete on a row the caller can't see
  // simply affects 0 rows; we don't distinguish "doesn't exist" from
  // "not yours" to avoid leaking row existence.
  const { error } = await sb.from('song_comments').delete().eq('id', commentId)
  if (error) return { error: error.message }
  return { ok: true }
}
