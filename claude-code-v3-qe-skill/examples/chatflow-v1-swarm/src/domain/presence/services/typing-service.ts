/**
 * Typing Service Interface
 *
 * Domain service for typing indicator management.
 */

import type { TypingIndicator } from '../entities/typing-indicator';

export interface TypingService {
  /**
   * Start typing indicator for user in room
   */
  startTyping(userId: string, roomId: string): Promise<void>;

  /**
   * Stop typing indicator for user in room
   */
  stopTyping(userId: string, roomId: string): Promise<void>;

  /**
   * Get all users currently typing in a room
   */
  getTypingUsers(roomId: string): Promise<TypingIndicator[]>;

  /**
   * Clear expired typing indicators
   */
  clearExpired(): Promise<number>;

  /**
   * Check if user is typing in room
   */
  isTyping(userId: string, roomId: string): Promise<boolean>;

  /**
   * Broadcast typing update to room
   */
  broadcastTypingUpdate(roomId: string, userId: string, isTyping: boolean): Promise<void>;
}
