// Bottom-fixed consent banner. Persists across all routes until the user
// clicks "I agree". On click:
//   - Stores consent_version + visitor_id in localStorage (suppresses banner
//     on subsequent visits to the same browser)
//   - POSTs to /api/consent so the consent event is recorded in Supabase's
//     consent_log (with the visitor's IP + UA, and user_id if signed in)
//
// Anonymous visitors are supported — the banner appears for them, their
// consent is logged keyed by a randomly generated visitor_id (UUID).

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// Bump when the privacy policy changes substantively, so existing
// users see the banner again and re-consent.
export const CONSENT_VERSION = '2026-05-16.v1';

function getOrCreateVisitorId(): string {
  const existing = localStorage.getItem('visitor_id');
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto as any).randomUUID()
      : `vis_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  localStorage.setItem('visitor_id', id);
  return id;
}

export function ConsentBanner() {
  const [dismissed, setDismissed] = useState(true); // start dismissed to avoid flash
  const [busy, setBusy] = useState(false);

  // Decide visibility on mount only (we read localStorage outside SSR concerns).
  useEffect(() => {
    const stored = localStorage.getItem('consent_version');
    setDismissed(stored === CONSENT_VERSION);
  }, []);

  async function handleAgree() {
    setBusy(true);
    const visitor_id = getOrCreateVisitorId();
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      await fetch('/api/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ visitor_id, consent_version: CONSENT_VERSION }),
      });
    } catch {
      // Logging consent is best-effort — never block the user.
    }
    localStorage.setItem('consent_version', CONSENT_VERSION);
    setDismissed(true);
    setBusy(false);
  }

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Privacy notice"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-500/30 bg-gray-950/95 px-4 py-3 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 text-sm text-gray-200 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-snug">
          <span className="font-medium text-amber-400">Privacy notice.</span>{' '}
          SanskritSync stores your email, an approximate location derived from
          your IP, and optional profile fields you provide. See the{' '}
          <Link
            to="/privacy"
            className="underline decoration-amber-500/50 hover:text-amber-300"
          >
            privacy page
          </Link>{' '}
          for details. By continuing you agree to this.
        </p>
        <button
          onClick={handleAgree}
          disabled={busy}
          className="shrink-0 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-gray-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'I agree'}
        </button>
      </div>
    </div>
  );
}
