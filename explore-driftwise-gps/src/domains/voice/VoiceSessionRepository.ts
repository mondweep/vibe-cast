import { Result } from '../../shared/types/Result';
import { VoiceSession } from './VoiceSession';

/**
 * VoiceSessionRepositoryError - Error type for repository operations
 */
export class VoiceSessionRepositoryError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'VoiceSessionRepositoryError';
  }
}

/**
 * VoiceSessionRepository - Interface for voice session persistence
 */
export interface IVoiceSessionRepository {
  /**
   * Save a voice session
   */
  save(session: VoiceSession): Promise<Result<VoiceSession, VoiceSessionRepositoryError>>;

  /**
   * Find the active voice session (if any)
   */
  findActive(): Promise<Result<VoiceSession | null, VoiceSessionRepositoryError>>;

  /**
   * Find a session by ID
   */
  findById(sessionId: string): Promise<Result<VoiceSession | null, VoiceSessionRepositoryError>>;

  /**
   * Delete a session by ID
   */
  delete(sessionId: string): Promise<Result<void, VoiceSessionRepositoryError>>;

  /**
   * Get all sessions
   */
  getAll(): Promise<Result<VoiceSession[], VoiceSessionRepositoryError>>;

  /**
   * Clear all sessions
   */
  clear(): Promise<Result<void, VoiceSessionRepositoryError>>;
}

/**
 * InMemoryVoiceSessionRepository - In-memory implementation
 * Maintains a single active session at any time
 */
export class InMemoryVoiceSessionRepository implements IVoiceSessionRepository {
  private activeSession: VoiceSession | null = null;
  private sessionsMap: Map<string, VoiceSession> = new Map();

  /**
   * Save a voice session
   * Only one active (non-IDLE) session allowed at a time
   */
  async save(session: VoiceSession): Promise<Result<VoiceSession, VoiceSessionRepositoryError>> {
    try {
      const state = session.getState();

      // If this is an idle/closing session, just store it
      if (state === 'IDLE') {
        this.sessionsMap.set(session.id, session);
        // Only update activeSession if it was this session
        if (this.activeSession?.id === session.id) {
          this.activeSession = null;
        }
        return { ok: true, value: session };
      }

      // If there's already an active session and it's not this one, error
      if (this.activeSession && this.activeSession.id !== session.id) {
        return {
          ok: false,
          error: new VoiceSessionRepositoryError(
            'Another voice session is already active',
            'ACTIVE_SESSION_EXISTS',
          ),
        };
      }

      // This becomes the active session
      this.activeSession = session;
      this.sessionsMap.set(session.id, session);

      return { ok: true, value: session };
    } catch (error) {
      return {
        ok: false,
        error: new VoiceSessionRepositoryError(
          'Failed to save voice session',
          'SAVE_FAILED',
          error,
        ),
      };
    }
  }

  /**
   * Find the active voice session
   */
  async findActive(): Promise<Result<VoiceSession | null, VoiceSessionRepositoryError>> {
    try {
      // Check if active session has timed out
      if (this.activeSession && this.activeSession.hasTimedOut()) {
        this.activeSession.close();
        this.activeSession = null;
      }

      return { ok: true, value: this.activeSession };
    } catch (error) {
      return {
        ok: false,
        error: new VoiceSessionRepositoryError(
          'Failed to find active session',
          'FIND_FAILED',
          error,
        ),
      };
    }
  }

  /**
   * Find a session by ID
   */
  async findById(
    sessionId: string,
  ): Promise<Result<VoiceSession | null, VoiceSessionRepositoryError>> {
    try {
      const session = this.sessionsMap.get(sessionId);
      return { ok: true, value: session || null };
    } catch (error) {
      return {
        ok: false,
        error: new VoiceSessionRepositoryError(
          'Failed to find session by ID',
          'FIND_BY_ID_FAILED',
          error,
        ),
      };
    }
  }

  /**
   * Delete a session by ID
   */
  async delete(sessionId: string): Promise<Result<void, VoiceSessionRepositoryError>> {
    try {
      if (this.activeSession?.id === sessionId) {
        this.activeSession = null;
      }
      this.sessionsMap.delete(sessionId);
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: new VoiceSessionRepositoryError(
          'Failed to delete session',
          'DELETE_FAILED',
          error,
        ),
      };
    }
  }

  /**
   * Get all sessions
   */
  async getAll(): Promise<Result<VoiceSession[], VoiceSessionRepositoryError>> {
    try {
      return { ok: true, value: Array.from(this.sessionsMap.values()) };
    } catch (error) {
      return {
        ok: false,
        error: new VoiceSessionRepositoryError(
          'Failed to get all sessions',
          'GET_ALL_FAILED',
          error,
        ),
      };
    }
  }

  /**
   * Clear all sessions
   */
  async clear(): Promise<Result<void, VoiceSessionRepositoryError>> {
    try {
      this.activeSession = null;
      this.sessionsMap.clear();
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: new VoiceSessionRepositoryError(
          'Failed to clear sessions',
          'CLEAR_FAILED',
          error,
        ),
      };
    }
  }
}
