import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { YouTubePlayer } from '../contexts/player/components/YouTubePlayer'
import { URLInput } from '../contexts/player/components/URLInput'
import { LyricsPanel, type TappedWord } from '../contexts/translation/components/LyricsPanel'
import { EditableLyricsPanel } from '../contexts/translation/components/EditableLyricsPanel'
import { TranslationPanel } from '../contexts/translation/components/TranslationPanel'
import { VerifyBar } from '../contexts/translation/components/VerifyBar'
import { WordPopup } from '../contexts/translation/components/WordPopup'
import {
  SourceTextDisclaimerBanner,
  LYRICS_ARE_SOURCE_TEXT_TAG,
} from '../contexts/translation/components/SourceTextDisclaimerBanner'
import { SessionSummary } from '../contexts/learning/components/SessionSummary'
import { useSync } from '../contexts/player/hooks/useSync'
import { useTranslation } from '../contexts/translation/hooks/useTranslation'
import { useVocabulary } from '../contexts/learning/hooks/useVocabulary'
import { useAuth } from '../contexts/auth/hooks/useAuth'
import { useCurator } from '../contexts/auth/hooks/useCurator'
import { RequestSongForm } from '../contexts/library/components/RequestSongForm'
import { ConceptSidePanel } from '../shared/components/ConceptSidePanel'
import type { TranslationMode } from '../shared/types/database.types'

export function PlayPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [videoId, setVideoIdState] = useState<string | null>(searchParams.get('v'))
  const [translationMode, setTranslationMode] = useState<TranslationMode>('poetic')
  const [showSummary, setShowSummary] = useState(false)
  const [editing, setEditing] = useState(false)
  const [tappedWord, setTappedWord] = useState<TappedWord | null>(null)
  const { user } = useAuth()
  const { isCurator } = useCurator()
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
  // Only the curator is allowed to trigger live transcription. For everyone
  // else, useTranslation will resolve a verified row OR surface a friendly
  // "not in library" error rather than running Whisper.
  const translation = useTranslation(videoId, sync.currentTime, isCurator)
  const vocabulary = useVocabulary(translation.currentLine, videoId)

  const handleVideoEnd = useCallback(() => {
    setShowSummary(true)
  }, [])

  const isVerified =
    localVerifiedOverride !== null ? localVerifiedOverride : translation.isVerified

  // Render the source-text disclaimer banner above the lyrics panel when the
  // song row carries the `lyrics-are-source-text` tag. Survives Verify & Save
  // because the tag lives on the songs row itself, not in lyrics_json.
  const showSourceTextDisclaimer = (translation.tags ?? []).includes(
    LYRICS_ARE_SOURCE_TEXT_TAG
  )

  return (
    <div className="space-y-6">
      {/* The URL input triggers live yt-dlp + Whisper transcription, which we
          deliberately keep curator-only. Non-curators hitting YouTube directly
          from the deployed app would run into anti-bot blocks, and even when
          it works they'd see Whisper transcriptions of unverified quality.
          Curators see the input; everyone else gets a request form below. */}
      {isCurator && <URLInput onVideoSelect={setVideoId} />}

      {/* Non-curator opened a videoId that isn't in the verified library.
          Live transcription is curator-gated, so show the request form
          instead of a broken / silent player. */}
      {videoId && !isCurator && translation.error === 'not-in-library' && (
        <div className="py-10 space-y-6">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-xl font-semibold text-gray-200 mb-2">
              This song isn't in the library yet
            </h2>
            <p className="text-gray-400 text-sm">
              Verified translations and word-by-word breakdowns are only available for songs the
              curator has reviewed. You can request this one below — the curator gets a Telegram
              notification and will add it as soon as possible.
            </p>
          </div>
          <RequestSongForm />
        </div>
      )}

      {videoId && (isCurator || translation.error !== 'not-in-library') && (
        <div className="space-y-4">
          <ConceptSidePanel videoId={videoId} />
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
            {/* VerifyBar is curator-only and self-gates on email allowlist;
                it returns null for anonymous and non-curator users. */}
            {user && (
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
            )}

            {showSourceTextDisclaimer && <SourceTextDisclaimerBanner />}

            {editing ? (
              <EditableLyricsPanel
                lines={translation.lines}
                currentLineIndex={translation.currentLineIndex}
                currentTime={sync.currentTime}
                onChange={translation.updateLine}
              />
            ) : (
              <LyricsPanel
                lines={translation.lines}
                currentLineIndex={translation.currentLineIndex}
                vocabulary={vocabulary.words}
                onWordTap={(word) => {
                  // Always open the popup so anonymous visitors can see the
                  // meaning. Vocabulary write only happens when signed in
                  // (handleWordTap guards on !user internally).
                  setTappedWord(word)
                  vocabulary.handleWordTap(
                    { ...word, meaning: word.meaning || word.iast },
                    translation.currentLineIndex
                  )
                }}
              />
            )}

            <TranslationPanel
              currentLine={translation.currentLine}
              mode={translationMode}
              explanation={translation.currentExplanation}
            />
          </div>
        </div>
        </div>
      )}

      {!videoId && isCurator && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🙏</p>
          <h2 className="text-2xl font-bold text-gray-200 mb-2">
            Discover Sanskrit Through Music
          </h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Paste a YouTube URL of any Sanskrit song above. As it plays, you'll see real-time
            transcription and translation — review and verify to add it to the public library.
          </p>
        </div>
      )}

      {!videoId && !isCurator && (
        <div className="py-10 space-y-6">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-5xl mb-4">🙏</p>
            <h2 className="text-2xl font-bold text-gray-200 mb-2">
              Discover Sanskrit Through Music
            </h2>
            <p className="text-gray-400">
              Open a song from the{' '}
              <a href="/library" className="text-amber-400 hover:underline">
                Library
              </a>{' '}
              to play with real-time, verified translations and word-by-word breakdowns.
            </p>
          </div>
          <RequestSongForm />
        </div>
      )}

      {showSummary && (
        <SessionSummary
          stats={vocabulary.sessionStats}
          onClose={() => setShowSummary(false)}
        />
      )}

      {tappedWord && (
        <WordPopup
          word={{
            devanagari: tappedWord.devanagari,
            iast: tappedWord.iast,
            meaning: tappedWord.meaning || '(no meaning recorded)',
            root_dhatu: tappedWord.root_dhatu,
            grammar: tappedWord.grammar,
          }}
          onClose={() => setTappedWord(null)}
          // Mark-revision / mark-learned only do anything for signed-in users.
          // For anonymous users the buttons stay in place but show a sign-in
          // nudge instead of writing to the DB. (WordPopup currently always
          // renders both buttons; we no-op them here.)
          onMarkRevision={() => {
            if (!user) return
            // TODO: wire to vocabulary.markRevision once that helper exists
            setTappedWord(null)
          }}
          onMarkLearned={() => {
            if (!user) return
            // TODO: wire to vocabulary.markLearned once that helper exists
            setTappedWord(null)
          }}
        />
      )}
    </div>
  )
}
