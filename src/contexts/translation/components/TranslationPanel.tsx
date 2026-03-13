import type { LyricsLine, TranslationMode } from '../../../shared/types/database.types'

interface TranslationPanelProps {
  currentLine: LyricsLine | null
  mode: TranslationMode
  explanation: string
}

export function TranslationPanel({ currentLine, mode, explanation }: TranslationPanelProps) {
  if (!currentLine) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 text-center">
        <p className="text-gray-500">Translation will appear here as the song plays</p>
      </div>
    )
  }

  const translation = mode === 'literal'
    ? currentLine.english_literal
    : currentLine.english_poetic

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Translation</h3>

      <p className="text-lg text-gray-100 leading-relaxed">
        {translation}
      </p>

      {explanation && (
        <details className="group">
          <summary className="text-sm text-amber-400/70 cursor-pointer hover:text-amber-400 transition-colors">
            Context & meaning
          </summary>
          <p className="mt-2 text-sm text-gray-400 leading-relaxed pl-4 border-l-2 border-gray-800">
            {explanation}
          </p>
        </details>
      )}

      {/* Word-by-word breakdown */}
      {currentLine.words && currentLine.words.length > 0 && (
        <div className="pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-600 mb-2">Word by word:</p>
          <div className="flex flex-wrap gap-2">
            {currentLine.words.map((word, idx) => (
              <span key={idx} className="text-xs bg-gray-800 rounded px-2 py-1">
                <span className="text-amber-300">{word.iast}</span>
                <span className="text-gray-500 mx-1">=</span>
                <span className="text-gray-400">{word.meaning}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
