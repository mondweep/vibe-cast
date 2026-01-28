/**
 * SoundFont Loader and Sample Bank Manager
 * Loads and manages audio samples for realistic instrument playback
 * See ADR-001 for architecture details
 */

export interface SampleData {
  buffer: AudioBuffer;
  baseNote: number; // MIDI note this sample was recorded at
  loopStart?: number;
  loopEnd?: number;
}

export interface InstrumentBank {
  name: string;
  samples: Map<number, SampleData>; // MIDI note -> sample
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

export type InstrumentType =
  | 'piano'
  | 'acoustic-guitar'
  | 'electric-guitar'
  | 'bass-guitar'
  | 'synth-pad'
  | 'synth-lead'
  | 'strings'
  | 'brass'
  | 'drums'
  | 'voice';

// Default ADSR envelopes for different instrument types
const DEFAULT_ENVELOPES: Record<InstrumentType, InstrumentBank['envelope']> = {
  piano: { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.3 },
  'acoustic-guitar': { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 },
  'electric-guitar': { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.35 },
  'bass-guitar': { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.2 },
  'synth-pad': { attack: 0.3, decay: 0.2, sustain: 0.8, release: 0.5 },
  'synth-lead': { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
  strings: { attack: 0.15, decay: 0.1, sustain: 0.9, release: 0.4 },
  brass: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.2 },
  drums: { attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.1 },
  voice: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.3 },
  'lead-vocal': { attack: 0.1, decay: 0.1, sustain: 0.8, release: 0.3 }, // Alias
} as any;

// Frequency ratios for basic waveform synthesis (fallback when no samples)
const NOTE_FREQUENCIES: number[] = [];
for (let i = 0; i < 128; i++) {
  NOTE_FREQUENCIES[i] = 440 * Math.pow(2, (i - 69) / 12);
}

/**
 * SoundFont Loader class
 * Manages loading and caching of instrument samples
 */
export class SoundFontLoader {
  private audioContext: AudioContext;
  private banks: Map<InstrumentType, InstrumentBank> = new Map();
  private loadingPromises: Map<InstrumentType, Promise<InstrumentBank>> = new Map();

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * Load an instrument bank from URL or generate synthetic samples
   */
  async loadInstrument(inputName: string, url?: string): Promise<InstrumentBank> {
    const type = this.normalizeInstrumentName(inputName);

    // Check cache
    if (this.banks.has(type)) {
      return this.banks.get(type)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(type)) {
      return this.loadingPromises.get(type)!;
    }

    // Start loading
    const loadPromise = url
      ? this.loadFromUrl(type, url)
      : this.generateSyntheticBank(type);

    this.loadingPromises.set(type, loadPromise);

    try {
      const bank = await loadPromise;
      this.banks.set(type, bank);
      this.loadingPromises.delete(type);
      return bank;
    } catch (error) {
      this.loadingPromises.delete(type);
      // Fallback to synthetic
      console.warn(`Failed to load ${type}, using synthetic samples:`, error);
      const fallback = await this.generateSyntheticBank(type);
      this.banks.set(type, fallback);
      return fallback;
    }
  }

  /**
   * Load samples from a SoundFont URL
   */
  private async loadFromUrl(type: InstrumentType, url: string): Promise<InstrumentBank> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // Parse SoundFont (simplified - real implementation would use sf2 parser)
    // For now, treat as raw audio samples
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    const samples = new Map<number, SampleData>();
    samples.set(60, {
      buffer: audioBuffer,
      baseNote: 60,
    });

    return {
      name: type,
      samples,
      envelope: DEFAULT_ENVELOPES[type],
    };
  }

  /**
   * Generate synthetic samples using Web Audio oscillators
   */
  private async generateSyntheticBank(type: InstrumentType): Promise<InstrumentBank> {
    const samples = new Map<number, SampleData>();
    const sampleRate = this.audioContext.sampleRate;
    const duration = 2; // 2 seconds per sample
    const numSamples = Math.floor(sampleRate * duration);

    // Generate samples for key notes (every 12 semitones)
    const keyNotes = [24, 36, 48, 60, 72, 84, 96]; // C1 to C7

    for (const baseNote of keyNotes) {
      const frequency = NOTE_FREQUENCIES[baseNote];
      const buffer = this.audioContext.createBuffer(2, numSamples, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        this.synthesizeWaveform(data, frequency, sampleRate, type);
      }

      samples.set(baseNote, {
        buffer,
        baseNote,
        loopStart: 0,
        loopEnd: numSamples, // Loop the entire 2s buffer (smooth sine wave)
      });
    }

    return {
      name: type,
      samples,
      envelope: DEFAULT_ENVELOPES[type],
    };
  }

  /**
   * Synthesize a waveform based on instrument type
   */
  private synthesizeWaveform(
    data: Float32Array,
    frequency: number,
    sampleRate: number,
    type: InstrumentType
  ): void {
    const numSamples = data.length;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * frequency * t;

      // Natural decay envelope
      const envelope = Math.exp(-t * 2);

      let sample = 0;

      switch (type) {
        case 'piano':
          // Rich harmonic content
          sample =
            Math.sin(phase) * 0.5 +
            Math.sin(phase * 2) * 0.25 +
            Math.sin(phase * 3) * 0.125 +
            Math.sin(phase * 4) * 0.0625;
          break;

        case 'acoustic-guitar':
        case 'electric-guitar':
          // Plucked string simulation
          sample =
            Math.sin(phase) * 0.4 +
            Math.sin(phase * 2) * 0.3 +
            Math.sin(phase * 3) * 0.2 +
            Math.sin(phase * 4) * 0.1 +
            (Math.random() - 0.5) * 0.05 * Math.exp(-t * 10);
          break;

        case 'bass-guitar':
          // Deep fundamental with slight harmonics
          sample =
            Math.sin(phase) * 0.7 +
            Math.sin(phase * 2) * 0.2 +
            Math.sin(phase * 3) * 0.1;
          break;

        case 'synth-pad':
          // Detuned oscillators for thick sound
          sample =
            Math.sin(phase) * 0.3 +
            Math.sin(phase * 1.003) * 0.3 +
            Math.sin(phase * 0.997) * 0.3 +
            Math.sin(phase * 2) * 0.1;
          break;

        case 'synth-lead':
          // Sawtooth-like
          sample = ((phase % (2 * Math.PI)) / Math.PI - 1) * 0.5;
          break;

        case 'strings':
          // Multiple detuned oscillators
          sample =
            Math.sin(phase) * 0.25 +
            Math.sin(phase * 1.002) * 0.25 +
            Math.sin(phase * 0.998) * 0.25 +
            Math.sin(phase * 2) * 0.15 +
            Math.sin(phase * 3) * 0.1;
          break;

        case 'brass':
          // Bright harmonics
          sample =
            Math.sin(phase) * 0.4 +
            Math.sin(phase * 2) * 0.3 +
            Math.sin(phase * 3) * 0.2 +
            Math.sin(phase * 4) * 0.1;
          break;

        case 'drums':
          // Noise-based percussion
          sample =
            Math.sin(phase * 0.5) * Math.exp(-t * 20) * 0.5 +
            (Math.random() - 0.5) * Math.exp(-t * 15) * 0.5;
          break;

        case 'voice':
          // Formant-like synthesis
          sample =
            Math.sin(phase) * 0.4 +
            Math.sin(phase * 2) * 0.2 +
            Math.sin(phase * 3) * 0.15 +
            Math.sin(phase * 4) * 0.1 +
            Math.sin(phase * 5) * 0.05;
          break;

        default:
          sample = Math.sin(phase);
      }

      data[i] = sample * envelope;
    }
  }

  /**
   * Get a sample for a specific note, with pitch shifting if needed
   */
  getSample(type: InstrumentType, midiNote: number): SampleData | null {
    const bank = this.banks.get(type);
    if (!bank) return null;

    // Find closest sample
    let closestNote = 60;
    let minDistance = Infinity;

    for (const note of bank.samples.keys()) {
      const distance = Math.abs(note - midiNote);
      if (distance < minDistance) {
        minDistance = distance;
        closestNote = note;
      }
    }

    return bank.samples.get(closestNote) || null;
  }

  /**
   * Get envelope for instrument type
   */
  getEnvelope(type: InstrumentType): InstrumentBank['envelope'] {
    return this.banks.get(type)?.envelope || DEFAULT_ENVELOPES[type];
  }

  /**
   * Check if an instrument is loaded
   */
  isLoaded(type: InstrumentType): boolean {
    return this.banks.has(type);
  }

  /**
   * Get all loaded instruments
   */
  getLoadedInstruments(): InstrumentType[] {
    return Array.from(this.banks.keys());
  }

  /**
   * Clear all loaded samples
   */
  private normalizeInstrumentName(name: string): InstrumentType {
    const n = name.toLowerCase();
    if (n.includes('vocal') || n.includes('voice') || n.includes('choir')) return 'voice';
    if (n.includes('guitar')) return 'acoustic-guitar';
    if (n.includes('bass')) return 'bass-guitar';
    if (n.includes('string') || n.includes('violin') || n.includes('cello')) return 'strings';
    if (n.includes('brass') || n.includes('trumpet') || n.includes('horn')) return 'brass';
    if (n.includes('drum') || n.includes('percussion')) return 'drums';
    if (n.includes('synth')) return 'synth-pad';
    return 'piano'; // Default
  }

  clear(): void {
    this.banks.clear();
    this.loadingPromises.clear();
  }
}

/**
 * Create a SoundFont loader instance
 */
export function createSoundFontLoader(audioContext: AudioContext): SoundFontLoader {
  return new SoundFontLoader(audioContext);
}
