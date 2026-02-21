import type { BeatPosition } from '../../metronome/domain/types.ts';
import type { Progression } from '../domain/types.ts';
import { ChordLabel } from './ChordLabel.tsx';
import { MiniChordDiagram } from './MiniChordDiagram.tsx';

interface ProgressionDisplayProps {
  progression: Progression;
  currentPosition: BeatPosition;
  isPlaying: boolean;
}

export function ProgressionDisplay({ progression, currentPosition, isPlaying }: ProgressionDisplayProps) {
  return (
    <div className="progression-display" role="region" aria-label="Chord progression">
      <h3 className="progression-display__title">{progression.name}</h3>
      <div className="progression-display__bars">
        {progression.bars.map(bar => (
          <div
            key={bar.barNumber}
            className={`progression-display__bar ${isPlaying && currentPosition.bar === bar.barNumber ? 'progression-display__bar--active' : ''
              }`}
          >
            <div className="progression-display__bar-label">
              Bar {bar.barNumber}
              {bar.label && <span className="progression-display__bar-tag">{bar.label}</span>}
            </div>
            <div className="progression-display__segments">
              {bar.segments.map((segment, i) => {
                const isActive = isPlaying &&
                  currentPosition.bar === bar.barNumber &&
                  currentPosition.beat >= segment.startBeat &&
                  currentPosition.beat <= segment.endBeat;
                const isSilence = isActive &&
                  segment.silence !== undefined &&
                  currentPosition.beat === segment.silence.onBeat &&
                  currentPosition.subdivision === 'down';

                return (
                  <div key={i} className="progression-display__segment">
                    <ChordLabel
                      chord={segment.chord}
                      isActive={isActive}
                      isSilence={isSilence}
                    />
                    <MiniChordDiagram
                      chord={segment.chord}
                      isActive={isActive}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
