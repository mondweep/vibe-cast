import type { AudioPort, FrameFeatures } from '@somnus/domain';

/**
 * The real microphone behind {@link AudioPort} (ADR-004).
 *
 * All the audio-handling lives in the worklet; this adapter only wires it up
 * and forwards the four-scalar frames it emits. There is deliberately no
 * method here that could hand a buffer to a caller.
 */
export class WebAudioAdapter implements AudioPort {
  private context: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private running = false;

  get isRunning(): boolean {
    return this.running;
  }

  async start(onFrame: (frame: FrameFeatures) => void): Promise<void> {
    if (this.running) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // Every one of these would fight the measurement: AGC rescales
        // loudness so relative dB stops meaning anything, and noise
        // suppression is specifically designed to remove the kind of steady
        // low-frequency sound we are here to detect.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.context = new AudioContext();
    await this.context.audioWorklet.addModule('/snore-worklet.js');

    const source = this.context.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.context, 'snore-processor');
    this.node.port.onmessage = (event: MessageEvent<FrameFeatures>) => {
      onFrame(event.data);
    };

    // Connect to a muted gain node rather than the destination: the graph
    // must be pulled to run, but playing the microphone back into a bedroom
    // at 3am would be its own kind of sleep disorder.
    const sink = this.context.createGain();
    sink.gain.value = 0;
    source.connect(this.node);
    this.node.connect(sink);
    sink.connect(this.context.destination);

    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
    this.node?.port.close();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.context?.close();
    this.node = null;
    this.stream = null;
    this.context = null;
  }
}
