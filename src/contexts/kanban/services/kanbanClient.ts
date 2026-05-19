// Frontend client for the public Kanban / roadmap API.
//
// Reads are open to everyone; vote/unvote require a JWT (the server +
// RLS enforce both, but we attach the Bearer header when one's cached so
// the caller is recognised).

import { supabase } from '../../../shared/lib/supabaseClient'

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

export async function fetchKanban(): Promise<{ items: KanbanItem[] }> {
  const headers = await authHeaders()
  const r = await fetch('/api/kanban', { headers })
  return jsonOrThrow(r)
}

export interface VoteResult {
  item_id: string
  vote_count: number
  voted_by_me: boolean
}

export async function castVote(itemId: string): Promise<VoteResult> {
  const headers = await authHeaders()
  const r = await fetch(
    `/api/kanban/items/${encodeURIComponent(itemId)}/votes`,
    { method: 'POST', headers }
  )
  return jsonOrThrow(r)
}

export async function removeVote(itemId: string): Promise<VoteResult> {
  const headers = await authHeaders()
  const r = await fetch(
    `/api/kanban/items/${encodeURIComponent(itemId)}/votes`,
    { method: 'DELETE', headers }
  )
  return jsonOrThrow(r)
}

/** Curator-only: move an item to a new swim lane. Server side-effects
 *  started_at / completed_at as appropriate. Returns the full updated
 *  KanbanItem (so the caller can drop it back into the items array). */
export async function updateItemStatus(
  itemId: string,
  status: KanbanItem['status']
): Promise<KanbanItem> {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
  const r = await fetch(`/api/kanban/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  })
  return jsonOrThrow(r)
}
