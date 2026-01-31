/**
 * Message Service Interface
 *
 * Domain service for message operations.
 */

import type { Message, MessageType, MessageMetadata } from '../entities/message';
import type { Reaction } from '../entities/reaction';

export interface SendMessageInput {
  roomId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  metadata?: MessageMetadata;
  replyToId?: string;
  threadId?: string;
}

export interface MessageOperationResult {
  success: boolean;
  message?: Message;
  error?: string;
}

export interface MessageService {
  /**
   * Send a new message
   */
  sendMessage(input: SendMessageInput): Promise<MessageOperationResult>;

  /**
   * Edit a message
   */
  editMessage(
    messageId: string,
    newContent: string,
    editorId: string
  ): Promise<MessageOperationResult>;

  /**
   * Delete a message
   */
  deleteMessage(
    messageId: string,
    deletedById: string,
    isAdmin?: boolean
  ): Promise<MessageOperationResult>;

  /**
   * Add reaction to message
   */
  addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<MessageOperationResult>;

  /**
   * Remove reaction from message
   */
  removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<MessageOperationResult>;

  /**
   * Pin a message
   */
  pinMessage(
    messageId: string,
    pinnedById: string
  ): Promise<MessageOperationResult>;

  /**
   * Unpin a message
   */
  unpinMessage(
    messageId: string,
    unpinnedById: string
  ): Promise<MessageOperationResult>;

  /**
   * Get message history for a room
   */
  getMessageHistory(
    roomId: string,
    userId: string,
    options: {
      limit?: number;
      before?: string;
      after?: string;
    }
  ): Promise<Message[]>;

  /**
   * Get thread messages
   */
  getThreadMessages(
    threadId: string,
    userId: string,
    options: {
      limit?: number;
      before?: string;
    }
  ): Promise<Message[]>;

  /**
   * Search messages
   */
  searchMessages(
    userId: string,
    query: string,
    options?: {
      roomId?: string;
      limit?: number;
    }
  ): Promise<Message[]>;

  /**
   * Mark messages as read
   */
  markAsRead(roomId: string, userId: string): Promise<void>;

  /**
   * Get unread count for user in room
   */
  getUnreadCount(roomId: string, userId: string): Promise<number>;
}
