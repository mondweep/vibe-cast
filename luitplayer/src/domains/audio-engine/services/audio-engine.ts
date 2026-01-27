/**
 * Audio Engine Service
 * Main interface for audio playback using AudioWorklet
 * See ADR-001 for architecture details
 */

export interface AudioEngineConfig {
  workletUrl: string;
}

export interface NoteEvent {
  pitch: number; // MIDI note (0-127)
  velocity: number; // 0-127
  duration: number; // In seconds
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private masterGain: GainNode | null = null;
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

      // Load audio worklet module
      await this.audioContext.audioWorklet.addModule(this.workletUrl);

      // Create worklet node
      this.workletNode = new AudioWorkletNode(
        this.audioContext,
        'luitplayer-processor',
        {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2], // Stereo
        }
      );

      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.7;

      // Connect: worklet -> gain -> destination
      this.workletNode.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log('[AudioEngine] Initialized successfully');
    } catch (error) {
      console.error('[AudioEngine] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Play a note
   */
  noteOn(pitch: number, velocity: number = 100): void {
    if (!this.isInitialized || !this.workletNode) {
      console.warn('[AudioEngine] Not initialized');
      return;
    }

    this.workletNode.port.postMessage({
      type: 'note-on',
      pitch,
      velocity,
      time: 0,
    });
  }

  /**
   * Stop a note
   */
  noteOff(pitch: number): void {
    if (!this.isInitialized || !this.workletNode) return;

    this.workletNode.port.postMessage({
      type: 'note-off',
      pitch,
      time: 0,
    });
  }

  /**
   * Play a note for a specific duration
   */
  playNote(event: NoteEvent): void {
    this.noteOn(event.pitch, event.velocity);

    setTimeout(() => {
      this.noteOff(event.pitch);
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
import audioWorkletUrl from '../../../infrastructure/workers/audio.worklet.ts?worker&url';

/**
 * Create a default audio engine instance
 */
export function createAudioEngine(): AudioEngine {
  return new AudioEngine({ workletUrl: audioWorkletUrl });
}
