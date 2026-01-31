/**
 * Room Repository Interface
 *
 * Defines the contract for room persistence.
 * Implementation will be in the infrastructure layer.
 */

import type { Room, RoomType } from '../entities/room';
import type { RoomId } from '../value-objects/room-id';

export interface RoomRepository {
  /**
   * Find a room by its unique identifier
   */
  findById(id: RoomId): Promise<Room | null>;

  /**
   * Find all rooms for a user
   */
  findByUserId(userId: string): Promise<Room[]>;

  /**
   * Find a direct room between two users
   */
  findDirectRoom(userId1: string, userId2: string): Promise<Room | null>;

  /**
   * Find rooms by type
   */
  findByType(type: RoomType, limit?: number): Promise<Room[]>;

  /**
   * Search rooms by name
   */
  searchByName(query: string, userId: string, limit?: number): Promise<Room[]>;

  /**
   * Save a new room
   */
  save(room: Room): Promise<void>;

  /**
   * Update an existing room
   */
  update(room: Room): Promise<void>;

  /**
   * Delete a room
   */
  delete(id: RoomId): Promise<void>;

  /**
   * Check if user is member of room
   */
  isMember(roomId: RoomId, userId: string): Promise<boolean>;

  /**
   * Get room member count
   */
  getMemberCount(roomId: RoomId): Promise<number>;

  /**
   * Get rooms with unread messages for user
   */
  findWithUnreadMessages(userId: string): Promise<Room[]>;
}
