/**
 * Session Repository Interface
 *
 * Defines the contract for session persistence.
 * Implementation will be in the infrastructure layer.
 */

import type { Session } from '../entities/session';
import type { UserId } from '../value-objects/user-id';
import type { SessionToken } from '../value-objects/session-token';

export interface SessionRepository {
  /**
   * Find a session by its token
   */
  findByToken(token: SessionToken): Promise<Session | null>;

  /**
   * Find all sessions for a user
   */
  findByUserId(userId: UserId): Promise<Session[]>;

  /**
   * Find active (non-expired) sessions for a user
   */
  findActiveByUserId(userId: UserId): Promise<Session[]>;

  /**
   * Save a new session
   */
  save(session: Session): Promise<void>;

  /**
   * Delete a session (logout)
   */
  delete(token: SessionToken): Promise<void>;

  /**
   * Delete all sessions for a user (logout everywhere)
   */
  deleteAllForUser(userId: UserId): Promise<void>;

  /**
   * Delete expired sessions (cleanup job)
   */
  deleteExpired(): Promise<number>;

  /**
   * Count active sessions for a user
   */
  countActiveByUserId(userId: UserId): Promise<number>;
}
