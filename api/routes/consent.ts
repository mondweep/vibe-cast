// Consent + IP-based geolocation tracking.
//
// /api/consent records a consent event in the consent_log table. Works for
// both authenticated and anonymous visitors (keyed by a client-generated
// visitor_id from localStorage). If a JWT is present, the user_id is also
// recorded and the profiles row is stamped.
//
// /api/profile/track does IP-based geolocation (via ipapi.co's free tier)
// and writes geo_country/region/city + ip_address onto the caller's
// profiles row. Requires authentication.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

// Free; rate limit 1000 req/day per IP. Don't pass through a key.
const GEO_LOOKUP_URL = (ip: string) => `https://ipapi.co/${encodeURIComponent(ip)}/json/`

export interface GeoLookup {
  country?: string | null
  region?: string | null
  city?: string | null
}

export async function ipGeoLookup(ip: string): Promise<GeoLookup> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return {}
  try {
    const r = await fetch(GEO_LOOKUP_URL(ip), {
      signal: AbortSignal.timeout(3000),
      headers: { 'User-Agent': 'SanskritSync/1.0' },
    })
    if (!r.ok) return {}
    const d = (await r.json()) as any
    if (d?.error) return {}
    return {
      country: d.country_name || null,
      region: d.region || null,
      city: d.city || null,
    }
  } catch {
    return {}
  }
}

function clientForJwt(jwt: string | null): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : {},
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface ConsentRequest {
  visitor_id: string
  consent_version: string
}

export async function recordConsent(opts: {
  jwt: string | null
  body: ConsentRequest
  ip: string | null
  userAgent: string | null
}): Promise<{ ok: true; userId: string | null }> {
  const { jwt, body, ip, userAgent } = opts
  if (!body.visitor_id) throw new Error('visitor_id required')
  if (!body.consent_version) throw new Error('consent_version required')

  const sb = clientForJwt(jwt)

  let userId: string | null = null
  if (jwt) {
    try {
      const { data } = await sb.auth.getUser(jwt)
      userId = data.user?.id ?? null
    } catch {
      /* anonymous fallback ok */
    }
  }

  // Insert into consent_log (public-INSERT RLS lets us do this even anonymous).
  const { error: insErr } = await (sb.from('consent_log') as any).insert({
    visitor_id: body.visitor_id,
    user_id: userId,
    consent_version: body.consent_version,
    ip_address: ip || null,
    user_agent: userAgent || null,
  })
  if (insErr) throw new Error(`consent_log insert: ${insErr.message}`)

  // If signed in, stamp the profiles row too.
  if (userId) {
    await (sb.from('profiles') as any)
      .update({
        consent_at: new Date().toISOString(),
        consent_version: body.consent_version,
      })
      .eq('id', userId)
  }

  return { ok: true, userId }
}

/** Capture IP-based geo + IP on the caller's profile. Auth required. */
export async function trackProfile(opts: {
  jwt: string
  ip: string | null
}): Promise<{ ok: true; geo: GeoLookup; ip: string | null }> {
  const { jwt, ip } = opts
  const sb = clientForJwt(jwt)

  const { data, error } = await sb.auth.getUser(jwt)
  if (error || !data.user) throw new Error('Invalid auth token')
  const userId = data.user.id

  const geo = ip ? await ipGeoLookup(ip) : {}

  await (sb.from('profiles') as any)
    .update({
      ip_address: ip || null,
      geo_country: geo.country ?? null,
      geo_region: geo.region ?? null,
      geo_city: geo.city ?? null,
    })
    .eq('id', userId)

  return { ok: true, geo, ip }
}
