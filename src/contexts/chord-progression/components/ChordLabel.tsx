import type { ChordName } from '../domain/types.ts';

interface ChordLabelProps {
  chord: ChordName | null;
  isActive: boolean;
  isSilence?: boolean;
}

export function ChordLabel({ chord, isActive, isSilence }: ChordLabelProps) {
  if (!chord) return null;

  return (
    <span
      className={`chord-label ${isActive ? 'chord-label--active' : ''} ${isSilence ? 'chord-label--silence' : ''}`}
      aria-label={`${chord}${isSilence ? ' (silence)' : ''}`}
    >
      {chord}
      {isSilence && <span className="chord-label__silence-badge">silence</span>}
    </span>
  );
}
