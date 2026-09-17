/**
 * Somnus audio worklet — PRD §8 stage 1.
 *
 * This is the single place in the entire system where raw audio samples
 * exist. They are accumulated into a 2048-sample window, reduced to four
 * numbers, and overwritten by the next window. Nothing here posts, stores or
 * copies a sample buffer: the only message crossing to the main thread is a
 * FrameFeatures object of four scalars (ADR-001, invariant I-C4).
 */

const FRAME_SIZE = 2048;
const HOP_SIZE = 1024;

/** In-place iterative radix-2 Cooley-Tukey FFT. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

class SnoreProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(FRAME_SIZE);
    this.filled = 0;
    this.elapsedSamples = 0;
    this.window = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i += 1) {
      // Hann window.
      this.window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME_SIZE - 1)));
    }
    this.re = new Float32Array(FRAME_SIZE);
    this.im = new Float32Array(FRAME_SIZE);
  }

  analyse() {
    const n = FRAME_SIZE;

    let sumSquares = 0;
    for (let i = 0; i < n; i += 1) {
      const s = this.buffer[i];
      sumSquares += s * s;
      this.re[i] = s * this.window[i];
      this.im[i] = 0;
    }
    const rms = Math.sqrt(sumSquares / n);
    // Floor well below any real microphone noise so silence is finite.
    const rmsDb = 20 * Math.log10(Math.max(rms, 1e-10));

    fft(this.re, this.im);

    const binHz = sampleRate / n;
    const half = n / 2;
    let totalEnergy = 0;
    let lowEnergy = 0;
    let logSum = 0;
    let counted = 0;

    for (let k = 1; k < half; k += 1) {
      const mag = Math.sqrt(this.re[k] * this.re[k] + this.im[k] * this.im[k]);
      const power = mag * mag;
      const hz = k * binHz;
      totalEnergy += power;
      // The snore band: soft-tissue vibration is low and harmonically rich.
      if (hz >= 30 && hz <= 300) lowEnergy += power;
      if (hz <= 4000) {
        logSum += Math.log(power + 1e-20);
        counted += 1;
      }
    }

    const lowBandRatio = totalEnergy > 0 ? lowEnergy / totalEnergy : 0;

    // Wiener entropy: geometric mean over arithmetic mean, 0 tonal .. 1 noisy.
    let spectralFlatness = 1;
    if (counted > 0 && totalEnergy > 0) {
      const geometric = Math.exp(logSum / counted);
      const arithmetic = totalEnergy / counted;
      spectralFlatness = arithmetic > 0 ? Math.min(1, geometric / arithmetic) : 1;
    }

    this.port.postMessage({
      tMs: Math.round((this.elapsedSamples / sampleRate) * 1000),
      rmsDb,
      lowBandRatio,
      spectralFlatness,
    });
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i += 1) {
      this.buffer[this.filled] = channel[i];
      this.filled += 1;
      if (this.filled === FRAME_SIZE) {
        this.analyse();
        // Slide by the hop; the tail becomes the head of the next window.
        this.buffer.copyWithin(0, HOP_SIZE);
        this.filled = FRAME_SIZE - HOP_SIZE;
        this.elapsedSamples += HOP_SIZE;
      }
    }
    return true;
  }
}

registerProcessor('snore-processor', SnoreProcessor);
