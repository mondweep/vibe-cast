/**
 * Presence Service Interface
 *
 * Domain service for presence management.
 */

import type { UserPresence } from '../entities/user-presence';
import type { PresenceStatus } from '../value-objects/presence-status';
import type { DeviceType } from '../value-objects/device-type';

export interface ConnectionInfo {
  socketId: string;
  deviceType: DeviceType;
  userAgent?: string;
  ipAddress?: string;
}

export interface PresenceService {
  /**
   * Handle user connection
   */
  handleConnect(userId: string, connectionInfo: ConnectionInfo): Promise<UserPresence>;

  /**
   * Handle user disconnection
   */
  handleDisconnect(userId: string, socketId: string): Promise<UserPresence>;

  /**
   * Update user status
   */
  updateStatus(userId: string, status: PresenceStatus): Promise<UserPresence>;

  /**
   * Set custom status message
   */
  setCustomStatus(userId: string, customStatus: string | undefined): Promise<UserPresence>;

  /**
   * Get user presence
   */
  getPresence(userId: string): Promise<UserPresence | null>;

  /**
   * Get presence for multiple users
   */
  getPresences(userIds: string[]): Promise<Map<string, UserPresence>>;

  /**
   * Get online users in a room
   */
  getOnlineUsersInRoom(roomId: string): Promise<UserPresence[]>;

  /**
   * Handle heartbeat (keep-alive)
   */
  handleHeartbeat(userId: string, socketId: string): Promise<void>;

  /**
   * Subscribe user to room presence updates
   */
  subscribeToRoom(userId: string, roomId: string): Promise<void>;

  /**
   * Unsubscribe user from room presence updates
   */
  unsubscribeFromRoom(userId: string, roomId: string): Promise<void>;

  /**
   * Broadcast presence update to room members
   */
  broadcastToRoom(roomId: string, userId: string, event: string, data: unknown): Promise<void>;
}
