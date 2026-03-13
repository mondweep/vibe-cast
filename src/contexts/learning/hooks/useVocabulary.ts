import { useState, useEffect, useCallback, useRef } from 'react'
import type { LyricsLine, WordBreakdown } from '../../../shared/types/database.types'
import { useAuth } from '../../auth/hooks/useAuth'
import { logWordEncounter, getUserVocabulary } from '../services/vocabularyTracker'

interface SessionStats {
  totalWords: number
  newWords: number
  reviewReady: number
}

export function useVocabulary(currentLine: LyricsLine | null, videoId: string | null) {
  const { user } = useAuth()
  const [words, setWords] = useState<Map<string, number>>(new Map())
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalWords: 0,
    newWords: 0,
    reviewReady: 0,
  })
  const processedLines = useRef(new Set<number>())
  const sessionNewWords = useRef(new Set<string>())
  const sessionTotalWords = useRef(new Set<string>())

  // Load user's vocabulary on mount
  useEffect(() => {
    if (!user) return
    getUserVocabulary(user.id).then(setWords)
  }, [user])

  // Log word encounters when a new line plays
  useEffect(() => {
    if (!currentLine || !user || !videoId) return
    if (processedLines.current.has(currentLine.line)) return
    processedLines.current.add(currentLine.line)

    const logWords = async () => {
      for (const word of currentLine.words || []) {
        sessionTotalWords.current.add(word.devanagari)
        if (!words.has(word.devanagari)) {
          sessionNewWords.current.add(word.devanagari)
        }
        await logWordEncounter(user.id, word, videoId, currentLine.line)
      }

      setSessionStats({
        totalWords: sessionTotalWords.current.size,
        newWords: sessionNewWords.current.size,
        reviewReady: 0,
      })

      // Refresh vocabulary map
      const updated = await getUserVocabulary(user.id)
      setWords(updated)
    }

    logWords()
  }, [currentLine, user, videoId, words])

  const handleWordTap = useCallback(
    async (word: WordBreakdown, lineIndex: number) => {
      if (!user || !videoId) return
      await logWordEncounter(user.id, word, videoId, lineIndex, true)
      const updated = await getUserVocabulary(user.id)
      setWords(updated)
    },
    [user, videoId]
  )

  return {
    words,
    sessionStats,
    handleWordTap,
  }
}
