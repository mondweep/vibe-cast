import type { BeatPosition } from '../domain/types.ts';
import { SUBDIVISION_LABELS } from '../domain/types.ts';
import { getSubdivisionLabel } from '../domain/metronome-engine.ts';

interface BeatIndicatorProps {
  currentPosition: BeatPosition;
  isPlaying: boolean;
}

export function BeatIndicator({ currentPosition, isPlaying }: BeatIndicatorProps) {
  const currentIndex = currentPosition.tick % 8;

  return (
    <div
      className="beat-indicator"
      role="status"
      aria-label={`Beat: ${getSubdivisionLabel(currentPosition)}`}
    >
      <div className="beat-indicator__dots">
        {SUBDIVISION_LABELS.map((label, index) => (
          <span
            key={index}
            className={`beat-indicator__dot ${
              isPlaying && index === currentIndex ? 'beat-indicator__dot--active' : ''
            } ${index % 2 === 0 ? 'beat-indicator__dot--downbeat' : 'beat-indicator__dot--upbeat'}`}
            aria-hidden="true"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
