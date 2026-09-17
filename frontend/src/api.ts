import type { NightAnalysis, JournalEntry } from '@somnus/domain';

/**
 * Sync (ADR-007).
 *
 * Every call is safe to retry: nights are upserted on a client-generated id,
 * so replaying a queued push is a no-op rather than a duplicate. Failures are
 * returned rather than thrown at the capture layer, because a sync problem
 * must never cost the user a night.
 */
export interface Session {
  readonly idToken: string | null;
}

async function authed(path: string, session: Session, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (session.idToken !== null) headers.set('authorization', `Bearer ${session.idToken}`);
  return fetch(`/api/v1${path}`, { ...init, headers });
}

export const api = {
  async pushNight(session: Session, analysis: NightAnalysis): Promise<boolean> {
    if (session.idToken === null) return false;
    try {
      const res = await authed(`/nights/${analysis.nightId}`, session, {
        method: 'PUT',
        body: JSON.stringify(analysis),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async pushJournal(session: Session, entry: JournalEntry): Promise<boolean> {
    if (session.idToken === null) return false;
    try {
      const res = await authed(`/journal/${entry.date}`, session, {
        method: 'PUT',
        body: JSON.stringify(entry),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async health(): Promise<{ status: string; analyserVersion: string } | null> {
    try {
      const res = await fetch('/healthz');
      return res.ok ? ((await res.json()) as { status: string; analyserVersion: string }) : null;
    } catch {
      return null;
    }
  },
};
