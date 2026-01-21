import { v4 as uuidv4 } from 'uuid';
import { VoiceCommand } from './VoiceCommand';
import { DialogTurn } from './DialogTurn';

/**
 * VoiceSessionState - State of the voice session
 * SPEAKING: System is synthesizing and delivering a fact
 * LISTENING: System is listening for user response/command
 * PAUSED: User paused the session
 * IDLE: Session is closed/not active
 */
export enum VoiceSessionState {
  SPEAKING = 'SPEAKING',
  LISTENING = 'LISTENING',
  PAUSED = 'PAUSED',
  IDLE = 'IDLE',
}

/**
 * VoiceSession - Aggregate root for voice interaction context
 * Manages the state machine, dialog history, and session lifecycle
 */
export class VoiceSession {
  /**
   * Unique session ID
   */
  readonly id: string;

  /**
   * Current state of the session
   */
  private state: VoiceSessionState;

  /**
   * Timestamp when session was created
   */
  readonly createdAt: Date;

  /**
   * Timestamp when session was last active
   */
  private lastActivityAt: Date;

  /**
   * All dialog turns in this session
   */
  private dialogHistory: DialogTurn[];

  /**
   * Current dialog turn (if any)
   */
  private currentTurn?: DialogTurn;

  /**
   * Session timeout in milliseconds (default: 10 minutes)
   */
  private readonly sessionTimeoutMs: number;

  /**
   * Private constructor - use factory method instead
   */
  private constructor(
    id: string,
    state: VoiceSessionState = VoiceSessionState.IDLE,
    sessionTimeoutMs: number = 10 * 60 * 1000,
  ) {
    this.id = id;
    this.state = state;
    this.createdAt = new Date();
    this.lastActivityAt = new Date();
    this.dialogHistory = [];
    this.sessionTimeoutMs = sessionTimeoutMs;
  }

  /**
   * Create a new voice session
   */
  static create(sessionTimeoutMs?: number): VoiceSession {
    const id = `session-${uuidv4()}`;
    return new VoiceSession(id, VoiceSessionState.IDLE, sessionTimeoutMs);
  }

  /**
   * Get current state
   */
  getState(): VoiceSessionState {
    return this.state;
  }

  /**
   * Start speaking (transition IDLE/LISTENING/PAUSED -> SPEAKING)
   */
  startSpeaking(): void {
    if (this.state === VoiceSessionState.SPEAKING) {
      throw new Error('Session is already speaking');
    }
    this.state = VoiceSessionState.SPEAKING;
    this.lastActivityAt = new Date();
  }

  /**
   * Start listening (transition SPEAKING -> LISTENING)
   */
  startListening(): void {
    if (this.state !== VoiceSessionState.SPEAKING) {
      throw new Error('Can only start listening from SPEAKING state');
    }
    this.state = VoiceSessionState.LISTENING;
    this.lastActivityAt = new Date();
  }

  /**
   * Pause the session (transition SPEAKING/LISTENING -> PAUSED)
   */
  pause(): void {
    if (this.state === VoiceSessionState.IDLE || this.state === VoiceSessionState.PAUSED) {
      throw new Error('Cannot pause from current state');
    }
    this.state = VoiceSessionState.PAUSED;
    this.lastActivityAt = new Date();
  }

  /**
   * Resume from pause (transition PAUSED -> LISTENING)
   */
  resume(): void {
    if (this.state !== VoiceSessionState.PAUSED) {
      throw new Error('Can only resume from PAUSED state');
    }
    this.state = VoiceSessionState.LISTENING;
    this.lastActivityAt = new Date();
  }

  /**
   * Close the session (transition any state -> IDLE)
   */
  close(): void {
    this.state = VoiceSessionState.IDLE;
    this.lastActivityAt = new Date();
  }

  /**
   * Start a new dialog turn with a fact delivery
   */
  startDialogTurn(factText: string, synthesisTimeMs: number): DialogTurn {
    if (this.state !== VoiceSessionState.SPEAKING) {
      throw new Error('Can only start dialog turn while speaking');
    }
    this.currentTurn = DialogTurn.createDelivery(factText, synthesisTimeMs);
    this.lastActivityAt = new Date();
    return this.currentTurn;
  }

  /**
   * Record user response to current dialog turn
   */
  recordUserResponse(command: VoiceCommand): DialogTurn {
    if (this.state !== VoiceSessionState.LISTENING) {
      throw new Error('Can only record response while listening');
    }
    if (!this.currentTurn) {
      throw new Error('No current dialog turn to respond to');
    }

    const completedTurn = this.currentTurn.addResponse(command);
    this.dialogHistory.push(completedTurn);
    this.currentTurn = undefined;
    this.lastActivityAt = new Date();
    return completedTurn;
  }

  /**
   * Get current dialog turn (if speaking/listening)
   */
  getCurrentTurn(): DialogTurn | undefined {
    return this.currentTurn;
  }

  /**
   * Get all completed dialog turns
   */
  getDialogHistory(): DialogTurn[] {
    return [...this.dialogHistory];
  }

  /**
   * Get the count of completed dialog turns
   */
  getTurnCount(): number {
    return this.dialogHistory.length;
  }

  /**
   * Get the last completed dialog turn
   */
  getLastTurn(): DialogTurn | undefined {
    return this.dialogHistory[this.dialogHistory.length - 1];
  }

  /**
   * Check if session has timed out
   */
  hasTimedOut(): boolean {
    const elapsed = new Date().getTime() - this.lastActivityAt.getTime();
    return elapsed > this.sessionTimeoutMs;
  }

  /**
   * Get remaining time before timeout (in milliseconds)
   */
  getRemainingTimeMs(): number {
    const elapsed = new Date().getTime() - this.lastActivityAt.getTime();
    return Math.max(0, this.sessionTimeoutMs - elapsed);
  }

  /**
   * Check if session is active (not closed)
   */
  isActive(): boolean {
    return this.state !== VoiceSessionState.IDLE && !this.hasTimedOut();
  }

  /**
   * Get session statistics
   */
  getStatistics(): {
    sessionId: string;
    state: VoiceSessionState;
    createdAt: string;
    lastActivityAt: string;
    totalTurns: number;
    averageResponseTimeMs?: number;
    averageSynthesisTimeMs?: number;
    remainingTimeMs: number;
    isActive: boolean;
    hasTimedOut: boolean;
  } {
    const avgResponseTime =
      this.dialogHistory.length > 0
        ? this.dialogHistory.reduce((sum, turn) => sum + (turn.responseTimeMs || 0), 0) /
          this.dialogHistory.length
        : undefined;

    const avgSynthesisTime =
      this.dialogHistory.length > 0
        ? this.dialogHistory.reduce((sum, turn) => sum + turn.synthesisTimeMs, 0) /
          this.dialogHistory.length
        : undefined;

    return {
      sessionId: this.id,
      state: this.state,
      createdAt: this.createdAt.toISOString(),
      lastActivityAt: this.lastActivityAt.toISOString(),
      totalTurns: this.getTurnCount(),
      averageResponseTimeMs: avgResponseTime,
      averageSynthesisTimeMs: avgSynthesisTime,
      remainingTimeMs: this.getRemainingTimeMs(),
      isActive: this.isActive(),
      hasTimedOut: this.hasTimedOut(),
    };
  }

  /**
   * Export session data for persistence
   */
  export(): {
    id: string;
    state: VoiceSessionState;
    createdAt: Date;
    lastActivityAt: Date;
    dialogHistory: DialogTurn[];
    sessionTimeoutMs: number;
  } {
    return {
      id: this.id,
      state: this.state,
      createdAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      dialogHistory: [...this.dialogHistory],
      sessionTimeoutMs: this.sessionTimeoutMs,
    };
  }
}
