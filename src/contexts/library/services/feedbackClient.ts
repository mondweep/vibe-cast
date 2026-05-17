// Frontend client for /api/feedback.

import { supabase } from '../../../shared/lib/supabaseClient';

export type FeedbackKind = 'comment' | 'suggestion' | 'curator_application';

export type FeedbackStatus =
  | 'new'
  | 'in_progress'
  | 'responded'
  | 'closed'
  | 'accepted'
  | 'rejected';

export interface FeedbackRow {
  id: string;
  kind: FeedbackKind;
  subject: string | null;
  body: string;
  applicant_name: string | null;
  sanskrit_background: string | null;
  traditions_familiar: string | null;
  weekly_hours: number | null;
  motivation: string | null;
  requested_by_user_id: string | null;
  requested_by_email: string | null;
  visitor_id: string | null;
  display_name: string | null;
  status: FeedbackStatus;
  internal_notes: string | null;
  response_summary: string | null;
  is_public: boolean;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
}

export interface SubmitFeedbackInput {
  kind: FeedbackKind;
  body: string;
  subject?: string;
  // Curator-application fields
  applicant_name?: string;
  email?: string;
  sanskrit_background?: string;
  traditions_familiar?: string;
  weekly_hours?: number;
  motivation?: string;
  // Common
  display_name?: string;
  is_public?: boolean;
}

export interface SubmitFeedbackResponse {
  status: 'created' | 'rate-limited' | 'invalid';
  message?: string;
  feedback?: FeedbackRow;
}

function readVisitorId(): string | null {
  return localStorage.getItem('visitor_id');
}

async function maybeJwt(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<SubmitFeedbackResponse> {
  const jwt = await maybeJwt();
  const visitor_id = readVisitorId();
  const r = await fetch('/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({ ...input, visitorId: visitor_id }),
  });
  const body = (await r.json().catch(() => ({}))) as SubmitFeedbackResponse;
  return body;
}

export async function listFeedback(filter?: {
  kind?: FeedbackKind;
  status?: FeedbackStatus;
}): Promise<FeedbackRow[]> {
  const jwt = await maybeJwt();
  if (!jwt) throw new Error('Sign in as the curator to view feedback');
  const params = new URLSearchParams();
  if (filter?.kind) params.set('kind', filter.kind);
  if (filter?.status) params.set('status', filter.status);
  const qs = params.toString();
  const r = await fetch(`/api/feedback${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error((err as any).error || `HTTP ${r.status}`);
  }
  const body = (await r.json()) as { feedback: FeedbackRow[] };
  return body.feedback || [];
}

export async function updateFeedback(
  id: string,
  patch: { status?: FeedbackStatus; internal_notes?: string; response_summary?: string; is_public?: boolean },
): Promise<void> {
  const jwt = await maybeJwt();
  if (!jwt) throw new Error('Sign in as the curator');
  const r = await fetch(`/api/feedback/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error((err as any).error || `HTTP ${r.status}`);
  }
}
