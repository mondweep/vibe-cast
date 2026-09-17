import { AmbientBaseline, CALIBRATION_MS } from '../src/capture/ambient-baseline';
import { FRAME_HOP_MS } from '../src/capture/frame';

describe('AmbientBaseline', () => {
  const feed = (
    b: AmbientBaseline,
    fromMs: number,
    durationMs: number,
    db: number,
    inCandidate = false,
  ): number => {
    let t = fromMs;
    for (; t < fromMs + durationMs; t += FRAME_HOP_MS) b.observe(t, db, inCandidate);
    return t;
  };

  it('is not calibrated before 60 s of audio (I-C1)', () => {
    const b = new AmbientBaseline();
    feed(b, 0, CALIBRATION_MS - 1000, -60);
    expect(b.isCalibrated).toBe(false);
  });

  it('calibrates once 60 s has elapsed', () => {
    const b = new AmbientBaseline();
    feed(b, 0, CALIBRATION_MS + 1000, -60);
    expect(b.isCalibrated).toBe(true);
    expect(b.valueDb).toBeCloseTo(-60, 1);
  });

  it('reports calibration progress for the UI', () => {
    const b = new AmbientBaseline();
    feed(b, 0, CALIBRATION_MS / 2, -60);
    expect(b.calibrationProgress).toBeGreaterThan(0.4);
    expect(b.calibrationProgress).toBeLessThan(0.6);
  });

  it('tracks a step change in room level within the rolling window', () => {
    const b = new AmbientBaseline();
    let t = feed(b, 0, CALIBRATION_MS, -60);
    t = feed(b, t, 61_000, -50);
    expect(b.valueDb).toBeCloseTo(-50, 1);
  });

  // The bug this class exists to prevent.
  it('does NOT rise during a sustained loud passage, so snoring cannot hide itself', () => {
    const b = new AmbientBaseline();
    let t = feed(b, 0, CALIBRATION_MS, -60);
    const quietBaseline = b.valueDb;

    // Ten minutes of loud audio, all flagged as inside a candidate.
    t = feed(b, t, 600_000, -20, true);

    expect(b.valueDb).toBeCloseTo(quietBaseline, 1);
    expect(b.valueDb).toBeLessThan(-55);
  });
});
