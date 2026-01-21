import { CommandIntent } from './CommandIntent';

/**
 * VoiceCommand - Value object representing a recognized voice command
 * Immutable once created. Contains the intent and supporting data.
 */
export class VoiceCommand {
  /**
   * Private constructor - use factory method instead
   */
  private constructor(
    readonly intent: CommandIntent,
    readonly transcript: string,
    readonly confidence: number, // 0.0 to 1.0
    readonly recognizedAt: Date,
  ) {
    if (confidence < 0 || confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }
  }

  /**
   * Create a voice command from a transcript
   * @param intent - The recognized command intent
   * @param transcript - The original user transcript
   * @param confidence - Confidence score (0-1)
   */
  static create(
    intent: CommandIntent,
    transcript: string,
    confidence: number = 1.0,
  ): VoiceCommand {
    return new VoiceCommand(intent, transcript, confidence, new Date());
  }

  /**
   * Get human-readable description of the command
   */
  getDescription(): string {
    const intentDescriptions: Record<CommandIntent, string> = {
      [CommandIntent.PAUSE]: 'User requested to pause',
      [CommandIntent.CONTINUE]: 'User requested to continue',
      [CommandIntent.SKIP]: 'User requested to skip to next fact',
      [CommandIntent.MORE_OFTEN]: 'User requested more frequent facts',
      [CommandIntent.LESS_OFTEN]: 'User requested less frequent facts',
      [CommandIntent.FOLLOW_UP]: 'User asked a follow-up question',
    };

    return intentDescriptions[this.intent];
  }

  /**
   * Check if confidence is high (>0.8)
   */
  isHighConfidence(): boolean {
    return this.confidence > 0.8;
  }

  /**
   * Check if confidence is medium (0.6-0.8)
   */
  isMediumConfidence(): boolean {
    return this.confidence >= 0.6 && this.confidence <= 0.8;
  }

  /**
   * Check if confidence is low (<0.6)
   */
  isLowConfidence(): boolean {
    return this.confidence < 0.6;
  }

  /**
   * Get timestamp string for logging
   */
  getTimestamp(): string {
    return this.recognizedAt.toISOString();
  }
}
