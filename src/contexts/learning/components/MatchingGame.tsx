import { useState, useCallback } from 'react'
import type { DeckWord } from '../services/deckGenerator'

interface MatchingGameProps {
  words: DeckWord[]
  onComplete: (correct: number, total: number) => void
}

export function MatchingGame({ words, onComplete }: MatchingGameProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [incorrect, setIncorrect] = useState<string | null>(null)

  const shuffledMeanings = [...words].sort(() => Math.random() - 0.5)

  const handleSanskritClick = useCallback((wordId: string) => {
    if (matched.has(wordId)) return
    setSelected(wordId)
    setIncorrect(null)
  }, [matched])

  const handleMeaningClick = useCallback((wordId: string) => {
    if (!selected || matched.has(wordId)) return

    if (selected === wordId) {
      const newMatched = new Set(matched)
      newMatched.add(wordId)
      setMatched(newMatched)
      setSelected(null)

      if (newMatched.size === words.length) {
        onComplete(words.length, words.length)
      }
    } else {
      setIncorrect(wordId)
      setTimeout(() => setIncorrect(null), 800)
    }
  }, [selected, matched, words, onComplete])

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sanskrit</p>
        {words.map((word) => (
          <button
            key={word.wordId}
            onClick={() => handleSanskritClick(word.wordId)}
            disabled={matched.has(word.wordId)}
            className={`w-full p-3 rounded-lg text-left transition-all ${
              matched.has(word.wordId)
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : selected === word.wordId
                ? 'bg-amber-500/10 border border-amber-500/50 text-amber-300'
                : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
            }`}
          >
            <span className="text-lg">{word.devanagari}</span>
            <span className="text-sm text-gray-500 ml-2">{word.iast}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">English</p>
        {shuffledMeanings.map((word) => (
          <button
            key={`meaning-${word.wordId}`}
            onClick={() => handleMeaningClick(word.wordId)}
            disabled={matched.has(word.wordId)}
            className={`w-full p-3 rounded-lg text-left transition-all ${
              matched.has(word.wordId)
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : incorrect === word.wordId
                ? 'bg-red-500/10 border border-red-500/50 text-red-400 animate-shake'
                : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
            }`}
          >
            {word.meaning}
          </button>
        ))}
      </div>
    </div>
  )
}
