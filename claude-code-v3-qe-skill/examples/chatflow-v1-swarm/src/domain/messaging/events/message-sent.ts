/**
 * MessageSent Domain Event
 *
 * Emitted when a new message is sent to a room.
 */

import type { MessageType } from '../entities/message';

export interface MessageSentEvent {
  type: 'MessageSent';
  payload: {
    messageId: string;
    roomId: string;
    senderId: string;
    content: string;
    messageType: MessageType;
    mentions: string[];
    hasAttachments: boolean;
    threadId?: string;
    replyToId?: string;
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

export function createMessageSentEvent(params: {
  messageId: string;
  roomId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  mentions: string[];
  hasAttachments: boolean;
  threadId?: string;
  replyToId?: string;
  correlationId: string;
}): MessageSentEvent {
  return {
    type: 'MessageSent',
    payload: {
      messageId: params.messageId,
      roomId: params.roomId,
      senderId: params.senderId,
      content: params.content,
      messageType: params.messageType,
      mentions: params.mentions,
      hasAttachments: params.hasAttachments,
      threadId: params.threadId,
      replyToId: params.replyToId,
    },
    metadata: {
      timestamp: new Date(),
      correlationId: params.correlationId,
    },
  };
}
