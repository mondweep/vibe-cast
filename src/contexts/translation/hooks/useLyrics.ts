import { useState, useCallback } from 'react'
import type { LyricsLine } from '../../../shared/types/database.types'

export function useLyrics() {
  const [lines, setLines] = useState<LyricsLine[]>([])
  const [showDevanagari, setShowDevanagari] = useState(true)
  const [showTransliteration, setShowTransliteration] = useState(true)

  const toggleDevanagari = useCallback(() => setShowDevanagari(prev => !prev), [])
  const toggleTransliteration = useCallback(() => setShowTransliteration(prev => !prev), [])

  return {
    lines,
    setLines,
    showDevanagari,
    showTransliteration,
    toggleDevanagari,
    toggleTransliteration,
  }
}
