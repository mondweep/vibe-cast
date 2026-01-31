/**
 * Presence Repository Interface
 *
 * Defines the contract for presence persistence (Redis-backed).
 * Implementation will use Redis for ephemeral presence data.
 */

import type { UserPresence } from '../entities/user-presence';
import type { TypingIndicator } from '../entities/typing-indicator';
import type { PresenceStatus } from '../value-objects/presence-status';

export interface PresenceRepository {
  /**
   * Get user presence by ID
   */
  getPresence(userId: string): Promise<UserPresence | null>;

  /**
   * Get presence for multiple users
   */
  getPresences(userIds: string[]): Promise<Map<string, UserPresence>>;

  /**
   * Update user presence
   */
  setPresence(presence: UserPresence): Promise<void>;

  /**
   * Update user status only
   */
  setStatus(userId: string, status: PresenceStatus): Promise<void>;

  /**
   * Add a connection for user
   */
  addConnection(userId: string, socketId: string, deviceType: string): Promise<void>;

  /**
   * Remove a connection for user
   */
  removeConnection(userId: string, socketId: string): Promise<void>;

  /**
   * Get all connections for user
   */
  getConnectionCount(userId: string): Promise<number>;

  /**
   * Update last seen timestamp
   */
  updateLastSeen(userId: string): Promise<void>;

  /**
   * Get online user IDs in a room
   */
  getOnlineUsersInRoom(roomId: string): Promise<string[]>;

  /**
   * Add user to room's online set
   */
  addUserToRoom(roomId: string, userId: string): Promise<void>;

  /**
   * Remove user from room's online set
   */
  removeUserFromRoom(roomId: string, userId: string): Promise<void>;

  /**
   * Set typing indicator
   */
  setTyping(indicator: TypingIndicator): Promise<void>;

  /**
   * Remove typing indicator
   */
  removeTyping(userId: string, roomId: string): Promise<void>;

  /**
   * Get users currently typing in a room
   */
  getTypingUsers(roomId: string): Promise<string[]>;

  /**
   * Heartbeat - refresh TTL for user presence
   */
  heartbeat(userId: string): Promise<void>;
}
