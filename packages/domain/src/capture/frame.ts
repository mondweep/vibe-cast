import type { SessionMs } from '../shared/types';

/**
 * The acoustic summary of one analysis window (PRD §8 stage 1).
 *
 * ADR-001 is enforced structurally here: this type carries *no sample data*.
 * The audio buffer that produced these numbers does not outlive the function
 * that computed them (invariant I-C4), so the domain layer is physically
 * incapable of seeing, storing or transmitting audio.
 */
export interface FrameFeatures {
  /** Frame start, relative to session start. */
  readonly tMs: SessionMs;
  /** Root-mean-square level in dB. Uncalibrated — only differences are meaningful. */
  readonly rmsDb: number;
  /**
   * Share of spectral energy in 30–300 Hz.
   * Snoring is soft-tissue vibration: low-frequency and harmonically rich.
   * Speech, rustling fabric and traffic sit higher.
   */
  readonly lowBandRatio: number;
  /**
   * Wiener entropy, 0 (pure tone) to 1 (white noise).
   * Snoring is tonal; fan hum and rain are not.
   */
  readonly spectralFlatness: number;
}

/** 2048 samples at 44.1 kHz. */
export const FRAME_DURATION_MS = 46;
/** 50 % overlap. */
export const FRAME_HOP_MS = 23;
