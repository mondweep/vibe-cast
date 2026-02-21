import { useMetronome, BeatIndicator, MetronomeControls } from '../contexts/metronome/index.ts';
import { useProgression, ProgressionDisplay } from '../contexts/chord-progression/index.ts';

export function PracticePage() {
  const metronome = useMetronome(80, 4);
  const { progression } = useProgression(metronome.currentPosition);

  return (
    <div className="page practice-page">
      <h2>Practice Mode</h2>
      <p className="page__subtitle">Metronome + chord progression synchronized</p>

      <MetronomeControls
        bpm={metronome.bpm}
        isPlaying={metronome.isPlaying}
        onBpmChange={metronome.setBpm}
        onToggle={metronome.toggle}
      />

      <BeatIndicator
        currentPosition={metronome.currentPosition}
        isPlaying={metronome.isPlaying}
      />

      <ProgressionDisplay
        progression={progression}
        currentPosition={metronome.currentPosition}
        isPlaying={metronome.isPlaying}
      />
    </div>
  );
}
