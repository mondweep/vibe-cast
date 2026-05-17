import type { LyricsLine, TranslationMode } from '../../../shared/types/database.types';

interface TranslationPanelProps {
  currentLine: LyricsLine | null;
  mode: TranslationMode;
  explanation: string;
}

export function TranslationPanel({ currentLine, mode, explanation }: TranslationPanelProps) {
  if (!currentLine) {
    return (
      <div className="bg-gray-900 rounded-xl p-6">
        <p className="text-gray-500 text-sm">Translation will appear here as the song plays...</p>
      </div>
    );
  }

  const confidence = currentLine.confidence ?? 'high';
  const translation = mode === 'literal' ? currentLine.english_literal : currentLine.english_poetic;

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      {/* Medium-confidence disclaimer above the translation. Low-confidence
          lines are dropped server-side, so we only ever surface 'medium' here. */}
      {confidence === 'medium' && (
        <div className="rounded-md px-3 py-2 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30">
          Medium confidence: Whisper had some uncertainty transcribing this line — the translation may not be exact.
          {currentLine.confidence_reason && (
            <span className="block text-[10px] opacity-70 mt-0.5">
              {currentLine.confidence_reason}
            </span>
          )}
        </div>
      )}

      {/* English translation */}
      <div>
        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
          {mode === 'literal' ? 'Literal Translation' : 'Meaning'}
        </p>
        <p className="text-lg text-gray-100">{translation}</p>
      </div>

      {/* Word-by-word breakdown */}
      {currentLine.words && currentLine.words.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Word by Word</p>
          <div className="flex flex-wrap gap-2">
            {currentLine.words.map((word, i) => (
              <div
                key={i}
                className="bg-gray-800 rounded-lg px-3 py-1.5 text-center"
              >
                <p className="text-sm text-amber-400">{word.devanagari}</p>
                <p className="text-xs text-gray-400">{word.meaning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <details className="group">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors uppercase tracking-wide">
            Context & Meaning
          </summary>
          <p className="text-sm text-gray-300 mt-2 leading-relaxed">{explanation}</p>
        </details>
      )}
    </div>
  );
}
