import { supabase } from '../../../shared/lib/supabaseClient'
import { SRS_DEFAULTS } from '../../../shared/lib/constants'

// SM-2 Algorithm Implementation
// Rating: 0-5 (0=complete blackout, 5=perfect response)
export function computeSRS(
  currentInterval: number,
  currentEaseFactor: number,
  rating: number
): { interval: number; easeFactor: number } {
  let newEaseFactor = currentEaseFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  newEaseFactor = Math.max(SRS_DEFAULTS.MIN_EASE_FACTOR, newEaseFactor)

  let newInterval: number

  if (rating < 3) {
    // Failed: reset interval
    newInterval = SRS_DEFAULTS.INITIAL_INTERVAL
  } else if (currentInterval === 1) {
    newInterval = 1
  } else if (currentInterval === 2) {
    newInterval = 6
  } else {
    newInterval = Math.round(currentInterval * newEaseFactor)
  }

  return { interval: newInterval, easeFactor: newEaseFactor }
}

export async function updateSRS(
  userId: string,
  wordId: string,
  rating: number
): Promise<void> {
  const { data } = await (supabase
    .from('user_vocabulary')
    .select('srs_interval, srs_ease_factor')
    .eq('user_id', userId)
    .eq('word_id', wordId)
    .single() as any)

  if (!data) return

  const { interval, easeFactor } = computeSRS(
    data.srs_interval,
    data.srs_ease_factor,
    rating
  )

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  await (supabase
    .from('user_vocabulary') as any)
    .update({
      srs_interval: interval,
      srs_ease_factor: easeFactor,
      srs_next_review: nextReview.toISOString(),
    })
    .eq('user_id', userId)
    .eq('word_id', wordId)
}

export async function getDueWords(userId: string, limit: number = 20) {
  const { data } = await supabase
    .from('user_vocabulary')
    .select('*, words(*)')
    .eq('user_id', userId)
    .lte('srs_next_review', new Date().toISOString())
    .order('srs_next_review', { ascending: true })
    .limit(limit)

  return data || []
}
