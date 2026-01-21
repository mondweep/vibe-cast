export class VoiceService {
    private ws: WebSocket | null = null;
    // TODO: Move to Env
    private readonly API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'TEST_KEY';
    private readonly URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.API_KEY}`;

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.URL);

            this.ws.onopen = () => {
                console.log('Connected to Gemini Live');
                resolve();
            };

            this.ws.onerror = (err) => {
                console.error('Gemini Live Error', err);
                reject(err);
            };

            this.ws.onmessage = (event) => {
                // Handle audio chunks here (Phase 4b)
                console.log('Received:', event.data);
            };
        });
    }

    async speak(text: string): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('VoiceService not connected');
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

        this.ws.send(JSON.stringify(payload));
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
