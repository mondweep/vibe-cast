import { Result, ok, err } from '../../shared/types/Result';

/**
 * WebAudioError - Error type for Web Audio API operations
 */
export class WebAudioError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'WebAudioError';
  }
}

/**
 * WebAudioAdapter - Handles PCM audio playback via Web Audio API
 * Supports PCM 16-bit 16kHz audio format
 */
export class WebAudioAdapter {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private volume: number = 1.0;
  private audioBuffer: ArrayBuffer | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    try {
      // Create audio context (handle both webkit and standard)
      const AudioContextClass = (window as unknown as Record<string, unknown>).AudioContext ||
        (window as unknown as Record<string, unknown>).webkitAudioContext;

      if (!AudioContextClass) {
        console.warn('Web Audio API not supported in this browser');
        return;
      }

      this.audioContext = new (AudioContextClass as typeof AudioContext)();

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  /**
   * Play PCM audio data
   * @param pcmData - PCM 16-bit audio data
   * @param sampleRate - Sample rate in Hz (default: 16000)
   */
  async playAudio(
    pcmData: ArrayBuffer,
    sampleRate: number = 16000,
  ): Promise<Result<void, WebAudioError>> {
    try {
      if (!this.audioContext) {
        return err(
          new WebAudioError(
            'Audio context not initialized',
            'NO_AUDIO_CONTEXT',
          ),
        );
      }

      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Decode PCM data
      const pcmFloat32 = this.decodePCM16(pcmData);

      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        pcmFloat32.length,
        sampleRate,
      );

      const channelData = audioBuffer.getChannelData(0);
      channelData.set(pcmFloat32);

      // Create and configure source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to gain node
      if (this.gainNode) {
        source.connect(this.gainNode);
      } else {
        source.connect(this.audioContext.destination);
      }

      // Set up callbacks
      source.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
      };

      // Start playback
      source.start(0);
      this.isPlaying = true;
      this.currentSource = source;

      this.audioBuffer = pcmData;

      return ok(undefined);
    } catch (error) {
      return err(
        new WebAudioError(
          'Failed to play audio',
          'PLAYBACK_FAILED',
          error,
        ),
      );
    }
  }

  /**
   * Stop current playback
   */
  stop(): Result<void, WebAudioError> {
    try {
      if (this.currentSource) {
        this.currentSource.stop();
        this.isPlaying = false;
      }
      return ok(undefined);
    } catch (error) {
      return err(
        new WebAudioError(
          'Failed to stop playback',
          'STOP_FAILED',
          error,
        ),
      );
    }
  }

  /**
   * Pause playback (not fully supported by Web Audio API)
   * Implemented by stopping and recording position
   */
  pause(): Result<void, WebAudioError> {
    return this.stop();
  }

  /**
   * Check if audio is currently playing
   */
  isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Set volume level (0.0 to 1.0)
   */
  setVolume(level: number): Result<void, WebAudioError> {
    try {
      if (level < 0 || level > 1) {
        return err(
          new WebAudioError(
            'Volume must be between 0 and 1',
            'INVALID_VOLUME',
          ),
        );
      }

      this.volume = level;

      if (this.gainNode) {
        this.gainNode.gain.value = level;
      }

      return ok(undefined);
    } catch (error) {
      return err(
        new WebAudioError(
          'Failed to set volume',
          'VOLUME_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Get current volume level
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Increase volume by 10%
   */
  increaseVolume(): Result<void, WebAudioError> {
    return this.setVolume(Math.min(1.0, this.volume + 0.1));
  }

  /**
   * Decrease volume by 10%
   */
  decreaseVolume(): Result<void, WebAudioError> {
    return this.setVolume(Math.max(0.0, this.volume - 0.1));
  }

  /**
   * Decode PCM 16-bit signed integer to float32
   */
  private decodePCM16(buffer: ArrayBuffer): Float32Array {
    const pcm16 = new Int16Array(buffer);
    const float32 = new Float32Array(pcm16.length);

    for (let i = 0; i < pcm16.length; i++) {
      // Convert from 16-bit signed int to float (-1.0 to 1.0)
      float32[i] = pcm16[i] < 0 ? pcm16[i] / 0x8000 : pcm16[i] / 0x7fff;
    }

    return float32;
  }

  /**
   * Get audio context state
   */
  getContextState(): {
    state: AudioContextState;
    sampleRate: number;
    isPlaying: boolean;
    volume: number;
  } {
    return {
      state: this.audioContext?.state || 'closed',
      sampleRate: this.audioContext?.sampleRate || 0,
      isPlaying: this.isPlaying,
      volume: this.volume,
    };
  }

  /**
   * Close audio context and release resources
   */
  async dispose(): Promise<Result<void, WebAudioError>> {
    try {
      if (this.currentSource) {
        this.currentSource.stop();
      }

      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
      }

      this.audioContext = null;
      this.gainNode = null;
      this.currentSource = null;
      this.audioBuffer = null;

      return ok(undefined);
    } catch (error) {
      return err(
        new WebAudioError(
          'Failed to dispose audio context',
          'DISPOSE_FAILED',
          error,
        ),
      );
    }
  }
}
