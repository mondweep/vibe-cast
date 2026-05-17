// Curator-allowlist lookup, shared across api/routes/songs.ts,
// api/routes/songRequests.ts, and api/routes/feedback.ts.
//
// Before migration 013 each route hardcoded a Set<string> of curator emails.
// Now the allowlist lives in Supabase's `curator_allowlist` table and is
// fetched once per process and cached for 5 minutes. The cache is
// invalidated explicitly when a curator-application is accepted (which
// inserts a new email into the table).
//
// Falls back to the seed list if SUPABASE_SERVICE_ROLE_KEY isn't set —
// keeps local dev working without a service key, and the RLS on the
// curator_allowlist itself still enforces who can modify it.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// If service key isn't configured we can't read the allowlist table from
// the server — fall back to this seed list so curator actions still work
// during local development.
const SEED_CURATORS = new Set<string>(['mondweep@gmail.com', 'mondweep@dxsure.uk'])

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

let cache: { emails: Set<string>; expiresAt: number } | null = null
let inFlight: Promise<Set<string>> | null = null

function serviceClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Force the next call to re-fetch from Supabase. Call after inserts/deletes. */
export function invalidateCuratorCache(): void {
  cache = null
}

/** Load the current allowlist. Cached for 5 minutes; concurrent calls dedupe. */
export async function getCuratorEmails(): Promise<Set<string>> {
  if (cache && Date.now() < cache.expiresAt) return cache.emails
  if (inFlight) return inFlight

  const sb = serviceClient()
  if (!sb) {
    console.warn(
      '[curator-allowlist] SUPABASE_SERVICE_ROLE_KEY not set — falling back to hardcoded seed list. ' +
        'Set the env var to enable runtime allowlist edits.'
    )
    return SEED_CURATORS
  }

  inFlight = (async () => {
    const { data, error } = await sb.from('curator_allowlist').select('email')
    if (error) {
      console.error('[curator-allowlist] failed to fetch:', error.message)
      // Don't cache failures. Fall back to seed list this once.
      inFlight = null
      return SEED_CURATORS
    }
    const emails = new Set<string>(
      (data || []).map((r: any) => String(r.email || '').toLowerCase()).filter(Boolean)
    )
    cache = { emails, expiresAt: Date.now() + CACHE_TTL_MS }
    inFlight = null
    return emails
  })()
  return inFlight
}

/** Convenience: case-insensitive membership check. */
export async function isCuratorEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const list = await getCuratorEmails()
  return list.has(email.toLowerCase())
}

/**
 * Insert a new curator into the allowlist and invalidate the cache so
 * subsequent isCuratorEmail() calls see the addition immediately.
 * Used when PATCH /api/feedback marks a curator_application as accepted.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY — without it the function logs and
 * returns false so the caller can surface a clear error.
 */
export async function addCuratorEmail(opts: {
  email: string
  displayName?: string | null
  grantedVia?: 'application' | 'manual'
  applicationId?: string | null
  addedByUserId?: string | null
  notes?: string | null
}): Promise<{ ok: true; inserted: boolean } | { ok: false; reason: string }> {
  const sb = serviceClient()
  if (!sb) {
    return {
      ok: false,
      reason:
        'SUPABASE_SERVICE_ROLE_KEY required to grant curator access at runtime. ' +
        'Add the env var, then retry.',
    }
  }
  const email = opts.email.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: 'A valid email address is required.' }
  }
  // upsert-ish: insert if not present; if already present, treat as a no-op success.
  const { error } = await sb.from('curator_allowlist').insert({
    email,
    display_name: opts.displayName || null,
    granted_via: opts.grantedVia || 'manual',
    application_id: opts.applicationId || null,
    added_by: opts.addedByUserId || null,
    notes: opts.notes || null,
  })
  if (error) {
    // unique violation = already in the list, which is fine for our use case
    if (error.code === '23505') {
      return { ok: true, inserted: false }
    }
    console.error('[curator-allowlist] insert failed:', error.message)
    return { ok: false, reason: error.message }
  }
  invalidateCuratorCache()
  return { ok: true, inserted: true }
}
