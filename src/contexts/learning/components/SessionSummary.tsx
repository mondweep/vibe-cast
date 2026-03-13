import { X, BookOpen, Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SessionSummaryProps {
  stats: {
    totalWords: number
    newWords: number
    reviewReady: number
  }
  onClose: () => void
}

export function SessionSummary({ stats, onClose }: SessionSummaryProps) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-300">
          <X size={20} />
        </button>

        <div className="text-center space-y-4">
          <Sparkles className="text-amber-400 mx-auto" size={32} />
          <h2 className="text-xl font-bold text-gray-100">Session Complete</h2>

          <div className="grid grid-cols-3 gap-4 py-4">
            <div>
              <p className="text-3xl font-bold text-gray-100">{stats.totalWords}</p>
              <p className="text-xs text-gray-500">Words heard</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-400">{stats.newWords}</p>
              <p className="text-xs text-gray-500">New words</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-400">{stats.reviewReady}</p>
              <p className="text-xs text-gray-500">To review</p>
            </div>
          </div>

          {stats.newWords > 0 && (
            <button
              onClick={() => { onClose(); navigate('/revise'); }}
              className="flex items-center gap-2 mx-auto bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              <BookOpen size={16} />
              Revise new words
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
