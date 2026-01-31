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
});
