import {
  CandidateBuilder,
  MAX_CANDIDATE_MS,
  MIN_CANDIDATE_MS,
} from '../src/capture/candidate';
import { FRAME_HOP_MS } from '../src/capture/frame';
import { quietFrame, snoreFrame } from './helpers';

describe('CandidateBuilder', () => {
  const BASELINE = -60;

  /** Feed a loud/quiet pattern described in milliseconds. */
  const run = (segments: Array<{ loud: boolean; ms: number }>) => {
    const builder = new CandidateBuilder();
    const emitted = [];
    let t = 0;
    for (const seg of segments) {
      for (let elapsed = 0; elapsed < seg.ms; elapsed += FRAME_HOP_MS) {
        const frame = seg.loud ? snoreFrame(t) : quietFrame(t);
        emitted.push(...builder.push(frame, BASELINE, seg.loud));
        t += FRAME_HOP_MS;
      }
    }
    emitted.push(...builder.flush());
    return emitted;
  };

  it('discards a blip shorter than the minimum duration', () => {
    const out = run([{ loud: true, ms: 200 }, { loud: false, ms: 1000 }]);
    expect(out).toHaveLength(0);
  });

  it('emits a candidate for a run above the minimum duration', () => {
    const out = run([{ loud: true, ms: 1000 }, { loud: false, ms: 1000 }]);
    expect(out).toHaveLength(1);
    expect(out[0].durationMs).toBeGreaterThanOrEqual(MIN_CANDIDATE_MS);
  });

  it('merges two runs separated by a gap shorter than 200 ms', () => {
    const out = run([
      { loud: true, ms: 800 },
      { loud: false, ms: 90 },
      { loud: true, ms: 800 },
      { loud: false, ms: 1000 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].durationMs).toBeGreaterThan(1600);
  });

  it('does not merge across a 400 ms gap', () => {
    const out = run([
      { loud: true, ms: 800 },
      { loud: false, ms: 400 },
      { loud: true, ms: 800 },
      { loud: false, ms: 1000 },
    ]);
    expect(out).toHaveLength(2);
  });

  it('splits a run longer than the maximum duration (I-C2)', () => {
    const out = run([{ loud: true, ms: 12_000 }, { loud: false, ms: 1000 }]);
    expect(out.length).toBeGreaterThan(1);
    for (const c of out) expect(c.durationMs).toBeLessThanOrEqual(MAX_CANDIDATE_MS);
  });

  it('splits at the quietest interior frame, not the midpoint', () => {
    const builder = new CandidateBuilder();
    const emitted = [];
    let t = 0;
    const totalMs = 10_000;
    // Put the quiet dip at 30 % through, well away from the midpoint.
    const dipAtMs = 3_000;
    for (let elapsed = 0; elapsed < totalMs; elapsed += FRAME_HOP_MS) {
      const isDip = Math.abs(elapsed - dipAtMs) < FRAME_HOP_MS;
      const frame = snoreFrame(t, { rmsDb: isDip ? -50 : -30 });
      emitted.push(...builder.push(frame, BASELINE, true));
      t += FRAME_HOP_MS;
    }
    emitted.push(...builder.flush());

    expect(emitted.length).toBeGreaterThanOrEqual(2);
    // The first candidate should end near the dip, not near 5000 ms.
    expect(emitted[0].endMs).toBeGreaterThan(2_500);
    expect(emitted[0].endMs).toBeLessThan(3_500);
  });

  it('emits candidates in ascending, non-overlapping time order (I-C3)', () => {
    const out = run([
      { loud: true, ms: 1000 }, { loud: false, ms: 3000 },
      { loud: true, ms: 1000 }, { loud: false, ms: 3000 },
      { loud: true, ms: 1000 }, { loud: false, ms: 1000 },
    ]);
    expect(out).toHaveLength(3);
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i].startMs).toBeGreaterThanOrEqual(out[i - 1].endMs);
    }
  });

  it('records intensity relative to baseline, never as an absolute level (I-A5)', () => {
    const out = run([{ loud: true, ms: 1000 }, { loud: false, ms: 1000 }]);
    expect(out[0].intensityDb).toBeCloseTo(-35 - BASELINE, 1);
    expect(out[0].intensityDb).toBeGreaterThanOrEqual(0);
  });
});
