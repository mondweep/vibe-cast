import { FRAME_HOP_MS, type FrameFeatures } from '../src/capture/frame';
import type { NightAnalysis } from '../src/analysis/night-analysis';
import { ANALYSER_VERSION } from '../src/analysis/night-analysis';

export interface FrameOverrides {
  rmsDb?: number;
  lowBandRatio?: number;
  spectralFlatness?: number;
}

/** A frame that looks like a quiet bedroom. */
export function quietFrame(tMs: number, o: FrameOverrides = {}): FrameFeatures {
  return {
    tMs,
    rmsDb: o.rmsDb ?? -60,
    lowBandRatio: o.lowBandRatio ?? 0.3,
    spectralFlatness: o.spectralFlatness ?? 0.7,
  };
}

/** A frame with the acoustic signature of snoring: low-band, tonal, loud. */
export function snoreFrame(tMs: number, o: FrameOverrides = {}): FrameFeatures {
  return {
    tMs,
    rmsDb: o.rmsDb ?? -35,
    lowBandRatio: o.lowBandRatio ?? 0.75,
    spectralFlatness: o.spectralFlatness ?? 0.2,
  };
}

/** Generate a run of frames at the real hop interval. */
export function frames(
  fromMs: number,
  count: number,
  make: (tMs: number, i: number) => FrameFeatures,
): FrameFeatures[] {
  const out: FrameFeatures[] = [];
  for (let i = 0; i < count; i += 1) out.push(make(fromMs + i * FRAME_HOP_MS, i));
  return out;
}

export function framesForMs(
  fromMs: number,
  durationMs: number,
  make: (tMs: number, i: number) => FrameFeatures,
): FrameFeatures[] {
  return frames(fromMs, Math.ceil(durationMs / FRAME_HOP_MS), make);
}

export const HOUR_MS = 3_600_000;

/** A NightAnalysis stub for the contexts downstream of analysis. */
export function nightStub(over: Partial<NightAnalysis> = {}): NightAnalysis {
  const episodeCount = over.episodeCount ?? 0;
  return {
    nightId: over.nightId ?? 'n1',
    date: over.date ?? '2026-09-01',
    status: over.status ?? 'analysed',
    monitoredMs: over.monitoredMs ?? 8 * HOUR_MS,
    interruptedMs: over.interruptedMs ?? 0,
    snoreIndex: over.snoreIndex !== undefined ? over.snoreIndex : 10,
    snoreTimeFraction: over.snoreTimeFraction ?? 0.1,
    episodeCount,
    episodes: over.episodes ?? [],
    bandDistribution:
      over.bandDistribution ?? { quiet: 0, mild: 0, moderate: episodeCount, loud: 0 },
    peakIntensityDb: over.peakIntensityDb ?? 15,
    medianIntensityDb: over.medianIntensityDb ?? 12,
    quietPeriods: over.quietPeriods ?? [],
    analyserVersion: over.analyserVersion ?? ANALYSER_VERSION,
    wasInterrupted: over.wasInterrupted ?? false,
  };
}

import type { Candidate } from '../src/capture/candidate';

export function candidate(over: Partial<Candidate> = {}): Candidate {
  const startMs = over.startMs ?? 10_000;
  const durationMs = over.durationMs ?? 1_500;
  const baselineDb = over.baselineDb ?? -60;
  const peakDb = over.peakDb ?? -30;
  return {
    startMs,
    endMs: over.endMs ?? startMs + durationMs,
    durationMs,
    peakDb,
    baselineDb,
    intensityDb: over.intensityDb ?? Math.max(0, peakDb - baselineDb),
    lowBandRatio: over.lowBandRatio ?? 0.75,
    spectralFlatness: over.spectralFlatness ?? 0.2,
    frameCount: over.frameCount ?? 60,
  };
}

/** A run of well-formed snores spaced like breathing, for periodicity. */
export function breathingRun(count: number, over: Partial<Candidate> = {}): Candidate[] {
  const out: Candidate[] = [];
  for (let i = 0; i < count; i += 1) {
    const startMs = 10_000 + i * 4_000;
    out.push(candidate({ ...over, startMs, endMs: startMs + (over.durationMs ?? 1_500) }));
  }
  return out;
}
