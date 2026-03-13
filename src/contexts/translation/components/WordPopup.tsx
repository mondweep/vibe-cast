import { useEffect, useRef } from 'react'
import type { WordBreakdown } from '../../../shared/types/database.types'
import { BookmarkPlus, Volume2 } from 'lucide-react'

interface WordPopupProps {
  word: WordBreakdown
  position: { x: number; y: number }
  onClose: () => void
}

export function WordPopup({ word, position, onClose }: WordPopupProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-xl w-72"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xl text-amber-300">{word.devanagari}</p>
          <p className="text-sm text-gray-400">{word.iast}</p>
        </div>
        <div className="flex gap-2">
          <button className="text-gray-500 hover:text-amber-400" title="Listen">
            <Volume2 size={16} />
          </button>
          <button className="text-gray-500 hover:text-amber-400" title="Mark for revision">
            <BookmarkPlus size={16} />
          </button>
        </div>
      </div>

      <p className="text-gray-200 text-sm mb-2">{word.meaning || 'Meaning not available'}</p>

      {word.root_dhatu && (
        <p className="text-xs text-gray-500">
          Root: <span className="text-gray-400">{word.root_dhatu}</span>
        </p>
      )}
      {word.grammar && (
        <p className="text-xs text-gray-500">
          Grammar: <span className="text-gray-400">{word.grammar}</span>
        </p>
      )}
    </div>
  )
}
