/**
 * Audio Worklet Processor for LuitPlayer
 * Low-latency sample-based synthesizer running on the audio thread
 * See ADR-001 for architecture details
 */

// Note: This file runs in the AudioWorklet scope, not the main thread
// It has access to AudioWorkletProcessor but not DOM APIs

interface NoteOnMessage {
  type: 'note-on';
  pitch: number; // MIDI note (0-127)
  velocity: number; // 0-127
  time: number; // When to start (in samples from now)
}

interface NoteOffMessage {
  type: 'note-off';
  pitch: number;
  time: number;
}

interface SetTempoMessage {
  type: 'set-tempo';
  bpm: number;
}

interface SetGainMessage {
  type: 'set-gain';
  channel: number;
  gain: number;
}

type WorkletMessage = NoteOnMessage | NoteOffMessage | SetTempoMessage | SetGainMessage;

interface ActiveNote {
  pitch: number;
  velocity: number;
  phase: number;
  envelope: number;
  releaseTime: number | null;
}

/**
 * Simple sine wave synthesizer as proof of concept
 * Will be replaced with sample-based synthesis
 */
class LuitPlayerProcessor extends AudioWorkletProcessor {
  private activeNotes: Map<number, ActiveNote> = new Map();
  private sampleRate: number;
  private tempo = 120;
  private masterGain = 0.5;

  constructor() {
    super();
    this.sampleRate = sampleRate; // Global in AudioWorklet scope
    this.port.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent<WorkletMessage>): void {
    const message = event.data;

    switch (message.type) {
      case 'note-on':
        this.noteOn(message.pitch, message.velocity);
        break;

      case 'note-off':
        this.noteOff(message.pitch);
        break;

      case 'set-tempo':
        this.tempo = message.bpm;
        break;

      case 'set-gain':
        this.masterGain = message.gain;
        break;
    }
  }

  private noteOn(pitch: number, velocity: number): void {
    const frequency = 440 * Math.pow(2, (pitch - 69) / 12);
    console.log(`[AudioWorklet] NoteOn: Pitch=${pitch}, Freq=${frequency}Hz`);

    this.activeNotes.set(pitch, {
      pitch,
      velocity: velocity / 127,
      phase: 0,
      envelope: 0,
      releaseTime: null,
    });
  }

  private noteOff(pitch: number): void {
    const note = this.activeNotes.get(pitch);
    if (note) {
      note.releaseTime = currentTime;
    }
  }

  /**
   * Generate audio samples
   * Called by the audio system with output buffers to fill
   */
  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const left = output[0];
    const right = output[1] || left;

    // Clear buffers
    left.fill(0);
    if (right !== left) right.fill(0);

    // Process each active note
    const notesToRemove: number[] = [];

    this.activeNotes.forEach((note) => {
      // Calculate frequency from the note's pitch property
      const frequency = 440 * Math.pow(2, (note.pitch - 69) / 12);
      const phaseIncrement = (frequency * 2 * Math.PI) / (this.sampleRate || 44100);

      for (let i = 0; i < left.length; i++) {
        // Simple ADSR envelope
        if (note.releaseTime === null) {
          // Attack/sustain
          note.envelope = Math.min(1, note.envelope + 0.005); // Faster attack
        } else {
          // Release
          note.envelope *= 0.9995;
          if (note.envelope < 0.001) {
            notesToRemove.push(note.pitch);
            break;
          }
        }

        // Generate sine wave
        const sample =
          Math.sin(note.phase) * note.velocity * note.envelope * this.masterGain;

        left[i] += sample;
        if (right !== left) right[i] += sample;

        note.phase += phaseIncrement;
        if (note.phase > 2 * Math.PI) {
          note.phase -= 2 * Math.PI;
        }
      }
    });

    // Remove finished notes
    notesToRemove.forEach((pitch) => this.activeNotes.delete(pitch));

    // Apply tempo if needed (placeholder to silence unused warning)
    if (this.tempo > 300) {
      // no-op, just reading the value
    }

    return true; // Keep processor alive
  }
}

// Register the processor
registerProcessor('luitplayer-processor', LuitPlayerProcessor);
