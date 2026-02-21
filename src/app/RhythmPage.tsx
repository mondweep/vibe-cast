import { useCallback, useEffect, useState } from 'react';
import { useMetronome, BeatIndicator, MetronomeControls } from '../contexts/metronome/index.ts';
import { useProgression } from '../contexts/chord-progression/index.ts';
import { useRhythmTapper, TapZone } from '../contexts/rhythm-tapper/index.ts';
import type { TapResult } from '../contexts/rhythm-tapper/domain/types.ts';
import { useGamification } from '../contexts/gamification/index.ts';

export function RhythmPage() {
  const metronome = useMetronome(80, 4);
  const { currentSegment, isSilence } = useProgression(metronome.currentPosition);
  const tapper = useRhythmTapper(metronome.bpm);
  const { recordDrill } = useGamification();
  const [lastJudgement, setLastJudgement] = useState<TapResult['judgement'] | null>(null);

  useEffect(() => {
    tapper.updateBeat(metronome.currentPosition);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronome.currentPosition, tapper.updateBeat]);

  const handleTap = useCallback(() => {
    const result = tapper.tap(currentSegment);
    if (result) {
      setLastJudgement(result.judgement);
      setTimeout(() => setLastJudgement(null), 300);
    }
    return result;
  }, [tapper, currentSegment]);

  const handleStop = useCallback(() => {
    metronome.stop();
    if (tapper.taps.length > 0 && tapper.accuracy >= 50) {
      recordDrill('rhythm');
    }
  }, [metronome, tapper, recordDrill]);

  return (
    <div className="page rhythm-page">
      <h2>Rhythm Tapper</h2>
      <p className="page__subtitle">
        Tap in time with the beat.
        {isSilence && <strong className="silence-warning"> Do NOT tap — silence beat!</strong>}
      </p>

      <MetronomeControls
        bpm={metronome.bpm}
        isPlaying={metronome.isPlaying}
        onBpmChange={metronome.setBpm}
        onToggle={metronome.isPlaying ? handleStop : metronome.start}
      />

      <BeatIndicator
        currentPosition={metronome.currentPosition}
        isPlaying={metronome.isPlaying}
      />

      <TapZone
        onTap={handleTap}
        lastJudgement={lastJudgement}
        isActive={metronome.isPlaying}
      />

      <div className="rhythm-stats">
        <p>Accuracy: {tapper.accuracy}%</p>
        <p>Taps: {tapper.taps.length}</p>
        <p>Silence Violations: {tapper.silenceViolations}</p>
      </div>

      {!metronome.isPlaying && tapper.taps.length > 0 && (
        <button className="btn btn--secondary" onClick={tapper.reset}>
          Reset
        </button>
      )}
    </div>
  );
}
