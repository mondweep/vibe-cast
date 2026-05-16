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

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL  || ''
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

const CURATOR_EMAILS = new Set([
  'mondweep@gmail.com',
  'mondweep@dxsure.uk',
])

export interface VerifyLine {
  start_time?: number
  end_time?: number
  devanagari?: string
  iast?: string
  english_poetic?: string
  english_literal?: string
  explanation?: string
  text?: string // fallback if devanagari is missing
}

export interface VerifyRequest {
  videoId: string
  lines: VerifyLine[]
  title?: string
  language?: string
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
  if (!CURATOR_EMAILS.has(email)) {
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

  // Upsert the song row.
  const youtubeUrl = `https://www.youtube.com/watch?v=${body.videoId}`
  const { data: songRow, error: songErr } = await sb
    .from('songs')
    .upsert(
      {
        youtube_url: youtubeUrl,
        title: body.title || meta.title || null,
        thumbnail_url: meta.thumbnail_url || null,
        transcription_language: body.language || null,
        lyrics_json: body.lines,
        verified: true,
        verified_at: new Date().toISOString(),
        verified_by: userId,
      },
      { onConflict: 'youtube_url' }
    )
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
  ): Promise<{ line_number: number; words?: number; error?: string }> => {
    const text = (line.devanagari || line.text || '').trim()
    if (!text) return { line_number: idx, error: 'empty line' }
    try {
      const words = await splitSanskrit(text)
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
      return { line_number: idx, words: inserted }
    } catch (err) {
      return { line_number: idx, error: err instanceof Error ? err.message : String(err) }
    }
  }

  const wordExtraction: { line_number: number; words?: number; error?: string }[] = []
  for (let i = 0; i < body.lines.length; i += BATCH_SIZE) {
    const batch = body.lines.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((line, j) => extractOne(line, i + j))
    )
    wordExtraction.push(...results)
    if (i + BATCH_SIZE < body.lines.length) {
      await sleep(BATCH_DELAY_MS)
    }
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
