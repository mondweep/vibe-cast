import { useEffect, useState } from 'react'
import { useRevision } from '../contexts/learning/hooks/useRevision'
import { useAuth } from '../contexts/auth/hooks/useAuth'
import { syncLibraryDeck } from '../contexts/learning/services/libraryDeckSync'
import { Flashcard } from '../contexts/learning/components/Flashcard'
import { MatchingGame } from '../contexts/learning/components/MatchingGame'
import { BookOpen, Layers, Grid3X3, Volume2, Sparkles } from 'lucide-react'
import type { RevisionMode } from '../shared/types/database.types'

const MODES: { id: RevisionMode; label: string; icon: typeof BookOpen }[] = [
  { id: 'flashcard', label: 'Flashcards', icon: Layers },
  { id: 'matching', label: 'Matching', icon: Grid3X3 },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'sentence', label: 'Sentence', icon: BookOpen },
]

export function RevisePage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<RevisionMode>('flashcard')
  const [deck, setDeck] = useState<string>('all')
  const [syncNotice, setSyncNotice] = useState<number | null>(null)
  const [syncedKey, setSyncedKey] = useState(0) // bumped after sync so revision refetches
  const revision = useRevision(mode, `${deck}|${syncedKey}`)

  // Pre-populate the user's deck from the canonical library on revise mount.
  // Idempotent — diffs against existing user_vocabulary, only inserts new
  // words. Catches songs verified after the user signed up, too.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    syncLibraryDeck(user.id)
      .then((res) => {
        if (cancelled) return
        if (res.added > 0) {
          setSyncNotice(res.added)
          setSyncedKey((k) => k + 1) // force generateDeck to re-fetch
          // auto-dismiss the toast after 6s
          window.setTimeout(() => setSyncNotice(null), 6000)
        }
      })
      .catch((err) => {
        console.warn('Library deck sync failed:', err)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100 mb-1">Revise</h2>
        <p className="text-gray-400 text-sm">Strengthen your Sanskrit vocabulary</p>
      </div>

      {syncNotice && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 flex items-center gap-2">
          <Sparkles size={14} />
          Added {syncNotice} new word{syncNotice === 1 ? '' : 's'} from the verified library to your deck.
        </div>
      )}

      {/* Mode selector */}
      <div className="flex gap-2">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              mode === id
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-gray-200'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Deck filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'today', 'struggling', 'almost-learned'].map((d) => (
          <button
            key={d}
            onClick={() => setDeck(d)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              deck === d
                ? 'bg-gray-700 text-gray-100'
                : 'bg-gray-900 text-gray-500 hover:text-gray-300'
            }`}
          >
            {d === 'all' ? 'All words' : d === 'today' ? "Today's words" : d === 'almost-learned' ? 'Almost learned' : 'Struggling'}
          </button>
        ))}
      </div>

      {/* Revision content */}
      {revision.words.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-400">
            No words to revise yet. Listen to some Sanskrit songs first!
          </p>
        </div>
      ) : mode === 'flashcard' ? (
        <Flashcard
          word={revision.currentWord}
          onRate={revision.handleRate}
          progress={revision.progress}
        />
      ) : mode === 'matching' ? (
        <MatchingGame
          words={revision.matchingSet}
          onComplete={revision.handleMatchingComplete}
        />
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-400">
            {mode === 'audio' ? 'Audio' : 'Sentence'} mode coming in Phase 2
          </p>
        </div>
      )}

      {/* Session stats */}
      {revision.sessionStats.reviewed > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-gray-100">{revision.sessionStats.reviewed}</p>
            <p className="text-xs text-gray-500">Reviewed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{revision.sessionStats.correct}</p>
            <p className="text-xs text-gray-500">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{revision.sessionStats.incorrect}</p>
            <p className="text-xs text-gray-500">To review</p>
          </div>
        </div>
      )}
    </div>
  )
}
