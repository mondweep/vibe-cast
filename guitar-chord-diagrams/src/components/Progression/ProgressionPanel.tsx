import type { ParsedChord } from '../../types';

export interface ProgressionEntry {
  chord: ParsedChord;
  timestamp: number;
  duration: number; // ms
}

interface ProgressionPanelProps {
  entries: ProgressionEntry[];
  onSelect: (chord: ParsedChord) => void;
  onClear: () => void;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ProgressionPanel({ entries, onSelect, onClear }: ProgressionPanelProps) {
  if (entries.length === 0) return null;

  const progressionText = entries.map(e => e.chord.displayName).join(' - ');

  function handleCopy() {
    navigator.clipboard.writeText(progressionText);
  }

  return (
    <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
          </svg>
          Chord Progression
          <span className="text-xs font-normal text-gray-400">({entries.length} chords)</span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Copy
          </button>
          <button
            onClick={onClear}
            className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {entries.map((entry, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(entry.chord)}
            className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-gray-100 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors group"
          >
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {entry.chord.displayName}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">
              {formatTime(entry.timestamp)} · {formatDuration(entry.duration)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
        {progressionText}
      </div>
    </div>
  );
}
