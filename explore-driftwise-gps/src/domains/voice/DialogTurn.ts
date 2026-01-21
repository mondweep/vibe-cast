import { VoiceCommand } from './VoiceCommand';

/**
 * DialogTurn - Entity representing a single turn in a voice dialog
 * Contains the delivered fact and optional user response/command
 */
export class DialogTurn {
  /**
   * Internal ID for this turn (within a session)
   */
  private turnId: string;

  /**
   * The fact text delivered by the system
   */
  readonly factText: string;

  /**
   * When the fact was delivered
   */
  readonly deliveredAt: Date;

  /**
   * How long it took to synthesize the fact (milliseconds)
   */
  readonly synthesisTimeMs: number;

  /**
   * User's command response (if any)
   */
  readonly userCommand?: VoiceCommand;

  /**
   * When the user responded (if at all)
   */
  readonly respondedAt?: Date;

  /**
   * How long the user took to respond (milliseconds)
   */
  readonly responseTimeMs?: number;

  /**
   * Whether this turn was successfully completed (delivered + responded)
   */
  readonly completed: boolean;

  /**
   * Constructor - use factory method instead
   */
  private constructor(
    turnId: string,
    factText: string,
    deliveredAt: Date,
    synthesisTimeMs: number,
    userCommand?: VoiceCommand,
    respondedAt?: Date,
    responseTimeMs?: number,
  ) {
    this.turnId = turnId;
    this.factText = factText;
    this.deliveredAt = deliveredAt;
    this.synthesisTimeMs = synthesisTimeMs;
    this.userCommand = userCommand;
    this.respondedAt = respondedAt;
    this.responseTimeMs = responseTimeMs;
    this.completed = !!userCommand && !!respondedAt;
  }

  /**
   * Create a new dialog turn when system delivers a fact
   */
  static createDelivery(
    factText: string,
    synthesisTimeMs: number,
  ): DialogTurn {
    const turnId = `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return new DialogTurn(
      turnId,
      factText,
      new Date(),
      synthesisTimeMs,
    );
  }

  /**
   * Add a user command response to this turn
   * Returns a new DialogTurn with the response recorded
   */
  addResponse(command: VoiceCommand): DialogTurn {
    const respondedAt = new Date();
    const responseTimeMs = respondedAt.getTime() - this.deliveredAt.getTime();

    return new DialogTurn(
      this.turnId,
      this.factText,
      this.deliveredAt,
      this.synthesisTimeMs,
      command,
      respondedAt,
      responseTimeMs,
    );
  }

  /**
   * Get the turn ID
   */
  getId(): string {
    return this.turnId;
  }

  /**
   * Get total turn duration in milliseconds
   */
  getTotalDurationMs(): number {
    if (this.respondedAt) {
      return this.respondedAt.getTime() - this.deliveredAt.getTime();
    }
    // If no response yet, return time elapsed so far
    return new Date().getTime() - this.deliveredAt.getTime();
  }

  /**
   * Get summary statistics for this turn
   */
  getSummary(): {
    turnId: string;
    factLength: number;
    synthesisTimeMs: number;
    responded: boolean;
    responseTimeMs?: number;
    commandIntent?: string;
    commandConfidence?: number;
    totalDurationMs: number;
  } {
    return {
      turnId: this.turnId,
      factLength: this.factText.length,
      synthesisTimeMs: this.synthesisTimeMs,
      responded: this.completed,
      responseTimeMs: this.responseTimeMs,
      commandIntent: this.userCommand?.intent,
      commandConfidence: this.userCommand?.confidence,
      totalDurationMs: this.getTotalDurationMs(),
    };
  }
}
