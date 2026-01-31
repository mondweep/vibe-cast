/**
 * Message Repository Interface
 *
 * Defines the contract for message persistence.
 * Implementation will be in the infrastructure layer.
 */

import type { Message } from '../entities/message';
import type { MessageId } from '../value-objects/message-id';
import type { RoomId } from '../value-objects/room-id';

export interface PaginationOptions {
  limit: number;
  cursor?: string; // Message ID for cursor-based pagination
  direction?: 'before' | 'after';
}

export interface MessageSearchOptions {
  query: string;
  roomId?: string;
  senderId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface MessageRepository {
  /**
   * Find a message by its unique identifier
   */
  findById(id: MessageId): Promise<Message | null>;

  /**
   * Find messages in a room with pagination
   */
  findByRoomId(roomId: RoomId, options: PaginationOptions): Promise<Message[]>;

  /**
   * Find thread replies
   */
  findThreadReplies(threadId: MessageId, options: PaginationOptions): Promise<Message[]>;

  /**
   * Find messages by sender
   */
  findBySenderId(senderId: string, options: PaginationOptions): Promise<Message[]>;

  /**
   * Search messages
   */
  search(options: MessageSearchOptions): Promise<Message[]>;

  /**
   * Find pinned messages in a room
   */
  findPinnedByRoomId(roomId: RoomId): Promise<Message[]>;

  /**
   * Save a new message
   */
  save(message: Message): Promise<void>;

  /**
   * Update an existing message
   */
  update(message: Message): Promise<void>;

  /**
   * Soft delete a message
   */
  delete(id: MessageId): Promise<void>;

  /**
   * Count messages in a room
   */
  countByRoomId(roomId: RoomId): Promise<number>;

  /**
   * Count unread messages for user in room
   */
  countUnreadByRoomId(roomId: RoomId, userId: string, lastReadAt: Date): Promise<number>;

  /**
   * Get latest message in room
   */
  findLatestByRoomId(roomId: RoomId): Promise<Message | null>;
}
