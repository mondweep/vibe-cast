import { supabase } from '../../../shared/lib/supabaseClient'
import type { WordBreakdown } from '../../../shared/types/database.types'

// Use `as any` for Supabase mutations where RLS policy types conflict with client types.
// This is safe because the actual DB schema enforces constraints.

// Cache videoId → songs.id (uuid) lookups. `word_encounters.song_id` is `uuid NOT NULL`,
// so we have to resolve YouTube video IDs to the song row's UUID before inserting.
const songIdCache = new Map<string, string>()
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveSongId(idOrVideoId: string): Promise<string | null> {
  if (!idOrVideoId) return null
  if (UUID_RE.test(idOrVideoId)) return idOrVideoId // already a song UUID
  const cached = songIdCache.get(idOrVideoId)
  if (cached) return cached
  const { data, error } = await (supabase
    .from('songs')
    .select('id, youtube_url')
    .or(`youtube_url.like.%v=${idOrVideoId},youtube_url.like.%youtu.be/${idOrVideoId}%`)
    .limit(1) as any)
  if (error || !data || data.length === 0) return null
  const songId = (data as any[])[0].id as string
  songIdCache.set(idOrVideoId, songId)
  return songId
}

export async function logWordEncounter(
  userId: string,
  word: WordBreakdown,
  songId: string,
  lineNumber: number,
  lookedUp: boolean = false
): Promise<void> {
  // Caller passes either a song UUID or a YouTube videoId; normalise to UUID.
  const resolvedSongId = await resolveSongId(songId)
  if (!resolvedSongId) {
    // Song not found — drop silently rather than spamming the user with 400s.
    return
  }
  // Ensure word exists in dictionary
  const { data: existingWord } = await (supabase
    .from('words')
    .select('id')
    .eq('devanagari', word.devanagari)
    .eq('iast', word.iast)
    .single() as any)

  let wordId = existingWord?.id

  if (!wordId) {
    const { data: newWord } = await (supabase
      .from('words')
      .insert({
        devanagari: word.devanagari,
        iast: word.iast,
        root_dhatu: word.root_dhatu || null,
        meaning_short: word.meaning || '',
        meaning_full: word.grammar || null,
      } as any)
      .select('id')
      .single() as any)
    wordId = newWord?.id
  }

  if (!wordId) return

  // Log encounter
  await (supabase.from('word_encounters') as any).insert({
    user_id: userId,
    word_id: wordId,
    song_id: resolvedSongId,
    line_number: lineNumber,
    looked_up: lookedUp,
  })

  // Upsert vocabulary entry
  const { data: existing } = await (supabase
    .from('user_vocabulary')
    .select('id, encounter_count')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .single() as any)

  if (existing) {
    const newCount = existing.encounter_count + 1
    const familiarity = computeFamiliarity(newCount, lookedUp)
    await (supabase
      .from('user_vocabulary') as any)
      .update({
        encounter_count: newCount,
        last_seen_at: new Date().toISOString(),
        familiarity,
      })
      .eq('id', existing.id)
  } else {
    await (supabase.from('user_vocabulary') as any).insert({
      user_id: userId,
      word_id: wordId,
      encounter_count: 1,
      familiarity: 0.0,
    })
  }
}

export function computeFamiliarity(encounters: number, recentLookup: boolean): number {
  const base = Math.min(1.0, Math.log10(encounters + 1) / 2)
  const penalty = recentLookup ? 0.1 : 0
  return Math.max(0, Math.min(1.0, base - penalty))
}

export async function getUserVocabulary(userId: string): Promise<Map<string, number>> {
  const { data } = await (supabase
    .from('user_vocabulary')
    .select('word_id, familiarity, words(devanagari)')
    .eq('user_id', userId) as any)

  const map = new Map<string, number>()
  if (data) {
    for (const entry of data as any[]) {
      const word = entry.words as any
      if (word?.devanagari) {
        map.set(word.devanagari, entry.familiarity)
      }
    }
  }
  return map
}

export async function markForRevision(userId: string, wordId: string, mark: boolean): Promise<void> {
  await (supabase
    .from('user_vocabulary') as any)
    .update({ marked_revision: mark })
    .eq('user_id', userId)
    .eq('word_id', wordId)
}

export async function markAsLearned(userId: string, wordId: string, mark: boolean): Promise<void> {
  await (supabase
    .from('user_vocabulary') as any)
    .update({ marked_learned: mark, familiarity: mark ? 1.0 : 0.5 })
    .eq('user_id', userId)
    .eq('word_id', wordId)
}
