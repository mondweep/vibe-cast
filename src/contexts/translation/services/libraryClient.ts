// Frontend client for the verified-library curation endpoints.
// All calls require the signed-in user's Supabase JWT; the server enforces
// the curator allowlist before any write goes through.

import { supabase } from '../../../shared/lib/supabaseClient';
import type { LyricsLine } from '../../../shared/types/database.types';

const CURATOR_EMAILS = new Set(['mondweep@gmail.com', 'mondweep@dxsure.uk']);

export function isCuratorEmail(email: string | undefined | null): boolean {
  return !!email && CURATOR_EMAILS.has(email.toLowerCase());
}

async function authHeader(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface VerifyResult {
  song: { id: string; verified: boolean; verified_at: string };
  wordExtraction: { line_number: number; words?: number; error?: string }[];
}

export async function verifySong(args: {
  videoId: string;
  lines: LyricsLine[];
  title?: string;
  language?: string;
}): Promise<VerifyResult> {
  const r = await fetch('/api/songs/verify', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify(args),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `verify failed (${r.status})`);
  }
  return r.json();
}

export async function unverifySong(videoId: string): Promise<{ ok: true }> {
  const r = await fetch('/api/songs/unverify', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ videoId }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `unverify failed (${r.status})`);
  }
  return r.json();
}
