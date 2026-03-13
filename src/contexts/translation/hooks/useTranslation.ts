import { useState, useEffect, useCallback, useRef } from 'react'
import type { LyricsLine } from '../../../shared/types/database.types'
import { translateSong, fetchCachedSong, cacheSong } from '../services/translator'

interface TranslationState {
  lines: LyricsLine[]
  currentLineIndex: number
  currentLine: LyricsLine | null
  currentExplanation: string
  loading: boolean
  error: string | null
}

export function useTranslation(videoId: string | null, currentTime: number): TranslationState {
  const [lines, setLines] = useState<LyricsLine[]>([])
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const translatedRef = useRef<string | null>(null)

  // Load lyrics when video changes
  useEffect(() => {
    if (!videoId || translatedRef.current === videoId) return
    translatedRef.current = videoId

    const loadLyrics = async () => {
      setLoading(true)
      setError(null)
      try {
        // Check cache first
        const cached = await fetchCachedSong(videoId)
        if (cached) {
          setLines(cached)
          setLoading(false)
          return
        }

        // Translate via API
        const translated = await translateSong(videoId)
        setLines(translated)

        // Cache for future use
        await cacheSong(videoId, translated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Translation failed')
      } finally {
        setLoading(false)
      }
    }

    loadLyrics()
  }, [videoId])

  // Update current line based on time
  useEffect(() => {
    if (lines.length === 0) return
    const idx = lines.findIndex(
      (line) => currentTime >= line.start_time && currentTime < line.end_time
    )
    if (idx !== -1 && idx !== currentLineIndex) {
      setCurrentLineIndex(idx)
    }
  }, [currentTime, lines, currentLineIndex])

  const currentLine = currentLineIndex >= 0 ? lines[currentLineIndex] : null
  const currentExplanation = currentLine?.explanation || ''

  return {
    lines,
    currentLineIndex,
    currentLine,
    currentExplanation,
    loading,
    error,
  }
}
