/**
 * Audio Sequencer
 * Connects OMR Score IR output to the Audio Engine for playback
 * Manages timing, scheduling, and multi-channel coordination
 */

import type { ScoreIR } from '@domains/shared-kernel/types';
import { dynamicToVelocity } from '@domains/shared-kernel/types';
import type { AudioEngine } from './audio-engine';

export interface SequencerOptions {
  tempo: number;
  loop: boolean;
  loopStart: number; // measure number
  loopEnd: number;   // measure number
}

export interface SequencerState {
  isPlaying: boolean;
  currentMeasure: number;
  currentBeat: number;
  tempo: number;
  elapsedTime: number;
}

export interface ChannelConfig {
  staffId: string;
  instrument: string;
  volume: number;
  muted: boolean;
  solo: boolean;
}

type ScheduledEvent = {
  time: number;
  pitch: number;
  velocity: number;
  duration: number;
  channel: number;
  played: boolean;
};

/**
 * Audio Sequencer class
 * Schedules and plays back Score IR through the Audio Engine
 */
export class AudioSequencer {
  private audioEngine: AudioEngine;
  private scoreIR: ScoreIR | null = null;
  private channels: Map<string, ChannelConfig> = new Map();
  private scheduledEvents: ScheduledEvent[] = [];

  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private pauseTime = 0;
  private currentMeasure = 1;

  private tempo = 120;
  private loop = false;
  private loopStart = 1;
  private loopEnd = 8;
  private isMetronomeEnabled = false;
  private lastScheduledBeat = -1;

  private animationFrameId: number | null = null;
  private onStateChange?: (state: SequencerState) => void;
  private onMeasureChange?: (measure: number) => void;

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
  }

  /**
   * Load a Score IR for playback
   */
  loadScore(scoreIR: ScoreIR): void {
    this.scoreIR = scoreIR;
    this.channels.clear();
    this.scheduledEvents = [];
    this.currentMeasure = 1;

    // Extract tempo from metadata
    if (scoreIR.metadata?.tempo) {
      this.tempo = scoreIR.metadata.tempo;
    }

    // Load instruments
    const instruments = new Set<string>();
    scoreIR.staves.forEach((staff) => {
      const instrument = staff.instrument || 'piano';
      instruments.add(instrument);

      this.channels.set(staff.id, {
        staffId: staff.id,
        instrument,
        volume: 0.8,
        muted: false,
        solo: false,
      });
    });

    // Initialize instruments in audio engine
    instruments.forEach((inst) => {
      this.audioEngine.loadInstrument(inst);
    });

    // Pre-schedule all events
    this.scheduleAllEvents();

    console.log(`[Sequencer] Loaded score with ${scoreIR.staves.length} staves, ${this.scheduledEvents.length} events`);
  }

  /**
   * Pre-schedule all note events with absolute timing
   */
  private scheduleAllEvents(): void {
    if (!this.scoreIR) return;

    this.scheduledEvents = [];
    const beatsPerMeasure = 4;
    const secondsPerBeat = 60 / this.tempo;

    this.scoreIR.staves.forEach((staff, channelIndex) => {
      staff.measures.forEach((measure) => {
        const measureStartTime = (measure.number - 1) * beatsPerMeasure * secondsPerBeat;
        const dynamicVelocity = dynamicToVelocity(measure.dynamics || 'mf');

        measure.events.forEach((event) => {
          if (event.type === 'note-on') {
            const eventTime = measureStartTime + event.time * secondsPerBeat;

            this.scheduledEvents.push({
              time: eventTime,
              pitch: event.pitch,
              velocity: event.velocity ?? dynamicVelocity,
              duration: event.duration * secondsPerBeat,
              channel: channelIndex,
              played: false,
            });
          }
        });
      });
    });

    // Sort by time
    this.scheduledEvents.sort((a, b) => a.time - b.time);
  }

  /**
   * Set playback tempo
   */
  setTempo(bpm: number): void {
    this.tempo = Math.max(40, Math.min(240, bpm));
    this.audioEngine.setTempo(this.tempo);

    // Re-schedule events with new timing
    if (this.scoreIR) {
      this.scheduleAllEvents();
    }
  }

  /**
   * Configure loop points
   */
  setLoop(enabled: boolean, start?: number, end?: number): void {
    this.loop = enabled;
    if (start !== undefined) this.loopStart = start;
    if (end !== undefined) this.loopEnd = end;
  }

  /**
   * Set channel volume
   */
  setChannelVolume(staffId: string, volume: number): void {
    const channel = this.channels.get(staffId);
    if (channel) {
      channel.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Set channel mute state
   */
  setChannelMute(staffId: string, muted: boolean): void {
    const channel = this.channels.get(staffId);
    if (channel) {
      channel.muted = muted;
    }
  }

  /**
   * Set channel solo state
   */
  setChannelSolo(staffId: string, solo: boolean): void {
    const channel = this.channels.get(staffId);
    if (channel) {
      channel.solo = solo;
    }
  }

  /**
   * Check if a channel should be audible
   */
  private isChannelAudible(channelIndex: number): boolean {
    const channels = Array.from(this.channels.values());
    const channel = channels[channelIndex];
    if (!channel) return false;

    if (channel.muted) return false;

    const hasSolo = channels.some((c) => c.solo);
    if (hasSolo && !channel.solo) return false;

    return true;
  }

  /**
   * Get effective volume for a channel
   */
  private getChannelVolume(channelIndex: number): number {
    const channels = Array.from(this.channels.values());
    const channel = channels[channelIndex];
    return channel?.volume ?? 0.8;
  }

  /**
   * Toggle metronome
   */
  toggleMetronome(enabled: boolean): void {
    this.isMetronomeEnabled = enabled;
  }

  /**
   * Start playback
   */
  play(): void {
    if (!this.scoreIR || !this.audioEngine.ready) {
      console.warn('[Sequencer] Cannot play: no score or audio not ready');
      return;
    }

    if (this.isPaused) {
      // Resume from pause
      const pauseDuration = performance.now() / 1000 - this.pauseTime;
      this.startTime += pauseDuration;
      this.isPaused = false;
    } else {
      // Start fresh
      this.startTime = performance.now() / 1000;
    }

    this.isPlaying = true;
    this.tick();

    console.log(`[Sequencer] Playback started at tempo ${this.tempo} BPM`);
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.isPaused = true;
    this.pauseTime = performance.now() / 1000;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop all playing notes
    this.audioEngine.allNotesOff();

    console.log('[Sequencer] Playback paused');
  }

  /**
   * Stop playback and reset position
   */
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentMeasure = 1;

    // Reset all events
    this.scheduledEvents.forEach(e => e.played = false);

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop all playing notes
    this.audioEngine.allNotesOff();

    this.notifyStateChange();
    console.log('[Sequencer] Playback stopped');
  }

  /**
   * Seek to a specific measure
   */
  seekToMeasure(measure: number): void {
    const totalMeasures = this.getTotalMeasures();
    this.currentMeasure = Math.max(1, Math.min(measure, totalMeasures));

    const beatsPerMeasure = 4;
    const secondsPerBeat = 60 / this.tempo;
    const seekTime = (this.currentMeasure - 1) * beatsPerMeasure * secondsPerBeat;

    this.startTime = performance.now() / 1000 - seekTime;

    // Reset played status for future events
    const currentTime = seekTime;
    this.scheduledEvents.forEach(event => {
      if (event.time >= currentTime) {
        event.played = false;
      }
    });

    this.audioEngine.allNotesOff();
    this.notifyStateChange();
    this.onMeasureChange?.(this.currentMeasure);

    console.log(`[Sequencer] Seeked to measure ${this.currentMeasure}`);
  }

  /**
   * Get total number of measures
   */
  getTotalMeasures(): number {
    if (!this.scoreIR) return 0;

    let maxMeasure = 0;
    this.scoreIR.staves.forEach((staff) => {
      staff.measures.forEach((measure) => {
        maxMeasure = Math.max(maxMeasure, measure.number);
      });
    });

    return maxMeasure;
  }

  /**
   * Main playback tick - called via requestAnimationFrame
   */
  private tick = (): void => {
    if (!this.isPlaying || !this.scoreIR) return;

    const currentTime = performance.now() / 1000 - this.startTime;
    const beatsPerMeasure = 4;
    const secondsPerBeat = 60 / this.tempo;
    const secondsPerMeasure = beatsPerMeasure * secondsPerBeat;

    // Calculate current position
    // Calculate current position
    const newMeasure = Math.floor(currentTime / secondsPerMeasure) + 1;

    // Check for measure change
    if (newMeasure !== this.currentMeasure) {
      this.currentMeasure = newMeasure;
      this.onMeasureChange?.(this.currentMeasure);
    }

    // Check for loop
    if (this.loop && this.currentMeasure > this.loopEnd) {
      this.seekToMeasure(this.loopStart);
    }

    // Check for end of score
    const totalMeasures = this.getTotalMeasures();
    if (this.currentMeasure > totalMeasures) {
      this.stop();
      return;
    }

    // Play scheduled events
    const lookAhead = 0.1; // 100ms look-ahead for scheduling
    const playUntil = currentTime + lookAhead;

    this.scheduledEvents.forEach((event) => {
      // Check if event is in the window AND hasn't been played yet
      if (!event.played && event.time >= currentTime && event.time < playUntil) {
        // Mark as played immediately to prevent re-triggering in next frame
        event.played = true;

        if (this.isChannelAudible(event.channel)) {
          const volume = this.getChannelVolume(event.channel);
          const adjustedVelocity = Math.round(event.velocity * volume);

          const channelConfig = this.channels.get(this.scoreIR!.staves[event.channel].id);
          const instrument = channelConfig?.instrument || 'piano';

          this.audioEngine.noteOn(event.pitch, adjustedVelocity, instrument, event.channel);

          // Schedule note off
          setTimeout(() => {
            this.audioEngine.noteOff(event.pitch, instrument, event.channel);
          }, event.duration * 1000);
        }
      }
    });

    // Play metronome click
    if (this.isMetronomeEnabled) {
      const lookAheadBeatIndex = Math.floor(playUntil / secondsPerBeat);

      if (lookAheadBeatIndex > this.lastScheduledBeat) {
        const beatTime = lookAheadBeatIndex * secondsPerBeat;
        const isDownbeat = lookAheadBeatIndex % beatsPerMeasure === 0;
        const pitch = isDownbeat ? 77 : 76; // High vs Low Woodblock

        // Schedule note
        const delay = Math.max(0, (beatTime - currentTime) * 1000);
        setTimeout(() => {
          if (this.isPlaying && this.isMetronomeEnabled) {
            // Use 'drums' instrument for metronome
            this.audioEngine.noteOn(pitch, 90, 'drums', 9); // Channel 9 reserved for drums usually
            setTimeout(() => this.audioEngine.noteOff(pitch, 'drums', 9), 100);
          }
        }, delay);

        this.lastScheduledBeat = lookAheadBeatIndex;
      }
    }

    // Notify state change
    this.notifyStateChange();

    // Schedule next tick
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Notify listeners of state change
   */
  private notifyStateChange(): void {
    const beatsPerMeasure = 4;
    const secondsPerBeat = 60 / this.tempo;
    const currentTime = this.isPlaying
      ? performance.now() / 1000 - this.startTime
      : 0;

    this.onStateChange?.({
      isPlaying: this.isPlaying,
      currentMeasure: this.currentMeasure,
      currentBeat: (currentTime % (beatsPerMeasure * secondsPerBeat)) / secondsPerBeat,
      tempo: this.tempo,
      elapsedTime: currentTime,
    });
  }

  /**
   * Register state change callback
   */
  onState(callback: (state: SequencerState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Register measure change callback
   */
  onMeasure(callback: (measure: number) => void): void {
    this.onMeasureChange = callback;
  }

  /**
   * Get current state
   */
  getState(): SequencerState {
    const currentTime = this.isPlaying
      ? performance.now() / 1000 - this.startTime
      : 0;
    const beatsPerMeasure = 4;
    const secondsPerBeat = 60 / this.tempo;

    return {
      isPlaying: this.isPlaying,
      currentMeasure: this.currentMeasure,
      currentBeat: (currentTime % (beatsPerMeasure * secondsPerBeat)) / secondsPerBeat,
      tempo: this.tempo,
      elapsedTime: currentTime,
    };
  }

  /**
   * Get channel configurations
   */
  getChannels(): ChannelConfig[] {
    return Array.from(this.channels.values());
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stop();
    this.scoreIR = null;
    this.channels.clear();
    this.scheduledEvents = [];
  }
}

/**
 * Create a new Audio Sequencer instance
 */
export function createAudioSequencer(audioEngine: AudioEngine): AudioSequencer {
  return new AudioSequencer(audioEngine);
}
