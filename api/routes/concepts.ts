// Concept-layer API.
//
// All endpoints are public-read (the data is built from the verified library,
// which is itself public). No auth required.
//
//   GET /api/concepts                        — full concept list, ordered.
//   GET /api/concepts/:slug                  — concept detail + member words.
//   GET /api/songs/:videoId/concepts         — concepts present in a song,
//                                              with the member words that
//                                              actually appear in that song.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

function publicClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ---------------------------------------------------------------------------

export type ConceptRow = {
  id: string
  slug: string
  label: string
  summary: string | null
  color: string | null
  display_order: number
  word_count?: number
}

export type WordRow = {
  id: string
  devanagari: string
  iast: string
  meaning_short: string
  meaning_full?: string | null
}

export async function listConcepts(): Promise<{ concepts: ConceptRow[] }> {
  const sb = publicClient()
  // Concepts + word-count via PostgREST's embedded aggregate.
  // Previously we pulled every word_concepts row and counted client-side, but
  // PostgREST caps responses at 1000 rows by default — with >1000 mapping
  // rows, most concepts came back with 0. The {count} embed runs server-side.
  const { data: concepts, error: cErr } = await sb
    .from('concepts')
    .select(
      'id, slug, label, summary, color, display_order, word_concepts(count)',
    )
    .order('display_order', { ascending: true })
    .order('label', { ascending: true })
  if (cErr) throw new Error(`list concepts: ${cErr.message}`)

  const withCounts: ConceptRow[] = (concepts || []).map((c: any) => {
    const wc = c.word_concepts
    // Embed-count comes back as [{count: N}] in newer PostgREST builds.
    const count =
      Array.isArray(wc) && wc.length > 0 && typeof wc[0]?.count === 'number'
        ? (wc[0].count as number)
        : 0
    const { word_concepts: _omit, ...rest } = c
    return { ...(rest as ConceptRow), word_count: count }
  })
  return { concepts: withCounts }
}

export async function getConcept(slug: string): Promise<{
  concept: ConceptRow
  words: WordRow[]
}> {
  const sb = publicClient()

  const { data: concept, error: cErr } = await sb
    .from('concepts')
    .select('id, slug, label, summary, color, display_order')
    .eq('slug', slug)
    .single()
  if (cErr || !concept) throw new Error(`concept not found: ${slug}`)

  // Single round-trip via PostgREST FK embedding. This avoids sending a
  // huge `id=in.(uuid1,uuid2,…)` URL when a concept covers hundreds of
  // words (e.g. the Sahasranāma epithet bucket has ~500), which would
  // exceed PostgREST's URL length limit and 500 out.
  const { data: rows, error: wErr } = await sb
    .from('word_concepts')
    .select('weight, words(id, devanagari, iast, meaning_short, meaning_full)')
    .eq('concept_id', concept.id)
  if (wErr) throw new Error(`load concept words: ${wErr.message}`)

  const words: WordRow[] = []
  for (const r of (rows || []) as Array<{ words: WordRow | WordRow[] | null }>) {
    // PostgREST returns the embedded row as an object (1:1) or array. Be defensive.
    const w = Array.isArray(r.words) ? r.words[0] : r.words
    if (w && w.id) words.push(w)
  }
  words.sort((a, b) => a.iast.localeCompare(b.iast))
  return { concept, words }
}

// Look up a song by either YouTube videoId or the raw youtube_url field.
async function findSongId(videoId: string): Promise<string | null> {
  const sb = publicClient()
  // Try matching url tail first — songs.youtube_url is what's stored.
  const { data, error } = await sb
    .from('songs')
    .select('id, youtube_url')
    .or(`youtube_url.like.%v=${videoId},youtube_url.like.%youtu.be/${videoId}%`)
    .eq('verified', true)
    .limit(1)
  if (error) return null
  return data?.[0]?.id || null
}

export type SongConceptsResponse = {
  videoId: string
  concepts: Array<
    ConceptRow & {
      words_in_song: WordRow[]
    }
  >
}

export async function getSongConcepts(videoId: string): Promise<SongConceptsResponse> {
  const sb = publicClient()
  const songId = await findSongId(videoId)
  if (!songId) {
    return { videoId, concepts: [] }
  }

  // 1. word_ids that appear in this song
  const { data: songWords, error: swErr } = await sb
    .from('song_words')
    .select('word_id')
    .eq('song_id', songId)
  if (swErr) throw new Error(`load song_words: ${swErr.message}`)
  const wordIds = [...new Set((songWords || []).map((r) => r.word_id))]
  if (wordIds.length === 0) return { videoId, concepts: [] }

  // 2. word_concepts membership
  const { data: wcRows, error: wcErr } = await sb
    .from('word_concepts')
    .select('word_id, concept_id, weight')
    .in('word_id', wordIds)
  if (wcErr) throw new Error(`load word_concepts: ${wcErr.message}`)
  const conceptIds = [...new Set((wcRows || []).map((r) => r.concept_id))]
  if (conceptIds.length === 0) return { videoId, concepts: [] }

  // 3. concept details
  const { data: concepts, error: cErr } = await sb
    .from('concepts')
    .select('id, slug, label, summary, color, display_order')
    .in('id', conceptIds)
    .order('display_order', { ascending: true })
  if (cErr) throw new Error(`load concepts: ${cErr.message}`)

  // 4. words details
  const { data: words, error: wErr } = await sb
    .from('words')
    .select('id, devanagari, iast, meaning_short')
    .in('id', wordIds)
  if (wErr) throw new Error(`load words: ${wErr.message}`)
  const wordsById = new Map<string, WordRow>((words || []).map((w) => [w.id, w]))

  // Bucket words under each concept
  const conceptToWordIds = new Map<string, string[]>()
  for (const r of wcRows || []) {
    const arr = conceptToWordIds.get(r.concept_id) || []
    arr.push(r.word_id)
    conceptToWordIds.set(r.concept_id, arr)
  }

  return {
    videoId,
    concepts: (concepts || []).map((c) => {
      const ids = conceptToWordIds.get(c.id) || []
      const wordsInSong = ids
        .map((id) => wordsById.get(id))
        .filter((w): w is WordRow => Boolean(w))
        .sort((a, b) => a.iast.localeCompare(b.iast))
      return {
        ...c,
        word_count: wordsInSong.length,
        words_in_song: wordsInSong,
      }
    }),
  }
}
