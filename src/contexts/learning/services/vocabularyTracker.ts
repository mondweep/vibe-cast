import { supabase } from '../../../shared/lib/supabaseClient'
import type { WordBreakdown } from '../../../shared/types/database.types'

// Use `as any` for Supabase mutations where RLS policy types conflict with client types.
// This is safe because the actual DB schema enforces constraints.

export async function logWordEncounter(
  userId: string,
  word: WordBreakdown,
  songId: string,
  lineNumber: number,
  lookedUp: boolean = false
): Promise<void> {
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
    song_id: songId,
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
