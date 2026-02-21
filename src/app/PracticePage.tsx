import { useEffect, useRef } from 'react';
import { useMetronome, BeatIndicator, MetronomeControls } from '../contexts/metronome/index.ts';
import { useProgression, ProgressionDisplay } from '../contexts/chord-progression/index.ts';
import { playChord, stopChord } from '../contexts/chord-progression/domain/chord-audio.ts';

export function PracticePage() {
  const metronome = useMetronome(80, 4);
  const { currentChord, isSilence, progression } = useProgression(metronome.currentPosition);
  const prevChordRef = useRef<string | null>(null);
  const prevBarRef = useRef<number>(0);

  // Play chord audio when the current chord changes during playback
  useEffect(() => {
    if (!metronome.isPlaying || !currentChord) {
      return;
    }

    // Detect chord change: different chord OR same chord but different bar (e.g. Am in Bar1 vs Am in Bar4)
    const currentBar = metronome.currentPosition.bar;
    const chordKey = `${currentChord}-${currentBar}`;
    const prevKey = `${prevChordRef.current}-${prevBarRef.current}`;

    if (chordKey !== prevKey && !isSilence) {
      // Calculate duration based on BPM and how many beats the chord lasts
      const beatsPerSecond = metronome.bpm / 60;
      const chordDuration = Math.min(2, 2 / beatsPerSecond); // reasonable ring time
      playChord(currentChord, chordDuration);
    }

    prevChordRef.current = currentChord;
    prevBarRef.current = currentBar;
  }, [currentChord, metronome.isPlaying, metronome.currentPosition.bar, metronome.bpm, isSilence]);

  // Stop chord when metronome stops
  useEffect(() => {
    if (!metronome.isPlaying) {
      stopChord();
      prevChordRef.current = null;
      prevBarRef.current = 0;
    }
  }, [metronome.isPlaying]);

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
