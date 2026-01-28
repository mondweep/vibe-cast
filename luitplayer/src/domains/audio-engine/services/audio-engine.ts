/**
 * Audio Engine Service
 * Main interface for audio playback using AudioWorklet
 * See ADR-001 for architecture details
 */

import { SoundFontLoader, createSoundFontLoader } from './soundfont-loader';

export interface AudioEngineConfig {
  workletUrl: string;
}

export interface NoteEvent {
  pitch: number; // MIDI note (0-127)
  velocity: number; // 0-127
  duration: number; // In seconds
  instrument?: string;
  channel?: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private masterGain: GainNode | null = null;
  private soundFontLoader: SoundFontLoader | null = null;
  private isInitialized = false;
  private workletUrl: string;

  constructor(config: AudioEngineConfig) {
    this.workletUrl = config.workletUrl;
  }

  /**
   * Initialize the audio engine
   * Must be called after user interaction (browser autoplay policy)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: 44100,
        latencyHint: 'interactive',
      });

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Initialize SoundFont loader
      this.soundFontLoader = createSoundFontLoader(this.audioContext);

      // Load audio worklet module
      await this.audioContext.audioWorklet.addModule(this.workletUrl);

      // Create worklet node
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'sample-synth-processor',
        {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2], // Stereo
          processorOptions: {
            sampleRate: this.audioContext.sampleRate,
          },
        }
      );

      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.7;

      // Connect: worklet -> gain -> destination
      this.workletNode.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log('[AudioEngine] Initialized successfully with Sample Synth');
    } catch (error) {
      console.error('[AudioEngine] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load an instrument
   */
  async loadInstrument(instrument: string, url?: string): Promise<void> {
    if (!this.soundFontLoader || !this.workletNode) {
      console.warn('[AudioEngine] Cannot load instrument: not initialized');
      return;
    }

    try {
      // Load samples via SoundFont loader
      const bank = await this.soundFontLoader.loadInstrument(
        instrument as any,
        url
      );

      // Send samples to worklet
      for (const [note, sample] of bank.samples) {
        this.workletNode.port.postMessage({
          type: 'load-sample',
          instrument: bank.name,
          midiNote: note,
          samples: sample.buffer.getChannelData(0), // Mono for now
          sampleRate: sample.buffer.sampleRate,
        });
      }

      // Send envelope settings
      this.workletNode.port.postMessage({
        type: 'set-envelope',
        instrument: bank.name,
        ...bank.envelope,
      });

      console.log(`[AudioEngine] Loaded instrument: ${instrument}`);
    } catch (error) {
      console.error(`[AudioEngine] Failed to load instrument ${instrument}:`, error);
    }
  }

  /**
   * Play a note
   */
  noteOn(
    pitch: number,
    velocity: number = 100,
    instrument: string = 'piano',
    channel: number = 0
  ): void {
    if (!this.isInitialized || !this.workletNode) {
      console.warn('[AudioEngine] Not initialized');
      return;
    }

    this.workletNode.port.postMessage({
      type: 'note-on',
      pitch,
      velocity,
      instrument,
      channel,
    });
  }

  /**
   * Stop a note
   */
  noteOff(pitch: number, instrument: string = 'piano', channel: number = 0): void {
    if (!this.isInitialized || !this.workletNode) return;

    this.workletNode.port.postMessage({
      type: 'note-off',
      pitch,
      instrument,
      channel,
    });
  }

  /**
   * Play a note for a specific duration
   */
  playNote(event: NoteEvent): void {
    const instrument = event.instrument || 'piano';
    const channel = event.channel || 0;

    this.noteOn(event.pitch, event.velocity, instrument, channel);

    setTimeout(() => {
      this.noteOff(event.pitch, instrument, channel);
    }, event.duration * 1000);
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    if (!this.masterGain) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.setValueAtTime(
      clampedVolume,
      this.audioContext?.currentTime || 0
    );

    // Also update Worklet master gain if needed
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'set-gain',
        channel: -1, // Master
        gain: clampedVolume,
      });
    }
  }

  /**
   * Set tempo
   */
  setTempo(bpm: number): void {
    if (!this.workletNode) return;

    this.workletNode.port.postMessage({
      type: 'set-tempo',
      bpm,
    });
  }

  /**
   * Stop all currently playing notes
   */
  allNotesOff(): void {
    // Re-initializing worklet is one way, but for now we just rely on decay
    // or silence gain. A true panic would require worklet support.
    if (this.workletNode) {
      // Worklet doesn't have 'all-notes-off' message yet, so we lower gain briefly
      const oldGain = this.masterGain?.gain.value || 0.7;
      this.setVolume(0);
      setTimeout(() => this.setVolume(oldGain), 50);
    }
  }

  /**
   * Set channel gain (for mixer)
   */
  setChannelGain(channel: number, gain: number): void {
    if (!this.workletNode) return;

    this.workletNode.port.postMessage({
      type: 'set-gain',
      channel,
      gain: Math.max(0, Math.min(1, gain)),
    });
  }

  /**
   * Check if engine is ready
   */
  get ready(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current audio context time
   */
  get currentTime(): number {
    return this.audioContext?.currentTime || 0;
  }

  /**
   * Get sample rate
   */
  get sampleRate(): number {
    return this.audioContext?.sampleRate || 44100;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.soundFontLoader) {
      this.soundFontLoader.clear();
      this.soundFontLoader = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
    console.log('[AudioEngine] Disposed');
  }
}

/**
 * Create a default audio engine instance
 */
import sampleSynthUrl from '../../../infrastructure/workers/sample-synth.worklet.ts?worker&url';

/**
 * Create a default audio engine instance
 */
export function createAudioEngine(): AudioEngine {
  return new AudioEngine({ workletUrl: sampleSynthUrl });
}
