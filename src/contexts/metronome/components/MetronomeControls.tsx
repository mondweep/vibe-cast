import { MIN_BPM, MAX_BPM } from '../domain/types.ts';

interface MetronomeControlsProps {
  bpm: number;
  isPlaying: boolean;
  onBpmChange: (bpm: number) => void;
  onToggle: () => void;
}

export function MetronomeControls({ bpm, isPlaying, onBpmChange, onToggle }: MetronomeControlsProps) {
  return (
    <div className="metronome-controls">
      <button
        className="metronome-controls__toggle"
        onClick={onToggle}
        aria-label={isPlaying ? 'Stop metronome' : 'Start metronome'}
      >
        {isPlaying ? 'Stop' : 'Start'}
      </button>
      <div className="metronome-controls__bpm">
        <label htmlFor="bpm-slider">BPM: {bpm}</label>
        <input
          id="bpm-slider"
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={e => onBpmChange(Number(e.target.value))}
          aria-label={`Tempo: ${bpm} beats per minute`}
        />
      </div>
    </div>
  );
}
