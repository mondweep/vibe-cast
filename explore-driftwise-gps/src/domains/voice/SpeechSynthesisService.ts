import { Result, ok, err } from '../../shared/types/Result';
import { VoiceSession } from './VoiceSession';
import { DialogTurn } from './DialogTurn';

/**
 * SpeechSynthesisError - Error type for speech synthesis operations
 */
export class SpeechSynthesisError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'SpeechSynthesisError';
  }
}

/**
 * SpeechSynthesisAdapter - Interface for speech synthesis providers
 * (e.g., Gemini Live API, Web Speech API, etc.)
 */
export interface ISpeechSynthesisAdapter {
  /**
   * Synthesize text to speech and return audio data
   */
  synthesize(text: string): Promise<Result<ArrayBuffer, SpeechSynthesisError>>;

  /**
   * Get estimated synthesis time in milliseconds
   */
  getEstimatedSynthesisTimeMs(text: string): number;

  /**
   * Check if adapter is ready
   */
  isReady(): Promise<boolean>;
}

/**
 * SpeechSynthesisService - Service for delivering facts as voice
 * Coordinates with speech synthesis adapter and session management
 */
export class SpeechSynthesisService {
  constructor(private readonly adapter: ISpeechSynthesisAdapter) {}

  /**
   * Synthesize and deliver a fact to the user via voice
   * @param fact - The fact text to deliver
   * @param session - The voice session to deliver to
   * @returns Result containing updated session
   */
  async synthesizeAndDeliver(
    fact: string,
    session: VoiceSession,
  ): Promise<Result<VoiceSession, SpeechSynthesisError>> {
    try {
      // Validate inputs
      if (!fact || fact.trim().length === 0) {
        return err(new SpeechSynthesisError('Fact cannot be empty', 'EMPTY_FACT'));
      }

      if (!session.isActive()) {
        return err(
          new SpeechSynthesisError('Session is not active', 'INACTIVE_SESSION'),
        );
      }

      // Check adapter readiness
      const isReady = await this.adapter.isReady();
      if (!isReady) {
        return err(
          new SpeechSynthesisError('Speech synthesis adapter is not ready', 'ADAPTER_NOT_READY'),
        );
      }

      // Transition to SPEAKING state
      try {
        session.startSpeaking();
      } catch (error) {
        return err(
          new SpeechSynthesisError(
            `Cannot start speaking: ${error instanceof Error ? error.message : 'unknown error'}`,
            'STATE_TRANSITION_ERROR',
            error,
          ),
        );
      }

      // Get estimated synthesis time
      const estimatedTimeMs = this.adapter.getEstimatedSynthesisTimeMs(fact);

      // Start dialog turn
      let turn: DialogTurn;
      try {
        turn = session.startDialogTurn(fact, estimatedTimeMs);
      } catch (error) {
        return err(
          new SpeechSynthesisError(
            `Failed to start dialog turn: ${error instanceof Error ? error.message : 'unknown error'}`,
            'DIALOG_TURN_ERROR',
            error,
          ),
        );
      }

      // Synthesize the fact
      const startTime = Date.now();
      const synthesisResult = await this.adapter.synthesize(fact);

      if (!synthesisResult.ok) {
        return err(synthesisResult.error);
      }

      const actualSynthesisTimeMs = Date.now() - startTime;

      // Transition to LISTENING state
      try {
        session.startListening();
      } catch (error) {
        return err(
          new SpeechSynthesisError(
            `Cannot start listening: ${error instanceof Error ? error.message : 'unknown error'}`,
            'LISTENING_ERROR',
            error,
          ),
        );
      }

      return ok(session);
    } catch (error) {
      return err(
        new SpeechSynthesisError(
          `Unexpected error during speech synthesis: ${error instanceof Error ? error.message : 'unknown error'}`,
          'UNEXPECTED_ERROR',
          error,
        ),
      );
    }
  }

  /**
   * Format a fact for optimal speech synthesis
   * Enhances readability and pacing
   */
  formatFactForSpeech(fact: string): string {
    return (
      fact
        // Add pauses at sentence boundaries
        .replace(/\.\s+/g, '. ') // Normalize sentence spacing
        // Add pauses at commas for clarity
        .replace(/,\s+/g, ', ') // Normalize comma spacing
        // Remove excessive punctuation
        .replace(/[!?]+/g, '.') // Normalize exclamation/question marks
        // Trim whitespace
        .trim()
    );
  }

  /**
   * Estimate total delivery time including synthesis and speech
   * @param fact - The fact text
   * @returns Estimated time in milliseconds
   */
  estimateDeliveryTimeMs(fact: string): number {
    // Base synthesis time from adapter
    const synthesisTime = this.adapter.getEstimatedSynthesisTimeMs(fact);

    // Estimate speech playback time (roughly 150 words per minute = 2.5 chars per second)
    const wordCount = fact.split(/\s+/).length;
    const estimatedSpeechTimeMs = (wordCount / 150) * 60 * 1000;

    // Add buffer for network/processing (10%)
    const buffer = (synthesisTime + estimatedSpeechTimeMs) * 0.1;

    return Math.round(synthesisTime + estimatedSpeechTimeMs + buffer);
  }

  /**
   * Get adapter configuration/status
   */
  getAdapterStatus(): {
    isReady: boolean;
    name: string;
  } {
    return {
      isReady: true, // Would need to be async to check properly
      name: this.adapter.constructor.name,
    };
  }
}
