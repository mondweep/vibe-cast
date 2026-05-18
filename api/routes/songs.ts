// Verified-library curation routes.
//
// These endpoints take an already-transcribed-and-edited set of lyric lines
// from the frontend and persist them as a "verified" song row in Supabase,
// readable by anyone (including anonymous visitors). They also extract the
// canonical vocabulary — running sanskrit/split per line, upserting each word
// into `words`, and recording the (song, word, line) mapping in `song_words`.
//
// Authorization is enforced two ways:
//   - The Supabase client is constructed with the caller's JWT, so RLS
//     ("Curator can manage songs") rejects anyone whose email isn't on the
//     curator allowlist.
//   - Additionally we look up the JWT's user record to set verified_by.

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { splitSanskrit } from './translate.js'
import { isCuratorEmail } from '../lib/curatorAllowlist.js'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL  || ''
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

export interface CuratorWord {
  devanagari?: string
  iast?: string
  meaning?: string
  root_dhatu?: string
  grammar?: string
}

export interface VerifyLine {
  start_time?: number
  end_time?: number
  devanagari?: string
  iast?: string
  english_poetic?: string
  english_literal?: string
  explanation?: string
  text?: string // fallback if devanagari is missing
  /**
   * Optional curator-supplied word breakdown. If present and non-empty, this
   * is used VERBATIM and splitSanskrit is NOT called for this line. Only when
   * words is missing/empty do we fall back to live Claude extraction.
   *
   * This preserves curator intent: the canonical word order matching the
   * verse text, exact diacritic forms (नभस् vs नभो, पालं vs पाल), and
   * carefully-written meanings — none of which Claude's split would
   * necessarily reproduce.
   */
  words?: CuratorWord[]
}

export interface VerifyRequest {
  videoId: string
  lines: VerifyLine[]
  title?: string
  language?: string
  /**
   * Optional categorization tags (genre, tradition, deity, source, author).
   * Each tag is normalised to lowercase kebab-case before insert. See
   * supabase/migrations/014_song_tags.sql for the canonical tag vocabulary.
   */
  tags?: string[]
}

/** Normalize a curator-supplied tag to lowercase kebab-case + strip surrounding whitespace. */
function normaliseTag(t: unknown): string | null {
  if (typeof t !== 'string') return null
  const cleaned = t.trim().toLowerCase().replace(/\s+/g, '-')
  // Allow only lowercase a-z, digits, hyphen, underscore. Reject otherwise.
  if (!cleaned || !/^[a-z0-9][a-z0-9_-]{0,49}$/.test(cleaned)) return null
  return cleaned
}

function clientForJwt(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function authenticateCurator(jwt: string): Promise<{ userId: string; email: string }> {
  const sb = clientForJwt(jwt)
  const { data, error } = await sb.auth.getUser(jwt)
  if (error || !data.user) throw new Error('Invalid auth token')
  const email = (data.user.email || '').toLowerCase()
  if (!(await isCuratorEmail(email))) {
    throw new Error(`Account ${email} is not authorised to verify songs`)
  }
  return { userId: data.user.id, email }
}

async function fetchYouTubeMetadata(videoId: string): Promise<{
  title?: string
  thumbnail_url?: string
  author_name?: string
}> {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    if (!r.ok) return {}
    const j = (await r.json()) as any
    return {
      title: j.title,
      thumbnail_url: j.thumbnail_url,
      author_name: j.author_name,
    }
  } catch {
    return {}
  }
}

/**
 * Verify a song: store as a curated library entry + extract canonical vocab.
 *
 * Word extraction runs `splitSanskrit` on each line in parallel. Lines that
 * fail to split (Whisper-noisy text) are logged but don't block the verify —
 * the song still goes into the library with whatever clean lines we got.
 */
export async function verifySong(
  jwt: string,
  body: VerifyRequest
): Promise<{ song: any; wordExtraction: { line_number: number; words?: number; error?: string }[] }> {
  const { userId } = await authenticateCurator(jwt)
  const sb = clientForJwt(jwt)

  if (!body.videoId) throw new Error('videoId required')
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    throw new Error('lines must be a non-empty array')
  }

  const meta = await fetchYouTubeMetadata(body.videoId)

  // Normalise the curator-supplied tags (lowercase, kebab-case, dedup).
  const normalisedTags = Array.from(
    new Set(
      (Array.isArray(body.tags) ? body.tags : [])
        .map(normaliseTag)
        .filter((t): t is string => t !== null)
    )
  )

  // Upsert the song row.
  //
  // pending_curator_review is force-cleared here: an explicit curator verify
  // IS the approval that the 24-hour auto-review window was waiting for.
  // Without this, songs auto-added by the nightly task remain hidden from
  // the public even after the curator explicitly verifies them.
  const youtubeUrl = `https://www.youtube.com/watch?v=${body.videoId}`
  const upsertPayload: Record<string, unknown> = {
    youtube_url: youtubeUrl,
    title: body.title || meta.title || null,
    thumbnail_url: meta.thumbnail_url || null,
    transcription_language: body.language || null,
    lyrics_json: body.lines,
    verified: true,
    pending_curator_review: false,
    verified_at: new Date().toISOString(),
    verified_by: userId,
  }
  // Only overwrite tags if the curator supplied any — re-verifying with the
  // tags field omitted shouldn't wipe existing tags. (Pass `tags: []`
  // explicitly to clear.)
  if (Array.isArray(body.tags)) {
    upsertPayload.tags = normalisedTags
  }

  const { data: songRow, error: songErr } = await sb
    .from('songs')
    .upsert(upsertPayload, { onConflict: 'youtube_url' })
    .select()
    .single()

  if (songErr || !songRow) {
    throw new Error(`Failed to upsert song: ${songErr?.message || 'no row returned'}`)
  }

  // Drop old song_words rows for this song before reinserting (so re-verify
  // is idempotent and reflects edits).
  await sb.from('song_words').delete().eq('song_id', (songRow as any).id)

  // Extract words per line. Throttled to stay under Anthropic's 50 req/min
  // org rate limit: process at most BATCH_SIZE lines concurrently, then sleep
  // BATCH_DELAY_MS before the next batch. With BATCH_SIZE=4 and DELAY=5s the
  // effective rate is ~48 req/min, leaving headroom.
  const BATCH_SIZE = 4
  const BATCH_DELAY_MS = 5000
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const extractOne = async (
    line: VerifyLine,
    idx: number
  ): Promise<{ line_number: number; words?: number; source?: string; error?: string }> => {
    const text = (line.devanagari || line.text || '').trim()
    if (!text) return { line_number: idx, error: 'empty line' }
    try {
      // If the curator supplied a non-empty words[] for this line, use it
      // verbatim — splitSanskrit re-extraction would scramble the order,
      // collapse diacritic distinctions (नभस् → नभो), and replace the
      // hand-written meanings with Claude's freshly-generated ones. Curator
      // intent wins.
      const curatorWords = Array.isArray(line.words)
        ? line.words.filter((w) => w?.devanagari && w?.iast && w?.meaning)
        : []

      let words: CuratorWord[]
      let source: string
      if (curatorWords.length > 0) {
        words = curatorWords
        source = 'curator'
      } else {
        words = (await splitSanskrit(text)) as CuratorWord[]
        source = 'splitSanskrit'
      }

      let inserted = 0
      for (const w of words) {
        if (!w?.devanagari || !w?.iast || !w?.meaning) continue
        const { data: wordRow, error: wErr } = await sb
          .from('words')
          .upsert(
            {
              devanagari: w.devanagari,
              iast: w.iast,
              meaning_short: String(w.meaning).slice(0, 200),
              meaning_full: w.grammar ? `${w.meaning} [${w.grammar}]` : w.meaning,
              root_dhatu: w.root_dhatu || null,
            },
            { onConflict: 'devanagari,iast', ignoreDuplicates: false }
          )
          .select()
          .single()
        if (wErr || !wordRow) {
          console.warn(`[verify] words upsert failed for ${w.devanagari}: ${wErr?.message}`)
          continue
        }
        const { error: linkErr } = await sb.from('song_words').insert({
          song_id: (songRow as any).id,
          word_id: (wordRow as any).id,
          line_number: idx,
        })
        if (linkErr) {
          console.warn(`[verify] song_words insert failed: ${linkErr.message}`)
          continue
        }
        inserted++
      }
      return { line_number: idx, words: inserted, source }
    } catch (err) {
      return { line_number: idx, error: err instanceof Error ? err.message : String(err) }
    }
  }

  const wordExtraction: { line_number: number; words?: number; source?: string; error?: string }[] = []
  for (let i = 0; i < body.lines.length; i += BATCH_SIZE) {
    const batch = body.lines.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((line, j) => extractOne(line, i + j))
    )
    wordExtraction.push(...results)
    // Only throttle when the batch actually hit Claude. Curator-supplied
    // word breakdowns skip splitSanskrit entirely, so the 5s sleep is dead
    // weight for fully pre-curated payloads like the Hari Stotram.
    const hitClaude = results.some((r) => r.source === 'splitSanskrit')
    if (hitClaude && i + BATCH_SIZE < body.lines.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }

  // If this song was in the request queue, mark all pending requests for
  // this videoId as 'accepted' so the curator's queue stays clean. Best-effort
  // — failure here doesn't roll back the verify, since the song is real and
  // saved either way.
  try {
    await sb
      .from('song_requests')
      .update({
        status: 'accepted',
        processed_at: new Date().toISOString(),
        processed_by: userId,
      })
      .eq('video_id', body.videoId)
      .eq('status', 'pending')
  } catch (err) {
    console.warn(
      '[verify] failed to clear pending requests for',
      body.videoId,
      err instanceof Error ? err.message : err,
    )
  }

  return { song: songRow, wordExtraction }
}

/** Unverify (revert to draft) — keeps song_words rows but flips verified=false. */
export async function unverifySong(jwt: string, videoId: string): Promise<{ ok: true }> {
  await authenticateCurator(jwt)
  const sb = clientForJwt(jwt)
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
  const { error } = await sb
    .from('songs')
    .update({ verified: false, verified_at: null, verified_by: null })
    .eq('youtube_url', youtubeUrl)
  if (error) throw new Error(`Failed to unverify: ${error.message}`)
  return { ok: true }
}
