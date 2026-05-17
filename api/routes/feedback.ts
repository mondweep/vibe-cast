// Feedback / curator-application CRM.
//
// Visitors submit comments, product suggestions, or applications to become
// a curator. All three kinds land in the same `feedback` table; the schema
// differentiates by `kind`. Curator-only GET + PATCH expose the queue.
//
// On every successful insert a Telegram message is sent to the curator
// (fire-and-forget). The message format varies by kind for at-a-glance
// triage (💬 comment, 💡 suggestion, 🌟 curator application).

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { isCuratorEmail, addCuratorEmail } from '../lib/curatorAllowlist.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Rate limit: 3 submissions per visitor_id per 24h. More generous than
// song requests because each comment/suggestion has potential signal value
// and we don't want to silence engaged users.
const ANON_RATE_LIMIT_WINDOW_HOURS = 24
const ANON_RATE_LIMIT_MAX_PER_WINDOW = 3

// Max body length we'll persist — guards against the form being abused as
// generic free-text storage.
const MAX_BODY_LEN = 4000
const MAX_FIELD_LEN = 500

const VALID_KINDS = ['comment', 'suggestion', 'curator_application'] as const
type FeedbackKind = (typeof VALID_KINDS)[number]

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

function clip(s: unknown, max: number): string | null {
  if (typeof s !== 'string') return null
  const trimmed = s.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

/** Fire-and-forget Telegram message to the curator. */
async function notifyCurator(opts: {
  kind: FeedbackKind
  subject: string | null
  body: string
  requester: string
  isPublic: boolean
  applicantName?: string | null
  weeklyHours?: number | null
  pendingTotal: number
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CURATOR_CHAT_ID
  if (!token || !chatId) {
    console.warn(
      '[feedback] Telegram not configured (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID); skipping notification'
    )
    return
  }

  const emoji =
    opts.kind === 'curator_application' ? '🌟'
      : opts.kind === 'suggestion' ? '💡'
        : '💬'
  const label =
    opts.kind === 'curator_application' ? '*Curator application*'
      : opts.kind === 'suggestion' ? '*Product suggestion*'
        : '*Comment*'

  const lines = [
    `${emoji} ${label}`,
    opts.kind === 'curator_application' && opts.applicantName ? `Name: ${opts.applicantName}` : '',
    opts.kind === 'curator_application' && opts.weeklyHours
      ? `Availability: ${opts.weeklyHours} hr/week`
      : '',
    `From: ${opts.requester}`,
    opts.subject ? `Subject: ${opts.subject.slice(0, 100)}` : '',
    `> ${opts.body.slice(0, 400)}${opts.body.length > 400 ? '…' : ''}`,
    opts.isPublic ? '(marked public)' : '',
    `Queue: ${opts.pendingTotal} open`,
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
        disable_web_page_preview: true,
      }),
    })
  } catch (err) {
    console.warn(
      '[feedback] Telegram notify failed:',
      err instanceof Error ? err.message : err
    )
  }
}

export interface SubmitFeedbackInput {
  kind?: string
  subject?: string
  body?: string
  applicant_name?: string
  email?: string
  display_name?: string
  sanskrit_background?: string
  traditions_familiar?: string
  weekly_hours?: number | string
  motivation?: string
  is_public?: boolean
  visitorId?: string
}

export interface SubmitFeedbackResult {
  status: 'created' | 'rate-limited' | 'invalid'
  message?: string
  feedback?: any
}

export async function submitFeedback(
  jwt: string | null,
  body: SubmitFeedbackInput
): Promise<SubmitFeedbackResult> {
  // 1. Kind
  const kind = body.kind as FeedbackKind
  if (!VALID_KINDS.includes(kind)) {
    return {
      status: 'invalid',
      message: `kind must be one of ${VALID_KINDS.join(', ')}`,
    }
  }

  // 2. Body — required for every kind
  const bodyText = clip(body.body, MAX_BODY_LEN)
  if (!bodyText) {
    return { status: 'invalid', message: 'body is required' }
  }
  const subject = clip(body.subject, MAX_FIELD_LEN)

  // 3. Read caller identity if signed in
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

  // 4. Curator-application requires name + email (per D2: anon allowed, but
  // they must provide name + email manually). Other kinds: contact is
  // optional but accepted if provided.
  const applicantName = clip(body.applicant_name, MAX_FIELD_LEN) || clip(body.display_name, MAX_FIELD_LEN)
  const providedEmail = clip(body.email, MAX_FIELD_LEN)
  const effectiveEmail = requesterEmail || providedEmail

  if (kind === 'curator_application') {
    if (!applicantName) {
      return { status: 'invalid', message: 'Curator applications require a name' }
    }
    if (!effectiveEmail) {
      return { status: 'invalid', message: 'Curator applications require an email' }
    }
    // Basic email shape check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
      return { status: 'invalid', message: 'Please provide a valid email address' }
    }
  }

  // 5. Rate limit anon
  const sb = serviceClient() ?? clientForJwt(jwt)
  if (!requesterUserId && body.visitorId) {
    const since = new Date(Date.now() - ANON_RATE_LIMIT_WINDOW_HOURS * 3600_000).toISOString()
    const { count } = await (sb
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('visitor_id', body.visitorId)
      .gte('created_at', since) as any)
    if ((count ?? 0) >= ANON_RATE_LIMIT_MAX_PER_WINDOW) {
      return {
        status: 'rate-limited',
        message:
          `You've already submitted ${ANON_RATE_LIMIT_MAX_PER_WINDOW} pieces of feedback in the last ` +
          `${ANON_RATE_LIMIT_WINDOW_HOURS} hours. Try again tomorrow, or sign in to submit more.`,
      }
    }
  }

  // 6. Curator applications are NEVER auto-public. Comments and suggestions
  // honour the user's checkbox, but the curator must also mark status in
  // ('responded','accepted','closed') before the public-read RLS lets the
  // row out. So `is_public: true` here is the user's opt-in, not a public
  // publish in itself.
  const isPublic = kind !== 'curator_application' && body.is_public === true

  let weeklyHours: number | null = null
  if (kind === 'curator_application' && body.weekly_hours != null) {
    const n = Number(body.weekly_hours)
    if (Number.isFinite(n) && n >= 0 && n <= 168) {
      weeklyHours = Math.round(n)
    }
  }

  // 7. Insert
  const { data: inserted, error: insertErr } = await (sb
    .from('feedback')
    .insert({
      kind,
      subject,
      body: bodyText,
      applicant_name: kind === 'curator_application' ? applicantName : null,
      sanskrit_background: clip(body.sanskrit_background, MAX_FIELD_LEN),
      traditions_familiar: clip(body.traditions_familiar, MAX_FIELD_LEN),
      weekly_hours: weeklyHours,
      motivation: clip(body.motivation, MAX_BODY_LEN),
      requested_by_user_id: requesterUserId,
      requested_by_email: effectiveEmail,
      visitor_id: requesterUserId ? null : body.visitorId || null,
      display_name: clip(body.display_name, MAX_FIELD_LEN),
      is_public: isPublic,
    })
    .select()
    .single() as any)
  if (insertErr) {
    console.error('[feedback] insert failed:', insertErr.message)
    return { status: 'invalid', message: insertErr.message }
  }

  // 8. Notify curator (fire-and-forget)
  const { count: pendingTotal } = await (sb
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .in('status', ['new', 'in_progress']) as any)
  const requester = applicantName
    ? `${applicantName}${effectiveEmail ? ` <${effectiveEmail}>` : ''}`
    : effectiveEmail
      ? effectiveEmail
      : body.visitorId
        ? `anon visitor ${body.visitorId.slice(0, 8)}`
        : 'unknown'
  notifyCurator({
    kind,
    subject,
    body: bodyText,
    requester,
    isPublic,
    applicantName,
    weeklyHours,
    pendingTotal: pendingTotal ?? 0,
  })

  return { status: 'created', feedback: inserted }
}

/** Curator-only: list feedback. Optional kind filter. */
export async function listFeedback(
  jwt: string,
  filter?: { kind?: string; status?: string }
): Promise<{ feedback: any[] }> {
  const sbAuth = clientForJwt(jwt)
  const { data: u } = await sbAuth.auth.getUser(jwt)
  const email = (u?.user?.email || '').toLowerCase()
  if (!(await isCuratorEmail(email))) {
    throw new Error('Only the curator can read feedback')
  }
  const sb = serviceClient() ?? sbAuth
  let q = sb
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (filter?.kind && VALID_KINDS.includes(filter.kind as FeedbackKind)) {
    q = (q as any).eq('kind', filter.kind)
  }
  if (filter?.status) {
    q = (q as any).eq('status', filter.status)
  }
  const { data, error } = await (q as any)
  if (error) throw new Error(error.message)
  return { feedback: (data as any[]) ?? [] }
}

/**
 * Curator-only: update status + notes on a feedback row.
 *
 * Side effect: when a curator_application row is marked status='accepted',
 * the applicant's email is auto-inserted into curator_allowlist. This is
 * the workflow that closes the loop on "decision 2" from the design — no
 * more manual editing of the allowlist in code to grant curator access.
 *
 * Telegram-notifies the curator on accept (with a summary of who was just
 * granted access), so they always have a record.
 */
export async function updateFeedback(
  jwt: string,
  id: string,
  patch: { status?: string; internal_notes?: string; response_summary?: string; is_public?: boolean }
): Promise<{ ok: true; granted_curator?: { email: string; was_already_curator: boolean } }> {
  const sbAuth = clientForJwt(jwt)
  const { data: u } = await sbAuth.auth.getUser(jwt)
  const email = (u?.user?.email || '').toLowerCase()
  if (!(await isCuratorEmail(email))) {
    throw new Error('Only the curator can update feedback')
  }
  const userId = u?.user?.id || null

  const allowed = ['new', 'in_progress', 'responded', 'closed', 'accepted', 'rejected']
  const update: Record<string, unknown> = {}
  if (patch.status) {
    if (!allowed.includes(patch.status)) {
      throw new Error(`status must be one of ${allowed.join(', ')}`)
    }
    update.status = patch.status
    update.processed_at = new Date().toISOString()
    update.processed_by = userId
  }
  if (typeof patch.internal_notes === 'string') update.internal_notes = patch.internal_notes
  if (typeof patch.response_summary === 'string') update.response_summary = patch.response_summary
  if (typeof patch.is_public === 'boolean') update.is_public = patch.is_public

  if (Object.keys(update).length === 0) {
    throw new Error('No fields to update')
  }

  // Fetch the row first so we know its kind + applicant info BEFORE updating.
  // (We need this for the auto-grant side-effect when status='accepted'.)
  const sb = serviceClient() ?? sbAuth
  const { data: rowBefore } = await (sb
    .from('feedback')
    .select('id, kind, applicant_name, requested_by_email, display_name')
    .eq('id', id)
    .maybeSingle() as any)

  const { error } = await (sb.from('feedback').update(update).eq('id', id) as any)
  if (error) throw new Error(error.message)

  // Auto-grant: curator_application + status='accepted' → add to allowlist.
  let granted: { email: string; was_already_curator: boolean } | undefined
  if (
    patch.status === 'accepted' &&
    rowBefore?.kind === 'curator_application' &&
    rowBefore?.requested_by_email
  ) {
    const applicantEmail = String(rowBefore.requested_by_email).toLowerCase()
    const wasAlreadyCurator = await isCuratorEmail(applicantEmail)
    const result = await addCuratorEmail({
      email: applicantEmail,
      displayName: rowBefore.applicant_name || rowBefore.display_name || null,
      grantedVia: 'application',
      applicationId: id,
      addedByUserId: userId,
      notes: 'Auto-granted on curator-application accept',
    })
    if (result.ok) {
      granted = { email: applicantEmail, was_already_curator: wasAlreadyCurator }
      // Fire-and-forget Telegram confirmation
      notifyCuratorGrant({
        email: applicantEmail,
        displayName: rowBefore.applicant_name || rowBefore.display_name || null,
        wasAlready: wasAlreadyCurator,
      })
    } else {
      console.warn('[feedback] auto-grant failed:', result.reason)
    }
  }

  return granted ? { ok: true, granted_curator: granted } : { ok: true }
}

/** Confirmation message after a curator application has been auto-granted. */
async function notifyCuratorGrant(opts: {
  email: string
  displayName: string | null
  wasAlready: boolean
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CURATOR_CHAT_ID
  if (!token || !chatId) return
  const text = opts.wasAlready
    ? `✅ ${opts.displayName || opts.email} is already a curator — accept marked, no allowlist change.`
    : `✅ *New curator added*\n${opts.displayName ? opts.displayName + ' — ' : ''}${opts.email}\nThey can now sign in and use /play and /queue.`
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })
  } catch {
    // best-effort
  }
}
