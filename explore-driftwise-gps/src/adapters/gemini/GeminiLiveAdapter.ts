import { Result, ok, err } from '../../shared/types/Result';
import { ISpeechSynthesisAdapter } from '../../domains/voice/SpeechSynthesisService';

/**
 * GeminiLiveError - Error type for Gemini Live API operations
 */
export class GeminiLiveError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'GeminiLiveError';
  }
}

/**
 * Audio format configuration (PCM 16-bit 16kHz)
 */
export interface AudioFormat {
  encoding: 'LINEAR16';
  sampleRateHertz: 16000;
}

/**
 * BidiGenerateContentSetup message for initiating Live API session
 */
interface BidiGenerateContentSetup {
  model: string;
  systemInstruction?: {
    parts: Array<{
      text: string;
    }>;
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
}

/**
 * GeminiLiveAdapter - WebSocket adapter for Gemini Live API
 * Handles bidirectional audio streaming for speech synthesis and command recognition
 */
export class GeminiLiveAdapter implements ISpeechSynthesisAdapter {
  private apiKey: string;
  private model: string = 'gemini-2.0-flash-exp';
  private baseUrl: string = 'wss://generativelanguage.googleapis.com/google.ai.generativelanguage.v1alpha.GenerativeService/BidiGenerateContent';
  private ws: WebSocket | null = null;
  private sessionActive: boolean = false;
  private audioBuffer: Uint8Array[] = [];
  private sessionTimeoutMs: number;
  private lastActivityTime: number;
  private incomingAudioQueue: ArrayBuffer[] = [];
  private systemPrompt: string =
    'You are a helpful voice assistant providing historical facts. Keep responses concise and engaging.';

  constructor(apiKey: string, sessionTimeoutMs: number = 10 * 60 * 1000) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = apiKey;
    this.sessionTimeoutMs = sessionTimeoutMs;
    this.lastActivityTime = Date.now();
  }

  /**
   * Initialize WebSocket connection to Gemini Live API
   */
  async connect(): Promise<Result<void, GeminiLiveError>> {
    try {
      if (this.sessionActive) {
        return err(new GeminiLiveError('Session already active', 'SESSION_ALREADY_ACTIVE'));
      }

      // Only proceed if we have WebSocket support (browser environment)
      if (typeof WebSocket === 'undefined') {
        return err(
          new GeminiLiveError(
            'WebSocket not available in this environment',
            'WEBSOCKET_UNAVAILABLE',
          ),
        );
      }

      const wsUrl = `${this.baseUrl}?key=${this.apiKey}`;

      return new Promise((resolve) => {
        try {
          this.ws = new WebSocket(wsUrl);
          this.ws.binaryType = 'arraybuffer';

          this.ws.onopen = () => {
            this.sessionActive = true;
            this.lastActivityTime = Date.now();
            this.sendSetupMessage();
            resolve(ok(undefined));
          };

          this.ws.onmessage = (event) => {
            this.lastActivityTime = Date.now();
            this.handleIncomingMessage(event.data);
          };

          this.ws.onerror = (error) => {
            this.sessionActive = false;
            resolve(
              err(
                new GeminiLiveError(
                  'WebSocket connection error',
                  'CONNECTION_ERROR',
                  error,
                ),
              ),
            );
          };

          this.ws.onclose = () => {
            this.sessionActive = false;
          };

          // Set connection timeout
          setTimeout(() => {
            if (!this.sessionActive) {
              resolve(
                err(
                  new GeminiLiveError(
                    'Connection timeout',
                    'CONNECTION_TIMEOUT',
                  ),
                ),
              );
            }
          }, 5000);
        } catch (error) {
          this.sessionActive = false;
          resolve(
            err(
              new GeminiLiveError(
                'Failed to create WebSocket',
                'WEBSOCKET_ERROR',
                error,
              ),
            ),
          );
        }
      });
    } catch (error) {
      return err(
        new GeminiLiveError(
          'Connection failed',
          'CONNECT_FAILED',
          error,
        ),
      );
    }
  }

  /**
   * Send BidiGenerateContentSetup message to initialize session
   */
  private sendSetupMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const setup: BidiGenerateContentSetup = {
      model: this.model,
      systemInstruction: {
        parts: [
          {
            text: this.systemPrompt,
          },
        ],
      },
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    };

    this.sendMessage({
      setup,
    });
  }

  /**
   * Synthesize text to speech by sending to Gemini Live API
   */
  async synthesize(text: string): Promise<Result<ArrayBuffer, GeminiLiveError>> {
    try {
      if (!this.sessionActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        const connectResult = await this.connect();
        if (!connectResult.ok) {
          return connectResult;
        }
      }

      // Check session timeout
      if (this.hasSessionTimedOut()) {
        await this.disconnect();
        return err(new GeminiLiveError('Session timed out', 'SESSION_TIMEOUT'));
      }

      // Send text content as message
      this.sendMessage({
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text,
                },
              ],
            },
          ],
          turnComplete: true,
        },
      });

      // Wait for audio response (simplified - in real implementation would use promises)
      return new Promise((resolve) => {
        const checkAudio = () => {
          if (this.incomingAudioQueue.length > 0) {
            const audio = this.incomingAudioQueue.shift()!;
            resolve(ok(audio));
          } else {
            setTimeout(checkAudio, 100);
          }
        };
        setTimeout(checkAudio, 100);
      });
    } catch (error) {
      return err(
        new GeminiLiveError(
          'Synthesis failed',
          'SYNTHESIS_FAILED',
          error,
        ),
      );
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleIncomingMessage(data: unknown): void {
    try {
      if (data instanceof ArrayBuffer) {
        // Binary audio data
        this.incomingAudioQueue.push(data);
      } else if (typeof data === 'string') {
        // Text response (transcript or model output)
        try {
          const message = JSON.parse(data);
          this.processServerMessage(message);
        } catch {
          // Not JSON - treat as raw text
          console.debug('Received non-JSON message:', data);
        }
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  /**
   * Process server message from Gemini API
   */
  private processServerMessage(message: unknown): void {
    // Handle model responses, audio data, etc.
    // This is simplified - full implementation would handle various message types
    console.debug('Server message:', message);
  }

  /**
   * Send a message to Gemini Live API
   */
  private sendMessage(message: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.lastActivityTime = Date.now();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  /**
   * Stream microphone audio input to Gemini Live API
   * In a real implementation, this would continuously read from microphone
   */
  async streamMicrophoneInput(
    audioChunk: Uint8Array,
  ): Promise<Result<void, GeminiLiveError>> {
    try {
      if (!this.sessionActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return err(
          new GeminiLiveError('Session not active', 'SESSION_NOT_ACTIVE'),
        );
      }

      // Send audio chunk to API
      this.sendMessage({
        realtimeInput: {
          mediaChunks: [
            {
              data: this.arrayBufferToBase64(audioChunk),
              mimeType: 'audio/pcm',
            },
          ],
        },
      });

      return ok(undefined);
    } catch (error) {
      return err(
        new GeminiLiveError(
          'Failed to stream audio',
          'STREAM_FAILED',
          error,
        ),
      );
    }
  }

  /**
   * Disconnect from Gemini Live API
   */
  async disconnect(): Promise<Result<void, GeminiLiveError>> {
    try {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.sessionActive = false;
      this.incomingAudioQueue = [];
      return ok(undefined);
    } catch (error) {
      return err(
        new GeminiLiveError(
          'Disconnect failed',
          'DISCONNECT_FAILED',
          error,
        ),
      );
    }
  }

  /**
   * Check if session has timed out
   */
  private hasSessionTimedOut(): boolean {
    return Date.now() - this.lastActivityTime > this.sessionTimeoutMs;
  }

  /**
   * Get estimated synthesis time (simplified)
   */
  getEstimatedSynthesisTimeMs(text: string): number {
    // Rough estimate: ~150 words per minute = 2.5 chars per second
    // Plus 200ms overhead for API latency
    const wordCount = text.split(/\s+/).length;
    const estimatedSpeechTime = (wordCount / 150) * 60 * 1000;
    return Math.round(estimatedSpeechTime + 200);
  }

  /**
   * Check if adapter is ready
   */
  async isReady(): Promise<boolean> {
    return this.sessionActive && !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get session status
   */
  getStatus(): {
    connected: boolean;
    model: string;
    sessionTimeout: number;
    lastActivity: Date;
    hasTimedOut: boolean;
  } {
    return {
      connected: this.sessionActive,
      model: this.model,
      sessionTimeout: this.sessionTimeoutMs,
      lastActivity: new Date(this.lastActivityTime),
      hasTimedOut: this.hasSessionTimedOut(),
    };
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Set system prompt for the session
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    // Would need to reconnect to apply changes
  }
}
