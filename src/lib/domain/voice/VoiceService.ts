export class VoiceService {
    private ws: WebSocket | null = null;
    private audioContext: AudioContext | null = null;
    private nextStartTime = 0;

    // TODO: Move to Env
    private readonly API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'TEST_KEY';
    private readonly URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.API_KEY}`;

    async connect(): Promise<void> {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.URL);

            this.ws.onopen = () => {
                console.log('Connected to Gemini Live');
                // Send initial setup if needed (config)
                resolve();
            };

            this.ws.onerror = (err) => {
                console.error('Gemini Live Error', err);
                reject(err);
            };

            this.ws.onmessage = async (event) => {
                try {
                    let data;
                    if (event.data instanceof Blob) {
                        data = JSON.parse(await event.data.text());
                    } else {
                        data = JSON.parse(event.data);
                    }

                    // Handle Server Content (Audio)
                    if (data.serverContent?.modelTurn?.parts) {
                        for (const part of data.serverContent.modelTurn.parts) {
                            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                                this.playPcmData(part.inlineData.data);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error parsing message', e);
                }
            };
        });
    }

    private playPcmData(base64String: string) {
        if (!this.audioContext) return;

        const binaryString = atob(base64String);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Convert PCM16 (Little Endian) to Float32
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768;
        }

        // Create Audio Buffer (Mono, 24kHz)
        const buffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);

        // Schedule Playback
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;
        // Ensure we schedule seamlessly
        if (this.nextStartTime < now) this.nextStartTime = now;

        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;
    }

    async speak(text: string): Promise<void> {
        // AUTOPLAY FIX: Resume context on user gesture (this method is called by button click)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('AudioContext Resumed by User Gesture');
        }

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            // Try auto-reconnect once
            console.log('Voice disconnected, reconnecting...');
            await this.connect();
        }

        // Gemini Live Protocol
        const payload = {
            client_content: {
                turns: [{
                    role: "user",
                    parts: [{ text: text }]
                }],
                turn_complete: true
            }
        };

        this.ws?.send(JSON.stringify(payload));
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
