/**
 * Presence Handlers Tests
 *
 * Tests for typing indicators and presence functionality via Socket.io.
 * TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Socket } from 'socket.io';
import {
  registerPresenceHandlers,
  PresenceHandlerDependencies,
  PresenceEvent,
} from '@/lib/socket/handlers/presence';

describe('Presence Handlers', () => {
  let mockSocket: Socket;
  let mockDependencies: PresenceHandlerDependencies;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    eventHandlers = new Map();

    mockSocket = {
      id: 'socket-123',
      data: { userId: 'user-123' },
      rooms: new Set(['room:room-123']),
      on: vi.fn((event, handler) => {
        eventHandlers.set(event, handler);
      }),
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as Socket;

    mockDependencies = {
      presenceService: {
        setUserOnline: vi.fn().mockResolvedValue(undefined),
        setUserOffline: vi.fn().mockResolvedValue(undefined),
        setUserAway: vi.fn().mockResolvedValue(undefined),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        getOnlineUsers: vi.fn().mockResolvedValue([
          { userId: 'user-123', status: 'online' },
          { userId: 'user-456', status: 'online' },
        ]),
        getUserPresence: vi.fn().mockResolvedValue({
          userId: 'user-123',
          status: 'online',
          lastSeenAt: new Date(),
        }),
        heartbeat: vi.fn().mockResolvedValue(undefined),
      },
      typingService: {
        startTyping: vi.fn().mockResolvedValue(undefined),
        stopTyping: vi.fn().mockResolvedValue(undefined),
        getTypingUsers: vi.fn().mockResolvedValue(['user-456']),
        isUserTyping: vi.fn().mockResolvedValue(false),
      },
      redis: {
        setex: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        get: vi.fn().mockResolvedValue(null),
        publish: vi.fn().mockResolvedValue(1),
      },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };
  });

  describe('registerPresenceHandlers', () => {
    it('should register all presence event handlers', () => {
      registerPresenceHandlers(mockSocket, mockDependencies);

      expect(mockSocket.on).toHaveBeenCalledWith('presence:typing:start', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('presence:typing:stop', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('presence:status:update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('presence:heartbeat', expect.any(Function));
    });

    it('should mark user online on registration', async () => {
      registerPresenceHandlers(mockSocket, mockDependencies);

      // Allow the async setUserOnline to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockDependencies.presenceService.setUserOnline).toHaveBeenCalledWith('user-123');
    });
  });

  describe('typing:start', () => {
    beforeEach(() => {
      registerPresenceHandlers(mockSocket, mockDependencies);
    });

    it('should emit typing indicator to room', async () => {
      const handler = eventHandlers.get('presence:typing:start')!;

      await handler({ roomId: 'room-123' });

      expect(mockSocket.to).toHaveBeenCalledWith('room:room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        PresenceEvent.TYPING_START,
        expect.objectContaining({
          userId: 'user-123',
          roomId: 'room-123',
        })
      );
    });

    it('should store typing state', async () => {
      const handler = eventHandlers.get('presence:typing:start')!;

      await handler({ roomId: 'room-123' });

      expect(mockDependencies.typingService.startTyping).toHaveBeenCalledWith(
        'user-123',
        'room-123'
      );
    });

    it('should validate roomId is present', async () => {
      const handler = eventHandlers.get('presence:typing:start')!;

      await handler({}); // Missing roomId

      expect(mockDependencies.typingService.startTyping).not.toHaveBeenCalled();
    });

    it('should throttle rapid typing events', async () => {
      const handler = eventHandlers.get('presence:typing:start')!;

      // Rapid fire typing events
      await handler({ roomId: 'room-123' });
      await handler({ roomId: 'room-123' });
      await handler({ roomId: 'room-123' });

      // Should only emit once due to throttle
      expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('typing:stop', () => {
    beforeEach(() => {
      registerPresenceHandlers(mockSocket, mockDependencies);
    });

    it('should clear typing indicator', async () => {
      const handler = eventHandlers.get('presence:typing:stop')!;

      await handler({ roomId: 'room-123' });

      expect(mockSocket.to).toHaveBeenCalledWith('room:room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        PresenceEvent.TYPING_STOP,
        expect.objectContaining({
          userId: 'user-123',
          roomId: 'room-123',
        })
      );
      expect(mockDependencies.typingService.stopTyping).toHaveBeenCalledWith(
        'user-123',
        'room-123'
      );
    });
  });

  describe('status:update', () => {
    beforeEach(() => {
      registerPresenceHandlers(mockSocket, mockDependencies);
    });

    it('should update user status to online', async () => {
      const handler = eventHandlers.get('presence:status:update')!;
      const callback = vi.fn();

      await handler({ status: 'online' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
      expect(mockDependencies.presenceService.updateStatus).toHaveBeenCalledWith(
        'user-123',
        'online',
        undefined
      );
    });

    it('should update user status to away', async () => {
      const handler = eventHandlers.get('presence:status:update')!;
      const callback = vi.fn();

      await handler({ status: 'away' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should update user status to do_not_disturb', async () => {
      const handler = eventHandlers.get('presence:status:update')!;
      const callback = vi.fn();

      await handler({ status: 'do_not_disturb' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should support custom status message', async () => {
      const handler = eventHandlers.get('presence:status:update')!;
      const callback = vi.fn();

      await handler({ status: 'online', customMessage: 'In a meeting' }, callback);

      expect(mockDependencies.presenceService.updateStatus).toHaveBeenCalledWith(
        'user-123',
        'online',
        'In a meeting'
      );
    });

    it('should reject invalid status', async () => {
      const handler = eventHandlers.get('presence:status:update')!;
      const callback = vi.fn();

      await handler({ status: 'invalid_status' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid status',
        })
      );
    });

    it('should broadcast status change via Redis', async () => {
      const handler = eventHandlers.get('presence:status:update')!;
      const callback = vi.fn();

      await handler({ status: 'away' }, callback);

      expect(mockDependencies.redis.publish).toHaveBeenCalled();
    });
  });

  describe('heartbeat', () => {
    beforeEach(() => {
      registerPresenceHandlers(mockSocket, mockDependencies);
    });

    it('should extend presence TTL', async () => {
      const handler = eventHandlers.get('presence:heartbeat')!;
      const callback = vi.fn();

      await handler(callback);

      expect(mockDependencies.presenceService.heartbeat).toHaveBeenCalledWith('user-123');
    });

    it('should return server timestamp', async () => {
      const handler = eventHandlers.get('presence:heartbeat')!;
      const callback = vi.fn();
      const beforeHeartbeat = Date.now();

      await handler(callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          serverTime: expect.any(Number),
        })
      );

      const response = callback.mock.calls[0]?.[0];
      expect(response.serverTime).toBeGreaterThanOrEqual(beforeHeartbeat);
    });
  });

  describe('Connection Events', () => {
    it('should mark user offline on disconnect', async () => {
      registerPresenceHandlers(mockSocket, mockDependencies);

      const disconnectHandler = eventHandlers.get('disconnect')!;
      await disconnectHandler();

      expect(mockDependencies.presenceService.setUserOffline).toHaveBeenCalledWith('user-123');
    });

    it('should clear typing indicators on disconnect', async () => {
      registerPresenceHandlers(mockSocket, mockDependencies);

      // Start typing first
      const typingStartHandler = eventHandlers.get('presence:typing:start')!;
      await typingStartHandler({ roomId: 'room-123' });

      // Then disconnect
      const disconnectHandler = eventHandlers.get('disconnect')!;
      await disconnectHandler();

      expect(mockDependencies.typingService.stopTyping).toHaveBeenCalled();
    });
  });

  describe('Room Presence', () => {
    beforeEach(() => {
      registerPresenceHandlers(mockSocket, mockDependencies);
    });

    it('should get online members in room', async () => {
      const handler = eventHandlers.get('presence:room:members')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          users: expect.any(Array),
        })
      );
    });

    it('should get typing users in room', async () => {
      mockDependencies.typingService.getTypingUsers = vi.fn().mockResolvedValue(['user-456', 'user-789']);

      const handler = eventHandlers.get('presence:room:typing')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          typing: expect.arrayContaining(['user-456', 'user-789']),
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      registerPresenceHandlers(mockSocket, mockDependencies);
    });

    it('should handle presence service errors gracefully', async () => {
      mockDependencies.presenceService.updateStatus = vi.fn().mockRejectedValue(
        new Error('Redis error')
      );

      registerPresenceHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('presence:status:update')!;
      const callback = vi.fn();

      await handler({ status: 'online' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to update status',
        })
      );
      expect(mockDependencies.logger.error).toHaveBeenCalled();
    });
  });
});
