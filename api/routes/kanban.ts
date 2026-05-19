// Public Kanban / roadmap (KAN-001 in KANBAN.md).
//
// DB is the source of truth. The public /roadmap UI is read-only EXCEPT
// for two writes:
//
//   GET    /api/kanban                       — list all items + caller's vote state (public)
//   POST   /api/kanban/items/:id/votes       — authed: cast a vote
//   DELETE /api/kanban/items/:id/votes       — authed: remove your vote
//   PATCH  /api/kanban/items/:id             — curator-only: move between lanes
//
// Curator move-lane writes update `status` and side-effect `started_at` /
// `completed_at` so the UI can show "shipped on …" without the curator
// having to set those timestamps manually. Bulk item authoring (title /
// summary / body / new item creation) is still done via Cowork (chat-
// driven SQL through Claude) — that pattern's lower-friction than building
// a full admin form for fields that rarely change.
//
// Vote semantics: one vote per (item, user). Re-voting is idempotent
// (PK conflict swallowed). Un-voting only removes the caller's row.

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { isCuratorEmail } from '../lib/curatorAllowlist.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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

async function callerUserId(jwt: string | null): Promise<string | null> {
  if (!jwt) return null
  const sb = clientForJwt(jwt)
  const { data } = await sb.auth.getUser(jwt)
  return data?.user?.id ?? null
}

async function callerIdentity(
  jwt: string | null
): Promise<{ userId: string | null; email: string | null }> {
  if (!jwt) return { userId: null, email: null }
  const sb = clientForJwt(jwt)
  const { data } = await sb.auth.getUser(jwt)
  if (!data?.user) return { userId: null, email: null }
  return {
    userId: data.user.id,
    email: (data.user.email || '').toLowerCase() || null,
  }
}

export interface KanbanItem {
  id: string
  code: string
  title: string
  summary: string
  body: string | null
  status: 'backlog' | 'in_progress' | 'done'
  display_order: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  vote_count: number
  voted_by_me: boolean
}

/** List the whole board in one shot — small table, no need to paginate. */
export async function listKanban(
  jwt: string | null
): Promise<{ items: KanbanItem[] }> {
  const userId = await callerUserId(jwt)
  // Use service client where available so anon visitors still see counts.
  const sb = serviceClient() ?? clientForJwt(jwt)

  const { data: items, error: itemsErr } = await sb
    .from('kanban_items')
    .select(
      'id, code, title, summary, body, status, display_order, started_at, completed_at, created_at'
    )
    .order('status', { ascending: true })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (itemsErr || !items) return { items: [] }

  // One round-trip for all votes; group client-side.
  const { data: votes } = await sb
    .from('kanban_votes')
    .select('item_id, user_id')
  const countById = new Map<string, number>()
  const myVotes = new Set<string>()
  for (const v of (votes as Array<{ item_id: string; user_id: string }>) || []) {
    countById.set(v.item_id, (countById.get(v.item_id) ?? 0) + 1)
    if (userId && v.user_id === userId) myVotes.add(v.item_id)
  }

  return {
    items: (items as any[]).map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      summary: r.summary,
      body: r.body,
      status: r.status,
      display_order: r.display_order,
      started_at: r.started_at,
      completed_at: r.completed_at,
      created_at: r.created_at,
      vote_count: countById.get(r.id) ?? 0,
      voted_by_me: myVotes.has(r.id),
    })),
  }
}

export interface VoteResult {
  item_id: string
  vote_count: number
  voted_by_me: boolean
}

async function voteCount(
  sb: SupabaseClient,
  itemId: string
): Promise<number> {
  const { count } = await sb
    .from('kanban_votes')
    .select('*', { count: 'exact', head: true })
    .eq('item_id', itemId)
  return count ?? 0
}

export async function castVote(
  jwt: string | null,
  itemId: string
): Promise<VoteResult | { error: string }> {
  const userId = await callerUserId(jwt)
  if (!userId) return { error: 'auth-required' }

  const sb = clientForJwt(jwt)

  // Validate item exists (gives a clean 404 instead of a foreign-key error).
  const { data: existing } = await (sb
    .from('kanban_items')
    .select('id')
    .eq('id', itemId)
    .maybeSingle() as any)
  if (!existing) return { error: 'item-not-found' }

  // Idempotent insert. RLS enforces user_id = auth.uid().
  await sb.from('kanban_votes').upsert(
    { item_id: itemId, user_id: userId },
    { onConflict: 'item_id,user_id', ignoreDuplicates: true }
  )

  // Use the service client for the post-vote count so anonymous reads of
  // /api/kanban (which use it) and this response stay consistent.
  const counter = serviceClient() ?? sb
  return {
    item_id: itemId,
    vote_count: await voteCount(counter, itemId),
    voted_by_me: true,
  }
}

export async function removeVote(
  jwt: string | null,
  itemId: string
): Promise<VoteResult | { error: string }> {
  const userId = await callerUserId(jwt)
  if (!userId) return { error: 'auth-required' }

  const sb = clientForJwt(jwt)
  await sb
    .from('kanban_votes')
    .delete()
    .eq('item_id', itemId)
    .eq('user_id', userId)

  const counter = serviceClient() ?? sb
  return {
    item_id: itemId,
    vote_count: await voteCount(counter, itemId),
    voted_by_me: false,
  }
}

// ---------------------------------------------------------------------------
// Curator: move an item between swim lanes.
// ---------------------------------------------------------------------------
//
// Lifecycle timestamps are side-effected here so the UI can show "Shipped
// 2026-05-19" on done cards without the curator setting them manually:
//
//   → in_progress:  started_at = NOW() if currently null
//   → done:         completed_at = NOW() if currently null
//   → backlog:      started_at and completed_at are PRESERVED, so we keep
//                   the historical trace if an item was sent back for rework
//
// We deliberately don't allow setting both started_at and completed_at
// directly via this endpoint — they're status-derived. If the curator
// wants to backdate either, that's a Cowork SQL edit, same as content edits.

export type LaneStatus = 'backlog' | 'in_progress' | 'done'

export interface UpdateItemArgs {
  status?: LaneStatus
}

export async function updateItem(
  jwt: string | null,
  itemId: string,
  args: UpdateItemArgs
): Promise<KanbanItem | { error: string }> {
  const { email } = await callerIdentity(jwt)
  if (!email) return { error: 'auth-required' }
  const isCurator = await isCuratorEmail(email)
  if (!isCurator) return { error: 'curator-only' }

  if (!args.status) return { error: 'no-fields-to-update' }
  if (!['backlog', 'in_progress', 'done'].includes(args.status)) {
    return { error: 'invalid-status' }
  }

  // Prefer service client so the write isn't subject to the curator-allowlist
  // RLS subquery's row-visibility nuances. RLS still gates direct anon/auth
  // writes via the policy; this is server-side curator-authenticated code.
  const sb = serviceClient() ?? clientForJwt(jwt)

  // Look up the current row so we can compute timestamp side-effects.
  const { data: existing } = await (sb
    .from('kanban_items')
    .select('id, status, started_at, completed_at')
    .eq('id', itemId)
    .maybeSingle() as any)
  if (!existing) return { error: 'item-not-found' }

  const patch: Record<string, unknown> = { status: args.status }

  // Set started_at the first time the item enters in_progress (or done
  // directly — rare, but we still want a start timestamp).
  if (
    (args.status === 'in_progress' || args.status === 'done') &&
    !existing.started_at
  ) {
    patch.started_at = new Date().toISOString()
  }
  // Set completed_at the first time the item enters done.
  if (args.status === 'done' && !existing.completed_at) {
    patch.completed_at = new Date().toISOString()
  }
  // Moving OUT of done doesn't clear completed_at — we keep the historical
  // first-ship date. If the curator wants to truly reset, that's a Cowork edit.

  const { data, error } = await sb
    .from('kanban_items')
    .update(patch)
    .eq('id', itemId)
    .select(
      'id, code, title, summary, body, status, display_order, started_at, completed_at, created_at'
    )
    .single()

  if (error || !data) return { error: error?.message || 'update-failed' }

  // Re-attach vote info so the caller can replace the optimistic card row.
  const counter = serviceClient() ?? sb
  const vc = await voteCount(counter, itemId)
  const { userId } = await callerIdentity(jwt)
  let votedByMe = false
  if (userId) {
    const { data: mv } = await (counter
      .from('kanban_votes')
      .select('item_id')
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .maybeSingle() as any)
    votedByMe = !!mv
  }

  return {
    id: (data as any).id,
    code: (data as any).code,
    title: (data as any).title,
    summary: (data as any).summary,
    body: (data as any).body,
    status: (data as any).status,
    display_order: (data as any).display_order,
    started_at: (data as any).started_at,
    completed_at: (data as any).completed_at,
    created_at: (data as any).created_at,
    vote_count: vc,
    voted_by_me: votedByMe,
  }
}
