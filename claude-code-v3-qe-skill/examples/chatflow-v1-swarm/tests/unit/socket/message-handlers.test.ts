/**
 * Message Handlers Tests
 *
 * Tests for message send/receive functionality via Socket.io.
 * TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Socket } from 'socket.io';
import {
  registerMessageHandlers,
  MessageHandlerDependencies,
  MessageEvent,
} from '@/lib/socket/handlers/message';

describe('Message Handlers', () => {
  let mockSocket: Socket;
  let mockDependencies: MessageHandlerDependencies;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    eventHandlers = new Map();

    mockSocket = {
      id: 'socket-123',
      data: { userId: 'user-123', isAdmin: false },
      rooms: new Set(['room:room-123']),
      on: vi.fn((event, handler) => {
        eventHandlers.set(event, handler);
      }),
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as Socket;

    mockDependencies = {
      messageService: {
        createMessage: vi.fn().mockResolvedValue({
          id: 'msg-123',
          content: 'Hello, world!',
          roomId: 'room-123',
          senderId: 'user-123',
          type: 'text',
          createdAt: new Date(),
          reactions: [],
        }),
        editMessage: vi.fn().mockResolvedValue({
          id: 'msg-123',
          content: 'Updated content',
          roomId: 'room-123',
          senderId: 'user-123',
          type: 'text',
          createdAt: new Date(),
          editedAt: new Date(),
          reactions: [],
        }),
        deleteMessage: vi.fn().mockResolvedValue({
          id: 'msg-123',
          deletedAt: new Date(),
        }),
        addReaction: vi.fn().mockResolvedValue({
          id: 'msg-123',
          reactions: [{ emoji: 'thumbsup', userId: 'user-123', createdAt: new Date() }],
        }),
        removeReaction: vi.fn().mockResolvedValue({
          id: 'msg-123',
          reactions: [],
        }),
        getMessageById: vi.fn().mockResolvedValue({
          id: 'msg-123',
          content: 'Hello, world!',
          roomId: 'room-123',
          senderId: 'user-123',
        }),
      },
      roomService: {
        validateRoomAccess: vi.fn().mockResolvedValue(true),
        getRoomById: vi.fn().mockResolvedValue({
          id: 'room-123',
          name: 'Test Room',
          hasMember: vi.fn().mockReturnValue(true),
        }),
      },
      rateLimiter: {
        checkLimit: vi.fn().mockResolvedValue(true),
        getRemainingLimit: vi.fn().mockReturnValue(100),
      },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };
  });

  describe('registerMessageHandlers', () => {
    it('should register all message event handlers', () => {
      registerMessageHandlers(mockSocket, mockDependencies);

      expect(mockSocket.on).toHaveBeenCalledWith('message:send', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('message:edit', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('message:delete', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('message:react', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('message:unreact', expect.any(Function));
    });
  });

  describe('message:send', () => {
    beforeEach(() => {
      registerMessageHandlers(mockSocket, mockDependencies);
    });

    it('should send a message successfully', async () => {
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        { roomId: 'room-123', content: 'Hello, world!', type: 'text' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.objectContaining({
            id: 'msg-123',
          }),
        })
      );
    });

    it('should broadcast message to room members', async () => {
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        { roomId: 'room-123', content: 'Hello, world!', type: 'text' },
        callback
      );

      expect(mockSocket.to).toHaveBeenCalledWith('room:room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        MessageEvent.NEW_MESSAGE,
        expect.objectContaining({
          id: 'msg-123',
          content: 'Hello, world!',
        })
      );
    });

    it('should reject message when user not in room', async () => {
      mockDependencies.roomService.validateRoomAccess = vi.fn().mockResolvedValue(false);

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        { roomId: 'room-123', content: 'Hello, world!', type: 'text' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not authorized to send messages to this room',
        })
      );
    });

    it('should validate message content length', async () => {
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        { roomId: 'room-123', content: 'a'.repeat(10001), type: 'text' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message content exceeds maximum length',
        })
      );
    });

    it('should reject empty message content', async () => {
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        { roomId: 'room-123', content: '', type: 'text' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message content cannot be empty',
        })
      );
    });

    it('should apply rate limiting', async () => {
      mockDependencies.rateLimiter.checkLimit = vi.fn().mockResolvedValue(false);

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        { roomId: 'room-123', content: 'Hello!', type: 'text' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Rate limit exceeded',
        })
      );
    });

    it('should support message with reply', async () => {
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        {
          roomId: 'room-123',
          content: 'This is a reply',
          type: 'text',
          replyToId: 'msg-original',
        },
        callback
      );

      expect(mockDependencies.messageService.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          replyToId: 'msg-original',
        })
      );
    });

    it('should include client message ID in acknowledgment', async () => {
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        {
          roomId: 'room-123',
          content: 'Hello!',
          type: 'text',
          clientMessageId: 'client-123',
        },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          clientMessageId: 'client-123',
        })
      );
    });
  });

  describe('message:edit', () => {
    beforeEach(() => {
      registerMessageHandlers(mockSocket, mockDependencies);
    });

    it('should edit a message successfully', async () => {
      const handler = eventHandlers.get('message:edit')!;
      const callback = vi.fn();

      await handler(
        { messageId: 'msg-123', content: 'Updated content' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.objectContaining({
            content: 'Updated content',
          }),
        })
      );
    });

    it('should reject edit by non-author', async () => {
      mockDependencies.messageService.getMessageById = vi.fn().mockResolvedValue({
        id: 'msg-123',
        content: 'Original content',
        roomId: 'room-123',
        senderId: 'user-456', // Different user
      });

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:edit')!;
      const callback = vi.fn();

      await handler(
        { messageId: 'msg-123', content: 'Updated content' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not authorized to edit this message',
        })
      );
    });

    it('should broadcast edited message to room', async () => {
      const handler = eventHandlers.get('message:edit')!;
      const callback = vi.fn();

      await handler(
        { messageId: 'msg-123', content: 'Updated content' },
        callback
      );

      expect(mockSocket.to).toHaveBeenCalledWith('room:room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        MessageEvent.MESSAGE_EDITED,
        expect.objectContaining({
          content: 'Updated content',
        })
      );
    });

    it('should handle message not found error', async () => {
      mockDependencies.messageService.getMessageById = vi.fn().mockResolvedValue(null);

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:edit')!;
      const callback = vi.fn();

      await handler(
        { messageId: 'nonexistent-msg', content: 'Updated content' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message not found',
        })
      );
    });
  });

  describe('message:delete', () => {
    beforeEach(() => {
      registerMessageHandlers(mockSocket, mockDependencies);
    });

    it('should delete a message successfully', async () => {
      const handler = eventHandlers.get('message:delete')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should reject delete by non-author/non-admin', async () => {
      mockDependencies.messageService.getMessageById = vi.fn().mockResolvedValue({
        id: 'msg-123',
        content: 'Original content',
        roomId: 'room-123',
        senderId: 'user-456', // Different user
      });

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:delete')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Not authorized to delete this message',
        })
      );
    });

    it('should broadcast message deletion to room', async () => {
      const handler = eventHandlers.get('message:delete')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123' }, callback);

      expect(mockSocket.to).toHaveBeenCalledWith('room:room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        MessageEvent.MESSAGE_DELETED,
        expect.objectContaining({
          messageId: 'msg-123',
        })
      );
    });
  });

  describe('message:react', () => {
    beforeEach(() => {
      registerMessageHandlers(mockSocket, mockDependencies);
    });

    it('should add reaction to message successfully', async () => {
      const handler = eventHandlers.get('message:react')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123', emoji: 'thumbsup' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          reactions: expect.arrayContaining([
            expect.objectContaining({ emoji: 'thumbsup' }),
          ]),
        })
      );
    });

    it('should broadcast reaction to room', async () => {
      const handler = eventHandlers.get('message:react')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123', emoji: 'thumbsup' }, callback);

      expect(mockSocket.to).toHaveBeenCalledWith('room:room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        MessageEvent.REACTION_ADDED,
        expect.objectContaining({
          messageId: 'msg-123',
          emoji: 'thumbsup',
        })
      );
    });
  });

  describe('message:unreact', () => {
    beforeEach(() => {
      registerMessageHandlers(mockSocket, mockDependencies);
    });

    it('should remove reaction from message successfully', async () => {
      const handler = eventHandlers.get('message:unreact')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123', emoji: 'thumbsup' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should broadcast reaction removal to room', async () => {
      const handler = eventHandlers.get('message:unreact')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123', emoji: 'thumbsup' }, callback);

      expect(mockSocket.to).toHaveBeenCalledWith('room:room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        MessageEvent.REACTION_REMOVED,
        expect.objectContaining({
          messageId: 'msg-123',
          emoji: 'thumbsup',
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      registerMessageHandlers(mockSocket, mockDependencies);
    });

    it('should handle service errors gracefully', async () => {
      mockDependencies.messageService.createMessage = vi.fn().mockRejectedValue(
        new Error('Database error')
      );

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        { roomId: 'room-123', content: 'Hello!', type: 'text' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to send message',
        })
      );
      expect(mockDependencies.logger.error).toHaveBeenCalled();
    });

    it('should handle edit service errors gracefully', async () => {
      mockDependencies.messageService.editMessage = vi.fn().mockRejectedValue(
        new Error('Database error')
      );

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:edit')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123', content: 'Updated' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to edit message',
        })
      );
      expect(mockDependencies.logger.error).toHaveBeenCalled();
    });

    it('should handle delete service errors gracefully', async () => {
      mockDependencies.messageService.deleteMessage = vi.fn().mockRejectedValue(
        new Error('Database error')
      );

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:delete')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to delete message',
        })
      );
      expect(mockDependencies.logger.error).toHaveBeenCalled();
    });

    it('should handle reaction add service errors gracefully', async () => {
      mockDependencies.messageService.addReaction = vi.fn().mockRejectedValue(
        new Error('Database error')
      );

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:react')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123', emoji: 'thumbsup' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to add reaction',
        })
      );
      expect(mockDependencies.logger.error).toHaveBeenCalled();
    });

    it('should handle reaction remove service errors gracefully', async () => {
      mockDependencies.messageService.removeReaction = vi.fn().mockRejectedValue(
        new Error('Database error')
      );

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:unreact')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123', emoji: 'thumbsup' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to remove reaction',
        })
      );
      expect(mockDependencies.logger.error).toHaveBeenCalled();
    });

    it('should handle message not found on delete', async () => {
      mockDependencies.messageService.getMessageById = vi.fn().mockResolvedValue(null);

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:delete')!;
      const callback = vi.fn();

      await handler({ messageId: 'nonexistent' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message not found',
        })
      );
    });

    it('should handle message not found on react', async () => {
      mockDependencies.messageService.getMessageById = vi.fn().mockResolvedValue(null);

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:react')!;
      const callback = vi.fn();

      await handler({ messageId: 'nonexistent', emoji: 'thumbsup' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message not found',
        })
      );
    });

    it('should handle message not found on unreact', async () => {
      mockDependencies.messageService.getMessageById = vi.fn().mockResolvedValue(null);

      registerMessageHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('message:unreact')!;
      const callback = vi.fn();

      await handler({ messageId: 'nonexistent', emoji: 'thumbsup' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message not found',
        })
      );
    });
  });

  describe('Content Validation', () => {
    beforeEach(() => {
      registerMessageHandlers(mockSocket, mockDependencies);
    });

    it('should reject whitespace-only message content', async () => {
      const handler = eventHandlers.get('message:send')!;
      const callback = vi.fn();

      await handler(
        { roomId: 'room-123', content: '   ', type: 'text' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message content cannot be empty',
        })
      );
    });

    it('should reject whitespace-only edit content', async () => {
      const handler = eventHandlers.get('message:edit')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123', content: '   ' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message content cannot be empty',
        })
      );
    });

    it('should reject edit exceeding max length', async () => {
      const handler = eventHandlers.get('message:edit')!;
      const callback = vi.fn();

      await handler(
        { messageId: 'msg-123', content: 'a'.repeat(10001) },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message content exceeds maximum length',
        })
      );
    });
  });

  describe('Admin Permissions', () => {
    it('should allow admin to delete any message', async () => {
      mockDependencies.messageService.getMessageById = vi.fn().mockResolvedValue({
        id: 'msg-123',
        content: 'Original content',
        roomId: 'room-123',
        senderId: 'user-456', // Different user
      });

      // Create admin socket
      const adminSocket = {
        id: 'socket-123',
        data: { userId: 'user-123', isAdmin: true },
        on: vi.fn((event: string, handler: Function) => {
          eventHandlers.set(event, handler);
        }),
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
        rooms: new Set(['room:room-123']),
      } as unknown as Socket;

      registerMessageHandlers(adminSocket, mockDependencies);
      const handler = eventHandlers.get('message:delete')!;
      const callback = vi.fn();

      await handler({ messageId: 'msg-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });
});
