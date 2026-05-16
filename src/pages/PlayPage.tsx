import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { YouTubePlayer } from '../contexts/player/components/YouTubePlayer'
import { URLInput } from '../contexts/player/components/URLInput'
import { LyricsPanel } from '../contexts/translation/components/LyricsPanel'
import { EditableLyricsPanel } from '../contexts/translation/components/EditableLyricsPanel'
import { TranslationPanel } from '../contexts/translation/components/TranslationPanel'
import { VerifyBar } from '../contexts/translation/components/VerifyBar'
import { SessionSummary } from '../contexts/learning/components/SessionSummary'
import { useSync } from '../contexts/player/hooks/useSync'
import { useTranslation } from '../contexts/translation/hooks/useTranslation'
import { useVocabulary } from '../contexts/learning/hooks/useVocabulary'
import type { TranslationMode } from '../shared/types/database.types'

export function PlayPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [videoId, setVideoIdState] = useState<string | null>(searchParams.get('v'))
  const [translationMode, setTranslationMode] = useState<TranslationMode>('poetic')
  const [showSummary, setShowSummary] = useState(false)
  const [editing, setEditing] = useState(false)
  // Optimistic override after a successful Verify or Unverify so the UI
  // reflects the new state without refetching the song from Supabase.
  // Reset to null whenever the video changes.
  const [localVerifiedOverride, setLocalVerifiedOverride] = useState<boolean | null>(null)
  useEffect(() => setLocalVerifiedOverride(null), [videoId])

  // Wrapping setter keeps URL ?v=… and state in sync, so Library deep-links
  // remain shareable and back-button works.
  const setVideoId = useCallback(
    (id: string | null) => {
      setVideoIdState(id)
      const next = new URLSearchParams(searchParams)
      if (id) next.set('v', id)
      else next.delete('v')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Pick up changes to ?v= from external navigation (e.g. browser back).
  useEffect(() => {
    const v = searchParams.get('v')
    if (v !== videoId) setVideoIdState(v)
  }, [searchParams, videoId])

  const sync = useSync(videoId)
  const translation = useTranslation(videoId, sync.currentTime)
  const vocabulary = useVocabulary(translation.currentLine, videoId)

  const handleVideoEnd = useCallback(() => {
    setShowSummary(true)
  }, [])

  const isVerified =
    localVerifiedOverride !== null ? localVerifiedOverride : translation.isVerified

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
            <VerifyBar
              videoId={videoId}
              lines={translation.lines}
              isVerified={isVerified}
              transcriptionLanguage={translation.transcriptionLanguage}
              editing={editing}
              onToggleEdit={() => setEditing((v) => !v)}
              onVerified={() => {
                setLocalVerifiedOverride(true)
                setEditing(false)
              }}
              onUnverified={() => setLocalVerifiedOverride(false)}
            />

            {editing ? (
              <EditableLyricsPanel
                lines={translation.lines}
                currentLineIndex={translation.currentLineIndex}
                onChange={translation.updateLine}
              />
            ) : (
              <LyricsPanel
                lines={translation.lines}
                currentLineIndex={translation.currentLineIndex}
                vocabulary={vocabulary.words}
                onWordTap={(word) => vocabulary.handleWordTap({ ...word, meaning: word.iast }, translation.currentLineIndex)}
              />
            )}

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
