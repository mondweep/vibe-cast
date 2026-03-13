import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { supabase } from '../../../shared/lib/supabaseClient'
import { FAMILIARITY_THRESHOLDS } from '../../../shared/lib/constants'

interface ProgressState {
  streak: number
  totalWords: number
  songsPlayed: number
  masteredWords: number
  distribution: {
    new: number
    recognized: number
    known: number
    mastered: number
  }
  recentSongs: { id: string; title: string; wordsLearned: number }[]
  handleExportCSV: () => void
}

export function useProgress(): ProgressState {
  const { user } = useAuth()
  const [state, setState] = useState<ProgressState>({
    streak: 0,
    totalWords: 0,
    songsPlayed: 0,
    masteredWords: 0,
    distribution: { new: 0, recognized: 0, known: 0, mastered: 0 },
    recentSongs: [],
    handleExportCSV: () => {},
  })

  useEffect(() => {
    if (!user) return

    const loadProgress = async () => {
      const { data: profile } = await (supabase
        .from('profiles')
        .select('total_words, current_streak')
        .eq('id', user.id)
        .single() as any)

      const { data: vocab } = await (supabase
        .from('user_vocabulary')
        .select('familiarity')
        .eq('user_id', user.id) as any)

      const distribution = { new: 0, recognized: 0, known: 0, mastered: 0 }
      let mastered = 0
      if (vocab) {
        for (const v of vocab as any[]) {
          if (v.familiarity >= FAMILIARITY_THRESHOLDS.MASTERED) {
            distribution.mastered++
            mastered++
          } else if (v.familiarity >= FAMILIARITY_THRESHOLDS.KNOWN) {
            distribution.known++
          } else if (v.familiarity >= FAMILIARITY_THRESHOLDS.RECOGNIZED) {
            distribution.recognized++
          } else {
            distribution.new++
          }
        }
      }

      const { data: encounters } = await (supabase
        .from('word_encounters')
        .select('song_id')
        .eq('user_id', user.id) as any)

      const uniqueSongs = new Set((encounters as any[] || []).map((e: any) => e.song_id))

      setState((prev) => ({
        ...prev,
        streak: profile?.current_streak || 0,
        totalWords: (vocab as any[] || []).length,
        songsPlayed: uniqueSongs.size,
        masteredWords: mastered,
        distribution,
      }))
    }

    loadProgress()
  }, [user])

  const handleExportCSV = useCallback(async () => {
    if (!user) return

    const { data } = await (supabase
      .from('user_vocabulary')
      .select('familiarity, encounter_count, words(devanagari, iast, meaning_short)')
      .eq('user_id', user.id) as any)

    if (!data) return

    const csvRows = ['Devanagari,IAST,Meaning,Familiarity,Encounters']
    for (const entry of data as any[]) {
      const word = entry.words as any
      csvRows.push(
        `"${word?.devanagari}","${word?.iast}","${word?.meaning_short}",${entry.familiarity},${entry.encounter_count}`
      )
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sanskrit-vocabulary.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [user])

  return { ...state, handleExportCSV }
}
