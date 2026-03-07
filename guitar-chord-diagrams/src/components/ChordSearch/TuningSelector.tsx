import type { NoteWithOctave, Tuning } from '../../types';
import { ALTERNATE_TUNINGS } from '../../data/tunings';

interface TuningSelectorProps {
  currentTuning: Tuning;
  onTuningChange: (tuning: Tuning) => void;
}

function extractNoteNames(notes: NoteWithOctave[]): string {
  return notes.map(n => n.replace(/\d+$/, '')).join(' ');
}

export default function TuningSelector({ currentTuning, onTuningChange }: TuningSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-500 font-medium">Tuning:</label>
      <select
        value={currentTuning.name}
        onChange={(e) => {
          const tuning = ALTERNATE_TUNINGS.find(t => t.name === e.target.value);
          if (tuning) onTuningChange(tuning);
        }}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:border-indigo-500 focus:outline-none"
      >
        {ALTERNATE_TUNINGS.map(tuning => (
          <option key={tuning.name} value={tuning.name}>
            {tuning.name} ({extractNoteNames(tuning.notes)})
          </option>
        ))}
      </select>
    </div>
  );
}
