/**
 * Room Handlers Tests
 *
 * Tests for room join/leave functionality via Socket.io.
 * TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Socket } from 'socket.io';
import {
  registerRoomHandlers,
  RoomHandlerDependencies,
  RoomEvent,
} from '@/lib/socket/handlers/room';

describe('Room Handlers', () => {
  let mockSocket: Socket;
  let mockDependencies: RoomHandlerDependencies;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    eventHandlers = new Map();

    mockSocket = {
      id: 'socket-123',
      data: { userId: 'user-123' },
      rooms: new Set(),
      on: vi.fn((event, handler) => {
        eventHandlers.set(event, handler);
      }),
      join: vi.fn(),
      leave: vi.fn(),
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    } as unknown as Socket;

    mockDependencies = {
      roomService: {
        getRoomById: vi.fn().mockResolvedValue({
          id: 'room-123',
          name: 'Test Room',
          hasMember: vi.fn().mockReturnValue(true),
          members: [{ userId: 'user-123' }],
        }),
        validateRoomAccess: vi.fn().mockResolvedValue(true),
        getMemberIds: vi.fn().mockResolvedValue(['user-123', 'user-456']),
      },
      presenceService: {
        markUserInRoom: vi.fn().mockResolvedValue(undefined),
        removeUserFromRoom: vi.fn().mockResolvedValue(undefined),
        getRoomMembers: vi.fn().mockResolvedValue([
          { userId: 'user-456', status: 'online' },
        ]),
      },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };
  });

  describe('registerRoomHandlers', () => {
    it('should register all room event handlers', () => {
      registerRoomHandlers(mockSocket, mockDependencies);

      expect(mockSocket.on).toHaveBeenCalledWith('room:join', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('room:leave', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('room:list', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('room:join', () => {
    beforeEach(() => {
      registerRoomHandlers(mockSocket, mockDependencies);
    });

    it('should join a room successfully', async () => {
      const handler = eventHandlers.get('room:join')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          roomId: 'room-123',
        })
      );
      expect(mockSocket.join).toHaveBeenCalledWith('room:room-123');
    });

    it('should reject join when user is not a room member', async () => {
      mockDependencies.roomService.getRoomById = vi.fn().mockResolvedValue({
        id: 'room-123',
        name: 'Test Room',
        hasMember: vi.fn().mockReturnValue(false),
      });

      registerRoomHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('room:join')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Access denied',
        })
      );
    });

    it('should broadcast user:joined event to room members', async () => {
      const handler = eventHandlers.get('room:join')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(mockSocket.to).toHaveBeenCalledWith('room:room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        RoomEvent.USER_JOINED,
        expect.objectContaining({
          userId: 'user-123',
          roomId: 'room-123',
        })
      );
    });

    it('should return room members when joining', async () => {
      const handler = eventHandlers.get('room:join')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          members: expect.arrayContaining([
            expect.objectContaining({ userId: 'user-456' }),
          ]),
        })
      );
    });

    it('should handle invalid roomId', async () => {
      const handler = eventHandlers.get('room:join')!;
      const callback = vi.fn();

      await handler({ roomId: '' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid roomId',
        })
      );
    });

    it('should handle room not found', async () => {
      mockDependencies.roomService.getRoomById = vi.fn().mockResolvedValue(null);

      registerRoomHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('room:join')!;
      const callback = vi.fn();

      await handler({ roomId: 'nonexistent-room' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Room not found',
        })
      );
    });

    it('should track join timestamp', async () => {
      const handler = eventHandlers.get('room:join')!;
      const callback = vi.fn();
      const beforeJoin = Date.now();

      await handler({ roomId: 'room-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          joinedAt: expect.any(String),
        })
      );

      const response = callback.mock.calls[0]?.[0];
      expect(new Date(response.joinedAt).getTime()).toBeGreaterThanOrEqual(beforeJoin);
    });
  });

  describe('room:leave', () => {
    beforeEach(async () => {
      registerRoomHandlers(mockSocket, mockDependencies);
      // First join the room
      const joinHandler = eventHandlers.get('room:join')!;
      await joinHandler({ roomId: 'room-123' }, vi.fn());
    });

    it('should leave a room successfully', async () => {
      const handler = eventHandlers.get('room:leave')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
      expect(mockSocket.leave).toHaveBeenCalledWith('room:room-123');
    });

    it('should broadcast user:left event to room members', async () => {
      const handler = eventHandlers.get('room:leave')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(mockSocket.to).toHaveBeenCalledWith('room:room-123');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        RoomEvent.USER_LEFT,
        expect.objectContaining({
          userId: 'user-123',
          roomId: 'room-123',
        })
      );
    });

    it('should update presence service on leave', async () => {
      const handler = eventHandlers.get('room:leave')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(mockDependencies.presenceService.removeUserFromRoom).toHaveBeenCalledWith(
        'user-123',
        'room-123'
      );
    });
  });

  describe('room:list', () => {
    beforeEach(async () => {
      registerRoomHandlers(mockSocket, mockDependencies);
      // Join a room first
      const joinHandler = eventHandlers.get('room:join')!;
      await joinHandler({ roomId: 'room-123' }, vi.fn());
    });

    it('should list rooms user has joined', async () => {
      mockSocket.rooms = new Set(['socket-123', 'room:room-123']);

      const handler = eventHandlers.get('room:list')!;
      const callback = vi.fn();

      await handler({}, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          rooms: expect.arrayContaining(['room:room-123']),
        })
      );
    });
  });

  describe('Disconnect Handling', () => {
    it('should leave all rooms on disconnect', async () => {
      registerRoomHandlers(mockSocket, mockDependencies);

      // Join rooms
      const joinHandler = eventHandlers.get('room:join')!;
      await joinHandler({ roomId: 'room-123' }, vi.fn());

      // Trigger disconnect
      const disconnectHandler = eventHandlers.get('disconnect')!;
      await disconnectHandler();

      expect(mockDependencies.presenceService.removeUserFromRoom).toHaveBeenCalled();
      expect(mockDependencies.logger.info).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      registerRoomHandlers(mockSocket, mockDependencies);
    });

    it('should handle room service errors gracefully', async () => {
      mockDependencies.roomService.getRoomById = vi.fn().mockRejectedValue(
        new Error('Database error')
      );

      registerRoomHandlers(mockSocket, mockDependencies);
      const handler = eventHandlers.get('room:join')!;
      const callback = vi.fn();

      await handler({ roomId: 'room-123' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal server error',
        })
      );
      expect(mockDependencies.logger.error).toHaveBeenCalled();
    });

    it('should validate payload schema', async () => {
      const handler = eventHandlers.get('room:join')!;
      const callback = vi.fn();

      await handler({ extraField: 'ignored' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid roomId',
        })
      );
    });
  });
});
