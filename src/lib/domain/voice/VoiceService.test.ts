import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoiceService } from './VoiceService';
// import { WS } from 'vitest-websocket-mock'; 

// Simple mock for standard WebSocket since vitest-websocket-mock might be overkill for V1
class MockWebSocket {
    static instances: MockWebSocket[] = [];
    url: string;
    onopen: () => void = () => { };
    onmessage: (event: any) => void = () => { };
    send = vi.fn();
    close = vi.fn();

    constructor(url: string) {
        this.url = url;
        MockWebSocket.instances.push(this);
        setTimeout(() => this.onopen(), 0);
    }
}

global.WebSocket = MockWebSocket as any;

describe('VoiceService', () => {
    beforeEach(() => {
        MockWebSocket.instances = [];
    });

    it('should connect to Gemini Live API', async () => {
        const service = new VoiceService();
        await service.connect();

        expect(MockWebSocket.instances.length).toBe(1);
        expect(MockWebSocket.instances[0].url).toContain('generativelanguage.googleapis.com');
    });

    it('should send a text message to the socket', async () => {
        const service = new VoiceService();
        await service.connect();
        await service.speak("Hello Driftwise");

        const ws = MockWebSocket.instances[0];
        expect(ws.send).toHaveBeenCalled();

        // Verify JSON payload structure for Gemini Live
        const sentData = JSON.parse(ws.send.mock.calls[0][0]);
        expect(sentData).toHaveProperty('client_content');
    });
});
