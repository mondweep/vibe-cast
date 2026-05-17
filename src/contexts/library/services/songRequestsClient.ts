// Frontend client for /api/song-requests.
//
// submitSongRequest is callable from anonymous visitors (the request form on
// PlayPage). listPendingRequests + updateRequestStatus require a curator JWT
// and are used from /queue.

import { supabase } from '../../../shared/lib/supabaseClient';

export interface SongRequestRow {
  id: string;
  video_id: string;
  youtube_url: string;
  title: string | null;
  notes: string | null;
  requested_by_user_id: string | null;
  requested_by_email: string | null;
  visitor_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'duplicate';
  rejection_reason: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

export interface SubmitResponse {
  status: 'created' | 'already-in-library' | 'already-requested' | 'rate-limited' | 'invalid';
  videoId?: string;
  message?: string;
  request?: SongRequestRow;
}

function readVisitorId(): string | null {
  return localStorage.getItem('visitor_id');
}

async function maybeJwt(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function submitSongRequest(input: {
  url?: string;
  videoId?: string;
  notes?: string;
}): Promise<SubmitResponse> {
  const jwt = await maybeJwt();
  const visitor_id = readVisitorId();
  const r = await fetch('/api/song-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({ ...input, visitorId: visitor_id }),
  });
  // The server returns structured `status` codes in the body even for non-2xx,
  // so always parse JSON and let the caller branch on `status`.
  const body = (await r.json().catch(() => ({}))) as SubmitResponse;
  return body;
}

export async function listPendingRequests(): Promise<SongRequestRow[]> {
  const jwt = await maybeJwt();
  if (!jwt) throw new Error('Sign in as the curator to view the queue');
  const r = await fetch('/api/song-requests', {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error((err as any).error || `HTTP ${r.status}`);
  }
  const body = (await r.json()) as { requests: SongRequestRow[] };
  return body.requests || [];
}

export async function updateRequestStatus(
  id: string,
  status: 'accepted' | 'rejected' | 'duplicate',
  reason?: string,
): Promise<void> {
  const jwt = await maybeJwt();
  if (!jwt) throw new Error('Sign in as the curator to update requests');
  const r = await fetch(`/api/song-requests/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ status, reason }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error((err as any).error || `HTTP ${r.status}`);
  }
}
