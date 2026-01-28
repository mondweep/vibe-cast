/**
 * Sample-Based Synthesizer AudioWorklet
 * Plays audio samples with pitch shifting and ADSR envelopes
 * Supports multiple instrument channels
 */

interface SampleMessage {
  type: 'load-sample';
  instrument: string;
  midiNote: number;
  samples: Float32Array; // Interleaved stereo
  sampleRate: number;
}

interface NoteOnMessage {
  type: 'note-on';
  pitch: number;
  velocity: number;
  instrument?: string;
  channel?: number;
}

interface NoteOffMessage {
  type: 'note-off';
  pitch: number;
  instrument?: string;
  channel?: number;
}

interface SetGainMessage {
  type: 'set-gain';
  channel: number;
  gain: number;
}

interface SetTempoMessage {
  type: 'set-tempo';
  bpm: number;
}

interface SetEnvelopeMessage {
  type: 'set-envelope';
  instrument: string;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

type WorkletMessage =
  | SampleMessage
  | NoteOnMessage
  | NoteOffMessage
  | SetGainMessage
  | SetTempoMessage
  | SetEnvelopeMessage;

interface LoadedSample {
  data: Float32Array;
  baseNote: number;
  sampleRate: number;
}

interface ActiveVoice {
  pitch: number;
  velocity: number;
  instrument: string;
  channel: number;
  sampleIndex: number;
  playbackRate: number;
  sample: LoadedSample | null; // Cache the sample reference
  envelope: {
    phase: 'attack' | 'decay' | 'sustain' | 'release';
    level: number;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  releaseTime: number | null;
}

interface InstrumentEnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/**
 * Sample-based polyphonic synthesizer
 */
class SampleSynthProcessor extends AudioWorkletProcessor {
  private samples: Map<string, Map<number, LoadedSample>> = new Map();
  private voices: ActiveVoice[] = [];
  private channelGains: number[] = new Array(16).fill(1.0);
  private masterGain = 2.0; // Boosted for visibility/audibility
  private envelopes: Map<string, InstrumentEnvelope> = new Map();

  // Default envelope for instruments without custom settings
  private defaultEnvelope: InstrumentEnvelope = {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
  };

  constructor() {
    super();
    this.port.onmessage = this.handleMessage.bind(this);

    // Initialize default envelopes for common instruments
    this.envelopes.set('piano', { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.3 });
    this.envelopes.set('guitar', { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 });
    this.envelopes.set('bass', { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.2 });
    this.envelopes.set('synth', { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.2 });
    this.envelopes.set('strings', { attack: 0.15, decay: 0.1, sustain: 0.9, release: 0.4 });
    this.envelopes.set('drums', { attack: 0.001, decay: 0.1, sustain: 0.3, release: 0.1 });
  }

  private handleMessage(event: MessageEvent<WorkletMessage>): void {
    const message = event.data;

    switch (message.type) {
      case 'load-sample':
        this.loadSample(message);
        break;

      case 'note-on':
        this.noteOn(message);
        break;

      case 'note-off':
        this.noteOff(message);
        break;

      case 'set-gain':
        if (message.channel >= 0 && message.channel < 16) {
          this.channelGains[message.channel] = message.gain;
        } else {
          this.masterGain = message.gain;
        }
        break;

      case 'set-tempo':
        // Tempo affects nothing in sample playback directly
        // Could be used for time-stretching in future
        break;

      case 'set-envelope':
        this.envelopes.set(message.instrument, {
          attack: message.attack,
          decay: message.decay,
          sustain: message.sustain,
          release: message.release,
        });
        break;
    }
  }

  private loadSample(message: SampleMessage): void {
    if (!this.samples.has(message.instrument)) {
      this.samples.set(message.instrument, new Map());
    }

    this.samples.get(message.instrument)!.set(message.midiNote, {
      data: message.samples,
      baseNote: message.midiNote,
      sampleRate: message.sampleRate,
    });

    console.log(`[SampleSynth] Loaded sample: ${message.instrument} note ${message.midiNote}`);
  }

  private noteOn(message: NoteOnMessage): void {
    const instrument = message.instrument || 'default';
    const channel = message.channel || 0;

    // Get envelope for this instrument
    const env = this.envelopes.get(instrument) || this.defaultEnvelope;

    // Find closest sample ONCE at start of note
    const sample = this.findClosestSample(instrument, message.pitch);

    // Calculate pitch shift
    const pitchShift = sample
      ? Math.pow(2, (message.pitch - sample.baseNote) / 12)
      : Math.pow(2, (message.pitch - 60) / 12);

    // Compensate for sample rate mismatch (e.g. 44.1k sample vs 48k context)
    const sampleRateRatio = sample ? (sample.sampleRate / sampleRate) : 1.0;
    const playbackRate = pitchShift * sampleRateRatio;

    // Create new voice with cached sample
    const voice: ActiveVoice = {
      pitch: message.pitch,
      velocity: message.velocity / 127,
      instrument,
      channel,
      sampleIndex: 0,
      playbackRate,
      sample: sample, // Store reference
      envelope: {
        phase: 'attack',
        level: 0,
        attack: env.attack,
        decay: env.decay,
        sustain: env.sustain,
        release: env.release,
      },
      releaseTime: null,
    };

    // Limit polyphony to prevent CPU overload
    const MAX_POLYPHONY = 128; // Increased from 64
    if (this.voices.length >= MAX_POLYPHONY) {
      // Find best voice to steal (quietest / oldest / released)
      let bestCandidateIndex = -1;
      let minScore = Infinity;

      for (let i = 0; i < this.voices.length; i++) {
        const v = this.voices[i];
        let score = v.envelope.level; // Bias towards quiet notes

        // Prefer released notes significantly
        if (v.envelope.phase === 'release') {
          score *= 0.1;
        }

        // Bias slightly towards older notes (lower index)
        score *= (1 + i / this.voices.length * 0.1);

        if (score < minScore) {
          minScore = score;
          bestCandidateIndex = i;
        }
      }

      if (bestCandidateIndex !== -1) {
        this.voices.splice(bestCandidateIndex, 1);
      } else {
        this.voices.shift(); // Fallback to oldest
      }
    }

    this.voices.push(voice);
  }

  private noteOff(message: NoteOffMessage): void {
    const instrument = message.instrument || 'default';

    // Find voice and start release
    for (const voice of this.voices) {
      if (voice.pitch === message.pitch &&
        voice.instrument === instrument &&
        voice.releaseTime === null) {
        voice.releaseTime = currentTime;
        voice.envelope.phase = 'release';
        break;
      }
    }
  }

  private findClosestSample(instrument: string, pitch: number): LoadedSample | null {
    const instrumentSamples = this.samples.get(instrument);
    if (!instrumentSamples || instrumentSamples.size === 0) return null;

    let closest: LoadedSample | null = null;
    let minDistance = Infinity;

    for (const [note, sample] of instrumentSamples) {
      const distance = Math.abs(note - pitch);
      if (distance < minDistance) {
        minDistance = distance;
        closest = sample;
      }
    }

    return closest;
  }

  /**
   * Generate sine wave for notes without samples
   */
  private generateSineWave(
    output: Float32Array[],
    voice: ActiveVoice,
    numFrames: number
  ): void {
    const frequency = 440 * Math.pow(2, (voice.pitch - 69) / 12);
    const left = output[0];
    const right = output[1] || left;

    for (let i = 0; i < numFrames; i++) {
      // Update envelope
      const envLevel = this.processEnvelope(voice);
      if (envLevel < 0.0001 && voice.envelope.phase === 'release') {
        break;
      }

      // Generate sample
      const phase = (voice.sampleIndex * frequency * 2 * Math.PI) / sampleRate;
      const sample = Math.sin(phase);

      // Apply velocity, envelope, and channel gain
      const channelGain = this.channelGains[voice.channel] || 1.0;
      const amplitude = sample * voice.velocity * envLevel * channelGain * this.masterGain;

      left[i] += amplitude;
      if (right !== left) right[i] += amplitude;

      voice.sampleIndex++;
    }
  }

  /**
   * Play loaded sample with pitch shifting
   */
  private playSample(
    output: Float32Array[],
    voice: ActiveVoice,
    sample: LoadedSample,
    numFrames: number
  ): void {
    const left = output[0];
    const right = output[1] || left;
    const sampleData = sample.data;
    const sampleLength = sampleData.length / 2; // Stereo interleaved

    for (let i = 0; i < numFrames; i++) {
      // Update envelope
      const envLevel = this.processEnvelope(voice);
      if (envLevel < 0.0001 && voice.envelope.phase === 'release') {
        break;
      }

      // Get sample position with interpolation
      const samplePos = voice.sampleIndex * voice.playbackRate;
      if (samplePos >= sampleLength - 1) {
        // Sample ended
        voice.envelope.phase = 'release';
        voice.envelope.level = 0;
        break;
      }

      const pos0 = Math.floor(samplePos);
      const pos1 = pos0 + 1;
      const frac = samplePos - pos0;

      // Linear interpolation
      const leftSample = sampleData[pos0 * 2] * (1 - frac) + sampleData[pos1 * 2] * frac;
      const rightSample =
        sampleData[pos0 * 2 + 1] * (1 - frac) + sampleData[pos1 * 2 + 1] * frac;

      // Apply velocity, envelope, and channel gain
      const channelGain = this.channelGains[voice.channel] || 1.0;
      const amplitude = voice.velocity * envLevel * channelGain * this.masterGain;

      left[i] += leftSample * amplitude;
      if (right !== left) right[i] += rightSample * amplitude;

      voice.sampleIndex++;
    }
  }

  /**
   * Process ADSR envelope for a voice
   */
  private processEnvelope(voice: ActiveVoice): number {
    const env = voice.envelope;
    const dt = 1 / sampleRate;

    switch (env.phase) {
      case 'attack':
        env.level += dt / env.attack;
        if (env.level >= 1.0) {
          env.level = 1.0;
          env.phase = 'decay';
        }
        break;

      case 'decay':
        env.level -= dt / env.decay * (1 - env.sustain);
        if (env.level <= env.sustain) {
          env.level = env.sustain;
          env.phase = 'sustain';
        }
        break;

      case 'sustain':
        // Maintain level
        break;

      case 'release':
        env.level -= dt / env.release * env.level;
        if (env.level < 0.0001) {
          env.level = 0;
        }
        break;
    }

    return env.level;
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const left = output[0];
    const right = output[1] || left;
    const numFrames = left.length;

    // Clear buffers
    left.fill(0);
    if (right !== left) right.fill(0);

    // Process each voice
    const voicesToRemove: number[] = [];

    for (let v = 0; v < this.voices.length; v++) {
      const voice = this.voices[v];

      // Use cached sample
      if (voice.sample) {
        this.playSample(output, voice, voice.sample, numFrames);
      } else {
        this.generateSineWave(output, voice, numFrames);
      }

      // Check if voice should be removed
      if (voice.envelope.level < 0.0001 && voice.envelope.phase === 'release') {
        voicesToRemove.push(v);
      }
    }

    // Remove finished voices (in reverse order to maintain indices)
    for (let i = voicesToRemove.length - 1; i >= 0; i--) {
      this.voices.splice(voicesToRemove[i], 1);
    }

    // Apply Soft Limiter (tanh) to prevent hard clipping
    for (let i = 0; i < numFrames; i++) {
      left[i] = Math.tanh(left[i]);
      if (right !== left) {
        right[i] = Math.tanh(right[i]);
      }
    }

    return true;
  }
}

registerProcessor('sample-synth-processor', SampleSynthProcessor);
