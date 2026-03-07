import type { DetectedPitch, NoteName } from '../types';
import { frequencyToNote } from '../utils/musicTheory';

// Guitar frequency range
const MIN_FREQ = 75;   // Just below E2 (~82Hz), with margin
const MAX_FREQ = 1200; // Above D6 (~1175Hz)

// Minimum magnitude (0-255 from getByteFrequencyData) to consider a peak
const MAGNITUDE_THRESHOLD = 100;

// Minimum confidence to include in results
const CONFIDENCE_THRESHOLD = 0.3;

interface SpectralPeak {
  binIndex: number;
  magnitude: number;
  frequency: number;
}

/**
 * Detect pitches from FFT frequency data.
 *
 * @param frequencyData - Uint8Array from AnalyserNode.getByteFrequencyData()
 * @param sampleRate - AudioContext sample rate (typically 44100)
 * @param fftSize - FFT size used (typically 4096)
 * @returns Array of detected pitches sorted by confidence (highest first)
 */
export function detectPitches(
  frequencyData: Uint8Array,
  sampleRate: number,
  fftSize: number = 4096
): DetectedPitch[] {
  if (frequencyData.length === 0) return [];

  const binResolution = sampleRate / fftSize;

  // Find the max magnitude for normalization
  let maxMag = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > maxMag) maxMag = frequencyData[i];
  }
  if (maxMag < MAGNITUDE_THRESHOLD) return []; // Too quiet

  // Step 1: Find spectral peaks
  const peaks = findSpectralPeaks(frequencyData, binResolution, maxMag);

  // Step 2: Filter to guitar frequency range
  const guitarPeaks = peaks.filter(
    p => p.frequency >= MIN_FREQ && p.frequency <= MAX_FREQ
  );

  // Step 3: Remove harmonics/overtones
  const fundamentals = filterHarmonics(guitarPeaks);

  // Step 4: Map to notes
  const pitches: DetectedPitch[] = [];
  const seenNotes = new Map<NoteName, DetectedPitch>();

  for (const peak of fundamentals) {
    const { note, octave, cents } = frequencyToNote(peak.frequency);
    const confidence = (peak.magnitude / maxMag) * (1 - Math.abs(cents) / 50);

    if (confidence < CONFIDENCE_THRESHOLD) continue;

    // Keep strongest occurrence of each note name (across octaves)
    const existing = seenNotes.get(note);
    if (!existing || existing.confidence < confidence) {
      const pitch: DetectedPitch = {
        note,
        frequency: peak.frequency,
        confidence: Math.min(confidence, 1),
        octave,
      };
      seenNotes.set(note, pitch);
    }
  }

  pitches.push(...seenNotes.values());
  pitches.sort((a, b) => b.confidence - a.confidence);

  return pitches;
}

/**
 * Find local maxima in frequency magnitude data.
 */
function findSpectralPeaks(
  data: Uint8Array,
  binResolution: number,
  _maxMag: number
): SpectralPeak[] {
  const peaks: SpectralPeak[] = [];
  const minBin = Math.floor(MIN_FREQ / binResolution);
  const maxBin = Math.min(Math.ceil(MAX_FREQ / binResolution), data.length - 2);

  for (let i = Math.max(minBin, 1); i <= maxBin; i++) {
    const mag = data[i];

    // Must exceed absolute threshold
    if (mag < MAGNITUDE_THRESHOLD) continue;

    // Must be a local maximum (higher than neighbors)
    if (mag > data[i - 1] && mag >= data[i + 1]) {
      // Quadratic interpolation for more accurate frequency
      const alpha = data[i - 1];
      const beta = data[i];
      const gamma = data[i + 1];
      const denom = 2 * (2 * beta - alpha - gamma);
      const correction = denom !== 0 ? (alpha - gamma) / denom : 0;
      const preciseFreq = (i + correction) * binResolution;

      peaks.push({
        binIndex: i,
        magnitude: mag,
        frequency: preciseFreq,
      });
    }
  }

  // Sort by magnitude descending
  peaks.sort((a, b) => b.magnitude - a.magnitude);

  // Limit to top peaks to avoid noise
  return peaks.slice(0, 20);
}

/**
 * Filter out harmonic overtones, keeping only fundamentals.
 * If peak B's frequency is ~2x, ~3x, ~4x of peak A (and A is stronger),
 * then B is likely a harmonic of A.
 */
function filterHarmonics(peaks: SpectralPeak[]): SpectralPeak[] {
  if (peaks.length === 0) return [];

  // Sort by frequency ascending for harmonic analysis
  const sorted = [...peaks].sort((a, b) => a.frequency - b.frequency);
  const fundamentals: SpectralPeak[] = [];
  const removed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (removed.has(i)) continue;

    const fundamental = sorted[i];
    fundamentals.push(fundamental);

    // Mark higher peaks that are harmonics of this fundamental
    for (let j = i + 1; j < sorted.length; j++) {
      if (removed.has(j)) continue;

      const ratio = sorted[j].frequency / fundamental.frequency;
      const nearestHarmonic = Math.round(ratio);

      // Check if ratio is close to an integer (2, 3, 4, 5)
      if (nearestHarmonic >= 2 && nearestHarmonic <= 6) {
        const deviation = Math.abs(ratio - nearestHarmonic);
        if (deviation < 0.06) {
          // Only remove if the harmonic is weaker than the fundamental
          if (sorted[j].magnitude <= fundamental.magnitude * 1.2) {
            removed.add(j);
          }
        }
      }
    }
  }

  return fundamentals;
}

/**
 * Get the peak frequencies from FFT data for visualization purposes.
 */
export function getPeakFrequencies(
  frequencyData: Uint8Array,
  sampleRate: number,
  fftSize: number = 4096
): { frequency: number; magnitude: number }[] {
  const binResolution = sampleRate / fftSize;
  let maxMag = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > maxMag) maxMag = frequencyData[i];
  }

  const peaks = findSpectralPeaks(frequencyData, binResolution, maxMag);
  return peaks
    .filter(p => p.frequency >= MIN_FREQ && p.frequency <= MAX_FREQ)
    .map(p => ({ frequency: p.frequency, magnitude: p.magnitude }));
}
