import { X } from 'lucide-react';
import type { WordBreakdown } from '../../../shared/types/database.types';

interface WordPopupProps {
  word: WordBreakdown & {
    otherSongs?: string[];
    encounterCount?: number;
  };
  onClose: () => void;
  onMarkRevision: () => void;
  onMarkLearned: () => void;
}

export function WordPopup({ word, onClose, onMarkRevision, onMarkLearned }: WordPopupProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full space-y-4 border border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-3xl text-amber-400">{word.devanagari}</p>
            <p className="text-sm text-gray-400 italic">{word.iast}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500 uppercase">Meaning</p>
            <p className="text-gray-200">{word.meaning}</p>
          </div>

          {word.root_dhatu && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Root (Dhatu)</p>
              <p className="text-gray-300">{word.root_dhatu}</p>
            </div>
          )}

          {word.grammar && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Grammar</p>
              <p className="text-gray-300">{word.grammar}</p>
            </div>
          )}

          {word.encounterCount !== undefined && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Times Encountered</p>
              <p className="text-gray-300">{word.encounterCount}</p>
            </div>
          )}

          {word.otherSongs && word.otherSongs.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase">Also appears in</p>
              <ul className="text-sm text-gray-400">
                {word.otherSongs.map((song, i) => (
                  <li key={i}>{song}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onMarkRevision}
            className="flex-1 bg-amber-500/20 text-amber-400 border border-amber-500/50 py-2 rounded-lg text-sm hover:bg-amber-500/30 transition-colors"
          >
            Mark for Revision
          </button>
          <button
            onClick={onMarkLearned}
            className="flex-1 bg-green-500/20 text-green-400 border border-green-500/50 py-2 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
          >
            I Know This
          </button>
        </div>
      </div>
    </div>
  );
}
