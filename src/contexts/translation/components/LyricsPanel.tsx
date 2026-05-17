import { useRef, useEffect } from 'react';
import type { LyricsLine, TranscriptConfidence } from '../../../shared/types/database.types';
import { FAMILIARITY_THRESHOLDS } from '../../../shared/lib/constants';

// Visual treatment per confidence tier. High = no marker (the default, trusted
// state). Medium = amber left border ("plausible, but check"). Low = red left
// border + opacity ("Whisper wasn't sure — translation may be inaccurate").
const CONFIDENCE_STYLE: Record<TranscriptConfidence, string> = {
  high: '',
  medium: 'border-l-4 border-amber-500/60',
  low: 'border-l-4 border-red-500/60 opacity-80',
};

const CONFIDENCE_LABEL: Record<TranscriptConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence — Whisper less sure',
  low: 'Low confidence — may not be accurate Sanskrit',
};

export interface TappedWord {
  devanagari: string;
  iast: string;
  meaning?: string;
  root_dhatu?: string;
  grammar?: string;
}

interface LyricsPanelProps {
  lines: LyricsLine[];
  currentLineIndex: number;
  /** word-iast → familiarity score (0-1). Used to mark unfamiliar words on
   *  the active line so the learner spots them. */
  vocabulary?: Map<string, number>;
  /** Opens the WordPopup when a word chip below a verse is tapped. */
  onWordTap?: (word: TappedWord) => void;
}

export function LyricsPanel({
  lines,
  currentLineIndex,
  vocabulary,
  onWordTap,
}: LyricsPanelProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLineIndex]);

  if (lines.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 h-64 flex items-center justify-center">
        <p className="text-gray-500 text-sm animate-pulse">Waiting for lyrics...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 max-h-80 overflow-y-auto space-y-3 scrollbar-thin">
      {lines.map((line, i) => {
        const isActive = i === currentLineIndex;
        const confidence: TranscriptConfidence = line.confidence ?? 'high';
        const confidenceStyle = CONFIDENCE_STYLE[confidence];
        const tooltip =
          confidence === 'high'
            ? undefined
            : `${CONFIDENCE_LABEL[confidence]}${line.confidence_reason ? ` — ${line.confidence_reason}` : ''}`;
        return (
          <div
            key={i}
            ref={isActive ? activeRef : null}
            title={tooltip}
            className={`p-3 rounded-lg transition-all ${confidenceStyle} ${
              isActive
                ? 'bg-amber-500/10 border border-amber-500/30'
                : 'opacity-50 hover:opacity-80'
            }`}
          >
            {/* Devanagari verse text — render the canonical sandhi-joined form
                exactly as the curator wrote it. We deliberately do NOT split it
                into clickable word tokens here, because:
                  1. line.devanagari preserves the sandhi (जगज्जालपालं), which
                     would be lost if we concatenated word.devanagari entries
                     (जगत् + जाल + पालं) — the result reads as a bag of stems,
                     not a verse.
                  2. The word-by-word breakdown (with meanings) lives in
                     TranslationPanel where it renders correctly per active line. */}
            <p className="text-lg font-medium text-gray-100 mb-1 whitespace-pre-wrap">
              {line.devanagari}
            </p>

            {/* Transliteration */}
            <p className="text-sm text-gray-400 italic whitespace-pre-wrap">{line.iast}</p>

            {/* Clickable word chips — restores the click-to-meaning behavior
                that learners rely on (previously the verse text itself was
                clickable, but that destroyed sandhi rendering — see comment
                above). Now the verse text stays canonical, and a compact
                chip row beneath each line lets the learner tap any word to
                open the WordPopup with full IAST + dhātu + grammar.
                Unfamiliar words on the active line are highlighted amber. */}
            {onWordTap && line.words && line.words.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {line.words.map((word, wi) => {
                  const familiarity = vocabulary?.get(word.iast) ?? 0;
                  const isNew =
                    familiarity < FAMILIARITY_THRESHOLDS.RECOGNIZED;
                  return (
                    <button
                      key={wi}
                      type="button"
                      onClick={() => onWordTap(word)}
                      title="Tap for meaning, dhātu, and grammar"
                      className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        isNew && isActive
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-gray-800/60 text-gray-400 hover:bg-gray-800 hover:text-amber-300'
                      }`}
                    >
                      {word.devanagari}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Confidence chip — only shown for medium/low so the high path
                stays visually clean. Clicking the title attr already shows the
                full reason; the chip is the at-a-glance signal. */}
            {confidence !== 'high' && (
              <p
                className={`text-[10px] mt-1 uppercase tracking-wide ${
                  confidence === 'low' ? 'text-red-400/80' : 'text-amber-400/80'
                }`}
              >
                {confidence === 'low' ? 'Low confidence' : 'Medium confidence'}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
