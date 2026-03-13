import { useState, useEffect, useCallback } from 'react'
import type { RevisionMode } from '../../../shared/types/database.types'
import { useAuth } from '../../auth/hooks/useAuth'
import { generateDeck, generateMatchingSet, type DeckWord, type DeckType } from '../services/deckGenerator'
import { updateSRS } from '../services/srsEngine'

interface RevisionState {
  words: DeckWord[]
  currentWord: DeckWord | null
  currentIndex: number
  matchingSet: DeckWord[]
  progress: { current: number; total: number }
  sessionStats: { reviewed: number; correct: number; incorrect: number }
  handleRate: (rating: number) => void
  handleMatchingComplete: (correct: number, total: number) => void
}

export function useRevision(mode: RevisionMode, deckFilter: string): RevisionState {
  const { user } = useAuth()
  const [words, setWords] = useState<DeckWord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [matchingSet, setMatchingSet] = useState<DeckWord[]>([])
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, incorrect: 0 })

  useEffect(() => {
    if (!user) return
    generateDeck(user.id, deckFilter as DeckType).then((deck) => {
      setWords(deck)
      setCurrentIndex(0)
      if (mode === 'matching') {
        setMatchingSet(generateMatchingSet(deck))
      }
    })
  }, [user, deckFilter, mode])

  const handleRate = useCallback(
    async (rating: number) => {
      if (!user || !words[currentIndex]) return

      const word = words[currentIndex]
      await updateSRS(user.id, word.wordId, rating)

      setSessionStats((prev) => ({
        reviewed: prev.reviewed + 1,
        correct: rating >= 3 ? prev.correct + 1 : prev.correct,
        incorrect: rating < 3 ? prev.incorrect + 1 : prev.incorrect,
      }))

      setCurrentIndex((prev) => Math.min(prev + 1, words.length - 1))
    },
    [user, words, currentIndex]
  )

  const handleMatchingComplete = useCallback(
    (correct: number, total: number) => {
      setSessionStats((prev) => ({
        reviewed: prev.reviewed + total,
        correct: prev.correct + correct,
        incorrect: prev.incorrect + (total - correct),
      }))
      // Generate next matching set
      if (words.length >= 4) {
        setMatchingSet(generateMatchingSet(words))
      }
    },
    [words]
  )

  return {
    words,
    currentWord: words[currentIndex] || null,
    currentIndex,
    matchingSet,
    progress: { current: currentIndex + 1, total: words.length },
    sessionStats,
    handleRate,
    handleMatchingComplete,
  }
}
