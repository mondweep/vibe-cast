import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { DeckWord } from '../services/deckGenerator'

interface FlashcardProps {
  word: DeckWord | null
  onRate: (rating: number) => void
  progress: { current: number; total: number }
}

export function Flashcard({ word, onRate, progress }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false)

  if (!word) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">No more cards to review!</p>
      </div>
    )
  }

  const handleRate = (rating: number) => {
    setFlipped(false)
    onRate(rating)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">
        {progress.current} / {progress.total}
      </p>

      <div
        onClick={() => setFlipped(!flipped)}
        className="bg-gray-900 border border-gray-800 rounded-2xl p-8 min-h-48 flex flex-col items-center justify-center cursor-pointer hover:border-gray-700 transition-colors"
      >
        {!flipped ? (
          <>
            <p className="text-4xl text-amber-300 mb-2">{word.devanagari}</p>
            <p className="text-lg text-gray-500">{word.iast}</p>
            <p className="text-sm text-gray-600 mt-4 flex items-center gap-1">
              <RotateCcw size={14} /> Tap to reveal
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl text-gray-100 mb-2">{word.meaning}</p>
            <p className="text-sm text-gray-500">{word.devanagari} — {word.iast}</p>
          </>
        )}
      </div>

      {flipped && (
        <div className="flex justify-center gap-2">
          <RateButton label="Again" color="bg-red-500/20 text-red-400" onClick={() => handleRate(1)} />
          <RateButton label="Hard" color="bg-orange-500/20 text-orange-400" onClick={() => handleRate(2)} />
          <RateButton label="Good" color="bg-blue-500/20 text-blue-400" onClick={() => handleRate(3)} />
          <RateButton label="Easy" color="bg-green-500/20 text-green-400" onClick={() => handleRate(5)} />
        </div>
      )}
    </div>
  )
}

function RateButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${color} px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity`}
    >
      {label}
    </button>
  )
}
