import { useRef, useEffect, useState } from 'react'
import type { LyricsLine, WordBreakdown } from '../../../shared/types/database.types'
import { WordPopup } from './WordPopup'

interface LyricsPanelProps {
  lines: LyricsLine[]
  currentLineIndex: number
  vocabulary: Map<string, number>  // word -> familiarity
  onWordTap: (word: WordBreakdown, lineIndex: number) => void
}

export function LyricsPanel({ lines, currentLineIndex, vocabulary, onWordTap }: LyricsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedWord, setSelectedWord] = useState<WordBreakdown | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })

  // Auto-scroll to current line
  useEffect(() => {
    if (currentLineIndex < 0 || !containerRef.current) return
    const lineEl = containerRef.current.querySelector(`[data-line="${currentLineIndex}"]`)
    lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentLineIndex])

  const handleWordClick = (word: WordBreakdown, lineIndex: number, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    setPopupPosition({ x: rect.left, y: rect.bottom + 8 })
    setSelectedWord(word)
    onWordTap(word, lineIndex)
  }

  if (lines.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 text-center">
        <p className="text-gray-500 animate-pulse">Waiting for lyrics...</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="bg-gray-900 rounded-xl p-4 max-h-96 overflow-y-auto space-y-3">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Lyrics</h3>
      {lines.map((line, idx) => {
        const isCurrent = idx === currentLineIndex
        const isPast = idx < currentLineIndex
        return (
          <div
            key={idx}
            data-line={idx}
            className={`p-3 rounded-lg transition-all duration-300 ${
              isCurrent
                ? 'bg-amber-500/10 border border-amber-500/30'
                : isPast
                ? 'opacity-50'
                : 'opacity-70'
            }`}
          >
            {/* Devanagari */}
            <p className={`text-lg font-medium ${isCurrent ? 'text-amber-300' : 'text-gray-300'}`}>
              {line.words?.map((word, wIdx) => {
                const familiarity = vocabulary.get(word.devanagari) ?? 0
                return (
                  <span
                    key={wIdx}
                    onClick={(e) => handleWordClick(word, idx, e)}
                    className={`cursor-pointer hover:underline decoration-amber-400/50 mr-1 ${
                      familiarity < 0.3
                        ? 'font-bold text-amber-200'  // New word - highlight
                        : familiarity < 0.7
                        ? ''  // Recognized - normal
                        : 'opacity-80'  // Known - subtle
                    }`}
                  >
                    {word.devanagari}
                  </span>
                )
              }) || line.devanagari}
            </p>

            {/* IAST transliteration */}
            <p className={`text-sm mt-1 ${isCurrent ? 'text-gray-400' : 'text-gray-600'}`}>
              {line.iast}
            </p>
          </div>
        )
      })}

      {selectedWord && (
        <WordPopup
          word={selectedWord}
          position={popupPosition}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  )
}
