import { supabase } from '../../../shared/lib/supabaseClient'

export type DeckType = 'all' | 'today' | 'struggling' | 'almost-learned'

export interface DeckWord {
  id: string
  wordId: string
  devanagari: string
  iast: string
  meaning: string
  familiarity: number
  encounterCount: number
}

export async function generateDeck(userId: string, deckType: DeckType): Promise<DeckWord[]> {
  let query = supabase
    .from('user_vocabulary')
    .select('id, word_id, familiarity, encounter_count, words(id, devanagari, iast, meaning_short)')
    .eq('user_id', userId)

  switch (deckType) {
    case 'today':
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.gte('last_seen_at', today.toISOString())
      break
    case 'struggling':
      query = query.gt('encounter_count', 5).lt('familiarity', 0.4)
      break
    case 'almost-learned':
      query = query.gte('familiarity', 0.6).lt('familiarity', 0.8)
      break
    case 'all':
    default:
      break
  }

  const { data } = await query.order('familiarity', { ascending: true }).limit(50)

  return (data || []).map((entry) => {
    const word = entry.words as any
    return {
      id: entry.id,
      wordId: entry.word_id,
      devanagari: word?.devanagari || '',
      iast: word?.iast || '',
      meaning: word?.meaning_short || '',
      familiarity: entry.familiarity,
      encounterCount: entry.encounter_count,
    }
  })
}

export function generateMatchingSet(words: DeckWord[], size: number = 4): DeckWord[] {
  const shuffled = [...words].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, size)
}
