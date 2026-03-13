import { useState } from 'react'
import { YouTubePlayer } from '../contexts/player/components/YouTubePlayer'
import { URLInput } from '../contexts/player/components/URLInput'
import { LyricsPanel } from '../contexts/translation/components/LyricsPanel'
import { TranslationPanel } from '../contexts/translation/components/TranslationPanel'
import { SessionSummary } from '../contexts/learning/components/SessionSummary'
import { useSync } from '../contexts/player/hooks/useSync'
import { useTranslation } from '../contexts/translation/hooks/useTranslation'
import { useVocabulary } from '../contexts/learning/hooks/useVocabulary'
import type { TranslationMode } from '../shared/types/database.types'

export function PlayPage() {
  const [videoId, setVideoId] = useState<string | null>(null)
  const [translationMode, setTranslationMode] = useState<TranslationMode>('poetic')
  const [showSummary, setShowSummary] = useState(false)

  const sync = useSync(videoId)
  const translation = useTranslation(videoId, sync.currentTime)
  const vocabulary = useVocabulary(translation.currentLine, videoId)

  const handleVideoEnd = () => {
    setShowSummary(true)
  }

  return (
    <div className="space-y-6">
      <URLInput onVideoSelect={setVideoId} />

      {videoId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <YouTubePlayer
              videoId={videoId}
              onTimeUpdate={sync.handleTimeUpdate}
              onEnd={handleVideoEnd}
              onReady={sync.handlePlayerReady}
            />

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Translation:</label>
              <button
                onClick={() => setTranslationMode('poetic')}
                className={`text-sm px-3 py-1 rounded-full transition-colors ${
                  translationMode === 'poetic'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'text-gray-500 border border-gray-700 hover:text-gray-300'
                }`}
              >
                Poetic
              </button>
              <button
                onClick={() => setTranslationMode('literal')}
                className={`text-sm px-3 py-1 rounded-full transition-colors ${
                  translationMode === 'literal'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'text-gray-500 border border-gray-700 hover:text-gray-300'
                }`}
              >
                Literal
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <LyricsPanel
              lines={translation.lines}
              currentLineIndex={translation.currentLineIndex}
              vocabulary={vocabulary.words}
              onWordTap={vocabulary.handleWordTap}
            />
            <TranslationPanel
              currentLine={translation.currentLine}
              mode={translationMode}
              explanation={translation.currentExplanation}
            />
          </div>
        </div>
      )}

      {!videoId && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🙏</p>
          <h2 className="text-2xl font-bold text-gray-200 mb-2">
            Discover Sanskrit Through Music
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Paste a YouTube URL of any Sanskrit song above. As it plays, you'll see real-time
            translations and start building your Sanskrit vocabulary.
          </p>
        </div>
      )}

      {showSummary && (
        <SessionSummary
          stats={vocabulary.sessionStats}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  )
}
