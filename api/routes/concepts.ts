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
  // Pull concepts + a word-count via a left-join aggregate.
  const { data: concepts, error: cErr } = await sb
    .from('concepts')
    .select('id, slug, label, summary, color, display_order')
    .order('display_order', { ascending: true })
    .order('label', { ascending: true })
  if (cErr) throw new Error(`list concepts: ${cErr.message}`)

  // Word counts in one query
  const { data: wcRows, error: wcErr } = await sb
    .from('word_concepts')
    .select('concept_id')
  if (wcErr) throw new Error(`count word_concepts: ${wcErr.message}`)
  const counts = new Map<string, number>()
  for (const r of wcRows || []) {
    counts.set(r.concept_id, (counts.get(r.concept_id) || 0) + 1)
  }
  const withCounts: ConceptRow[] = (concepts || []).map((c) => ({
    ...c,
    word_count: counts.get(c.id) || 0,
  }))
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

  const { data: wcRows, error: wcErr } = await sb
    .from('word_concepts')
    .select('word_id, weight')
    .eq('concept_id', concept.id)
  if (wcErr) throw new Error(`load word_concepts: ${wcErr.message}`)
  const wordIds = (wcRows || []).map((r) => r.word_id)
  if (wordIds.length === 0) return { concept, words: [] }

  const { data: words, error: wErr } = await sb
    .from('words')
    .select('id, devanagari, iast, meaning_short, meaning_full')
    .in('id', wordIds)
    .order('iast', { ascending: true })
  if (wErr) throw new Error(`load words: ${wErr.message}`)
  return { concept, words: words || [] }
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
