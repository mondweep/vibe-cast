import { useState, useCallback, useRef } from 'react'
import type { LyricsLine } from '../../../shared/types/database.types'

interface SyncState {
  currentTime: number
  currentLineIndex: number
  isReady: boolean
  handleTimeUpdate: (time: number) => void
  handlePlayerReady: () => void
  setLines: (lines: LyricsLine[]) => void
}

export function useSync(_videoId: string | null): SyncState {
  const [currentTime, setCurrentTime] = useState(0)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const [isReady, setIsReady] = useState(false)
  const linesRef = useRef<LyricsLine[]>([])

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
    const lines = linesRef.current
    if (lines.length === 0) return

    const idx = lines.findIndex(
      (line) => time >= line.start_time && time < line.end_time
    )
    if (idx !== -1) {
      setCurrentLineIndex(idx)
    }
  }, [])

  const handlePlayerReady = useCallback(() => {
    setIsReady(true)
  }, [])

  const setLines = useCallback((lines: LyricsLine[]) => {
    linesRef.current = lines
  }, [])

  return {
    currentTime,
    currentLineIndex,
    isReady,
    handleTimeUpdate,
    handlePlayerReady,
    setLines,
  }
}
