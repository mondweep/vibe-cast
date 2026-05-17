// Song-request queue.
//
// Public visitors POST a YouTube URL they'd like added to the verified library.
// The curator (mondweep@*) reads the queue and processes requests via /play.
//
// Anonymous requesters are accepted but rate-limited to 1 request/visitor_id/day
// to keep spam manageable while we're small. Signed-in requesters are not rate
// limited — we know who they are.
//
// On every successful insert we send a Telegram message to the curator. The
// notification is fire-and-forget; failure never blocks the user's response.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Same allowlist as verifySong. The DB RLS enforces this server-side; the
// allowlist here is for early-exit / better error messages.
const CURATOR_EMAILS = new Set(['mondweep@gmail.com', 'mondweep@dxsure.uk'])

// Anon rate limit: 1 request per visitor_id per 24h. Signed-in callers skip.
const ANON_RATE_LIMIT_WINDOW_HOURS = 24
const ANON_RATE_LIMIT_MAX_PER_WINDOW = 1

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

/**
 * Parse a YouTube URL or raw 11-char videoId.
 * Returns null if we can't extract a videoId.
 */
function extractVideoId(input: string): string | null {
  const trimmed = (input || '').trim()
  if (!trimmed) return null

  // Raw 11-char videoId
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed

  // URL form (canonical, short, embed, music.youtube.com)
  try {
    const u = new URL(trimmed)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v
      // /embed/<id>, /shorts/<id>, /v/<id>
      const m = u.pathname.match(/\/(?:embed|shorts|v)\/([A-Za-z0-9_-]{11})/)
      if (m) return m[1]
    }
  } catch {
    // not a URL
  }
  return null
}

async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    if (!r.ok) return null
    const j = (await r.json()) as any
    return j?.title ?? null
  } catch {
    return null
  }
}

/** Fire-and-forget Telegram message to the curator. Best-effort; never throws. */
async function notifyCurator(opts: {
  videoId: string
  title: string | null
  requesterEmail: string | null
  visitorId: string | null
  notes: string | null
  pendingTotal: number
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CURATOR_CHAT_ID
  if (!token || !chatId) {
    console.warn(
      '[songRequests] Telegram not configured (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID); skipping notification'
    )
    return
  }
  const requester = opts.requesterEmail
    ? opts.requesterEmail
    : opts.visitorId
      ? `anon visitor ${opts.visitorId.slice(0, 8)}`
      : 'unknown'
  const lines = [
    '🎵 *New SanskritSync song request*',
    `Title: ${opts.title || '_(no title fetched)_'}`,
    `URL: https://youtube.com/watch?v=${opts.videoId}`,
    `From: ${requester}`,
    opts.notes ? `Note: ${opts.notes.slice(0, 200)}` : '',
    `Queue: ${opts.pendingTotal} pending`,
    'Review at /queue',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    })
  } catch (err) {
    console.warn(
      '[songRequests] Telegram notify failed:',
      err instanceof Error ? err.message : err
    )
  }
}

export interface SubmitSongRequest {
  url?: string
  videoId?: string
  notes?: string
  visitorId?: string
}

export interface SubmitResult {
  status: 'created' | 'already-in-library' | 'already-requested' | 'rate-limited' | 'invalid'
  videoId?: string
  message?: string
  request?: any
}

/**
 * Submit a new song request. The supplied `jwt` is optional (anon callers
 * pass null). Returns a discriminated result the server route can turn into
 * an HTTP status code.
 */
export async function submitSongRequest(
  jwt: string | null,
  body: SubmitSongRequest
): Promise<SubmitResult> {
  const videoId = extractVideoId(body.videoId || body.url || '')
  if (!videoId) {
    return { status: 'invalid', message: 'Could not extract a YouTube video ID from the URL' }
  }

  // Read caller identity from the JWT (if present), via the anon client.
  let requesterUserId: string | null = null
  let requesterEmail: string | null = null
  if (jwt) {
    const sbAuth = clientForJwt(jwt)
    const { data } = await sbAuth.auth.getUser(jwt)
    if (data?.user) {
      requesterUserId = data.user.id
      requesterEmail = (data.user.email || '').toLowerCase() || null
    }
  }

  // Prefer service-role for the dedup/check queries — they need to read across
  // RLS boundaries that the anon role can't see (e.g., other visitors' rows).
  // Fall back to the anon client if service key isn't configured.
  const sb = serviceClient() ?? clientForJwt(jwt)

  // Dedup #1: already in the verified library?
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
  const altUrl = `https://youtube.com/watch?v=${videoId}`
  const { data: existingSong } = await (sb
    .from('songs')
    .select('id, title, verified')
    .in('youtube_url', [youtubeUrl, altUrl])
    .maybeSingle() as any)
  if (existingSong) {
    return {
      status: 'already-in-library',
      videoId,
      message: `"${existingSong.title || 'This song'}" is already in the library — open /play?v=${videoId}`,
    }
  }

  // Dedup #2: already a pending request for this video?
  const { data: existingPending } = await (sb
    .from('song_requests')
    .select('id, title, created_at')
    .eq('video_id', videoId)
    .eq('status', 'pending')
    .maybeSingle() as any)
  if (existingPending) {
    return {
      status: 'already-requested',
      videoId,
      message: 'Someone has already requested this song — it\'s in the curator\'s queue.',
    }
  }

  // Rate limit for anon requesters: 1 request per visitor_id per 24h.
  if (!requesterUserId && body.visitorId) {
    const since = new Date(Date.now() - ANON_RATE_LIMIT_WINDOW_HOURS * 3600_000).toISOString()
    const { count } = await (sb
      .from('song_requests')
      .select('id', { count: 'exact', head: true })
      .eq('visitor_id', body.visitorId)
      .gte('created_at', since) as any)
    if ((count ?? 0) >= ANON_RATE_LIMIT_MAX_PER_WINDOW) {
      return {
        status: 'rate-limited',
        message:
          `You've already submitted ${ANON_RATE_LIMIT_MAX_PER_WINDOW} request in the last ` +
          `${ANON_RATE_LIMIT_WINDOW_HOURS} hours. Sign in to submit more, or try again tomorrow.`,
      }
    }
  }

  // Enrich with YouTube title (best-effort; null is fine).
  const title = await fetchYouTubeTitle(videoId)

  // Insert. RLS allows anon INSERT.
  const { data: inserted, error: insertErr } = await (sb
    .from('song_requests')
    .insert({
      video_id: videoId,
      youtube_url: youtubeUrl,
      title,
      notes: (body.notes || '').slice(0, 500) || null,
      requested_by_user_id: requesterUserId,
      requested_by_email: requesterEmail,
      visitor_id: requesterUserId ? null : body.visitorId || null,
    })
    .select()
    .single() as any)
  if (insertErr) {
    console.error('[songRequests] insert failed:', insertErr.message)
    return { status: 'invalid', message: insertErr.message }
  }

  // Fire-and-forget Telegram notification.
  const { count: pendingTotal } = await (sb
    .from('song_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending') as any)
  notifyCurator({
    videoId,
    title,
    requesterEmail,
    visitorId: requesterUserId ? null : body.visitorId || null,
    notes: body.notes || null,
    pendingTotal: pendingTotal ?? 0,
  })

  return { status: 'created', videoId, request: inserted }
}

/**
 * List pending requests for the curator queue.
 * Throws if the JWT's email isn't on the curator allowlist (the DB RLS would
 * also reject, but failing early gives a cleaner error message).
 */
export async function listPendingRequests(
  jwt: string
): Promise<{ requests: any[] }> {
  const sbAuth = clientForJwt(jwt)
  const { data: u } = await sbAuth.auth.getUser(jwt)
  const email = (u?.user?.email || '').toLowerCase()
  if (!CURATOR_EMAILS.has(email)) {
    throw new Error('Only the curator can read the song-request queue')
  }
  const sb = serviceClient() ?? sbAuth
  const { data, error } = await (sb
    .from('song_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false }) as any)
  if (error) throw new Error(error.message)
  return { requests: (data as any[]) ?? [] }
}

/**
 * Mark a request as rejected (or accepted/duplicate). Accepted is also set
 * automatically by verifySong when it processes a queued videoId, but the
 * curator can manually mark too.
 */
export async function updateRequestStatus(
  jwt: string,
  id: string,
  status: 'accepted' | 'rejected' | 'duplicate',
  reason?: string
): Promise<{ ok: true }> {
  const sbAuth = clientForJwt(jwt)
  const { data: u } = await sbAuth.auth.getUser(jwt)
  const email = (u?.user?.email || '').toLowerCase()
  if (!CURATOR_EMAILS.has(email)) {
    throw new Error('Only the curator can update song requests')
  }
  const userId = u?.user?.id || null
  const sb = serviceClient() ?? sbAuth
  const { error } = await (sb
    .from('song_requests')
    .update({
      status,
      rejection_reason: status === 'rejected' ? reason || null : null,
      processed_at: new Date().toISOString(),
      processed_by: userId,
    })
    .eq('id', id) as any)
  if (error) throw new Error(error.message)
  return { ok: true }
}
