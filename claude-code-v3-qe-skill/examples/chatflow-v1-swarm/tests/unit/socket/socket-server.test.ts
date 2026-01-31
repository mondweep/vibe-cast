/**
 * Socket Server Tests
 *
 * Tests for Socket.io server initialization, configuration, and lifecycle.
 * TDD approach: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import {
  createSocketServer,
  configureSocketServer,
  shutdownSocketServer,
  getSocketServer,
  SocketServerState,
} from '@/lib/socket/server';

// Mock ioredis
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn().mockReturnThis(),
    status: 'ready',
  })),
}));

describe('Socket Server', () => {
  let httpServer: ReturnType<typeof createServer>;

  beforeEach(() => {
    httpServer = createServer();
  });

  afterEach(async () => {
    await shutdownSocketServer();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  describe('createSocketServer', () => {
    it('should create a Socket.io server instance', () => {
      const io = createSocketServer(httpServer);

      expect(io).toBeDefined();
      expect(io).toBeInstanceOf(SocketIOServer);
    });

    it('should create server with default configuration', () => {
      const io = createSocketServer(httpServer);

      expect(io.engine.opts).toBeDefined();
    });

    it('should throw error if server already exists', () => {
      createSocketServer(httpServer);

      expect(() => createSocketServer(httpServer)).toThrow(
        'Socket server already initialized'
      );
    });

    it('should configure namespaces for messaging and presence', async () => {
      const io = createSocketServer(httpServer);

      const messagingNamespace = io.of('/messaging');
      const presenceNamespace = io.of('/presence');

      expect(messagingNamespace).toBeDefined();
      expect(presenceNamespace).toBeDefined();
    });
  });

  describe('configureSocketServer', () => {
    it('should apply custom configuration', () => {
      const io = createSocketServer(httpServer, {
        pingInterval: 25000,
        pingTimeout: 10000,
      });

      expect(io.engine.opts.pingInterval).toBe(25000);
      expect(io.engine.opts.pingTimeout).toBe(10000);
    });

    it('should set up connection middleware', async () => {
      const io = createSocketServer(httpServer);
      const authMiddleware = vi.fn((socket, next) => next());

      configureSocketServer(io, { authMiddleware });

      // Middleware should be registered but not called until connection
      expect(authMiddleware).not.toHaveBeenCalled();
    });

    it('should configure error handling', () => {
      const io = createSocketServer(httpServer);
      const errorHandler = vi.fn();

      configureSocketServer(io, { errorHandler });

      // Verify error handler is registered
      expect(io.engine.listeners('connection_error').length).toBeGreaterThan(0);
    });
  });

  describe('shutdownSocketServer', () => {
    it('should gracefully shut down the server', async () => {
      createSocketServer(httpServer);

      await shutdownSocketServer();

      expect(getSocketServer()).toBeNull();
    });

    it('should handle shutdown when server not initialized', async () => {
      // Should not throw
      await expect(shutdownSocketServer()).resolves.toBeUndefined();
    });
  });

  describe('getSocketServer', () => {
    it('should return null when server not initialized', () => {
      expect(getSocketServer()).toBeNull();
    });

    it('should return server instance when initialized', () => {
      createSocketServer(httpServer);

      const io = getSocketServer();

      expect(io).toBeInstanceOf(SocketIOServer);
    });
  });

  describe('SocketServerState', () => {
    it('should report correct server state', () => {
      const io = createSocketServer(httpServer);

      const state = SocketServerState.getState(io);

      expect(state.isRunning).toBe(true);
      expect(state.connectedClients).toBe(0);
      expect(state.namespaces).toContain('/messaging');
      expect(state.namespaces).toContain('/presence');
    });

    it('should return connected client count', () => {
      const io = createSocketServer(httpServer);

      const count = SocketServerState.getConnectedCount(io);

      expect(count).toBe(0);
    });

    it('should return connected socket IDs', async () => {
      const io = createSocketServer(httpServer);

      const socketIds = await SocketServerState.getConnectedSocketIds(io);

      expect(socketIds).toEqual([]);
    });
  });

  describe('Server Configuration Options', () => {
    it('should support custom CORS configuration', () => {
      const io = createSocketServer(httpServer, {
        cors: {
          origin: 'http://example.com',
          methods: ['GET', 'POST'],
          credentials: true,
        },
      });

      expect(io).toBeDefined();
    });

    it('should support custom transport options', () => {
      const io = createSocketServer(httpServer, {
        transports: ['websocket'],
      });

      expect(io).toBeDefined();
    });

    it('should support connection timeout configuration', () => {
      const io = createSocketServer(httpServer, {
        connectTimeout: 60000,
      });

      expect(io).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    it('should get room name with getRoomName', async () => {
      const { getRoomName } = await import('@/lib/socket/server');

      expect(getRoomName('room-123')).toBe('room:room-123');
      expect(getRoomName('my-room')).toBe('room:my-room');
    });

    it('should get user room name with getUserRoom', async () => {
      const { getUserRoom } = await import('@/lib/socket/server');

      expect(getUserRoom('user-123')).toBe('user:user-123');
      expect(getUserRoom('admin')).toBe('user:admin');
    });

    it('should get namespace by name', async () => {
      const { getNamespace } = await import('@/lib/socket/server');
      const io = createSocketServer(httpServer);

      const messagingNs = getNamespace('/messaging');
      const presenceNs = getNamespace('/presence');

      expect(messagingNs).toBeDefined();
      expect(presenceNs).toBeDefined();
    });

    it('should return undefined for non-existent namespace', async () => {
      const { getNamespace } = await import('@/lib/socket/server');

      // Get namespace before server created should return undefined
      await shutdownSocketServer();
      const ns = getNamespace('/nonexistent');

      expect(ns).toBeUndefined();
    });

    it('should get and set socket data', async () => {
      const { getSocketData, setSocketData } = await import('@/lib/socket/server');

      const mockSocket = {
        data: { userId: 'user-123' },
      } as unknown as Socket;

      const data = getSocketData<{ userId: string }>(mockSocket);
      expect(data.userId).toBe('user-123');

      setSocketData(mockSocket, { sessionId: 'session-456' });
      expect(mockSocket.data).toEqual({ userId: 'user-123', sessionId: 'session-456' });
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      // Clear rate limit state before each test to ensure isolation
      const { clearRateLimit } = await import('@/lib/socket/server');
      clearRateLimit('socket-1');
      clearRateLimit('socket-2');
    });

    it('should create rate limiter that allows events within limit', async () => {
      const { createRateLimiter } = await import('@/lib/socket/server');

      const limiter = createRateLimiter(5, 1000);

      // Should allow first 5 events
      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(true);

      // 6th should be blocked
      expect(limiter('socket-1')).toBe(false);
    });

    it('should track rate limits per socket', async () => {
      const { createRateLimiter } = await import('@/lib/socket/server');

      const limiter = createRateLimiter(2, 1000);

      // Each socket has its own limit
      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(false);

      // Different socket should have fresh limit
      expect(limiter('socket-2')).toBe(true);
      expect(limiter('socket-2')).toBe(true);
      expect(limiter('socket-2')).toBe(false);
    });

    it('should clear rate limit for a socket', async () => {
      const { createRateLimiter, clearRateLimit } = await import('@/lib/socket/server');

      const limiter = createRateLimiter(2, 1000);

      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(false);

      clearRateLimit('socket-1');

      // After clear, should be allowed again
      expect(limiter('socket-1')).toBe(true);
    });

    it('should reset rate limit after window expires', async () => {
      const { createRateLimiter } = await import('@/lib/socket/server');

      const limiter = createRateLimiter(2, 50); // 50ms window

      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(true);
      expect(limiter('socket-1')).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should be allowed again
      expect(limiter('socket-1')).toBe(true);
    });
  });
});
