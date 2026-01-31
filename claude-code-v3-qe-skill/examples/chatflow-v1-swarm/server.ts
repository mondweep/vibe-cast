/**
 * Custom Server Entry Point
 *
 * Custom Next.js server with integrated Socket.io support.
 * This file serves as the production entry point.
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import {
  createSocketServer,
  configureSocketServer,
  shutdownSocketServer,
  getSocketServer,
} from './src/lib/socket/server';
import {
  registerAllHandlers,
  HandlerDependencies,
} from './src/lib/socket/handlers';
import {
  setupRedisAdapter,
  closeAdapterConnections,
  closeAllRedisConnections,
} from './src/lib/redis';

// ============================================================================
// Configuration
// ============================================================================

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST ?? 'localhost';
const port = parseInt(process.env.PORT ?? '3000', 10);

// ============================================================================
// Next.js App
// ============================================================================

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ============================================================================
// Mock Dependencies (Replace with actual implementations)
// ============================================================================

function createMockDependencies(): HandlerDependencies {
  const logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  return {
    room: {
      roomService: {
        getRoomById: async (roomId) => ({
          id: roomId,
          name: `Room ${roomId}`,
          hasMember: () => true,
          members: [],
        }),
        validateRoomAccess: async () => true,
        getMemberIds: async () => [],
      },
      presenceService: {
        markUserInRoom: async () => {},
        removeUserFromRoom: async () => {},
        getRoomMembers: async () => [],
      },
      logger,
    },
    message: {
      messageService: {
        createMessage: async (data) => ({
          id: `msg-${Date.now()}`,
          content: data.content,
          roomId: data.roomId,
          senderId: data.senderId,
          type: data.type,
          createdAt: new Date(),
          reactions: [],
        }),
        editMessage: async (messageId, content) => ({
          id: messageId,
          content,
          roomId: 'room-123',
          senderId: 'user-123',
          type: 'text' as const,
          createdAt: new Date(),
          editedAt: new Date(),
          reactions: [],
        }),
        deleteMessage: async (messageId) => ({
          id: messageId,
          deletedAt: new Date(),
        }),
        addReaction: async (messageId) => ({
          id: messageId,
          reactions: [],
        }),
        removeReaction: async (messageId) => ({
          id: messageId,
          reactions: [],
        }),
        getMessageById: async (messageId) => ({
          id: messageId,
          content: 'Test message',
          roomId: 'room-123',
          senderId: 'user-123',
        }),
      },
      roomService: {
        validateRoomAccess: async () => true,
        getRoomById: async (roomId) => ({
          id: roomId,
          name: `Room ${roomId}`,
          hasMember: () => true,
        }),
      },
      rateLimiter: {
        checkLimit: async () => true,
        getRemainingLimit: () => 100,
      },
      logger,
    },
    presence: {
      presenceService: {
        setUserOnline: async () => {},
        setUserOffline: async () => {},
        setUserAway: async () => {},
        updateStatus: async () => {},
        getOnlineUsers: async () => [],
        getUserPresence: async () => null,
        heartbeat: async () => {},
      },
      typingService: {
        startTyping: async () => {},
        stopTyping: async () => {},
        getTypingUsers: async () => [],
        isUserTyping: async () => false,
      },
      redis: {
        setex: async () => 'OK',
        del: async () => 1,
        get: async () => null,
        publish: async () => 1,
      },
      logger,
    },
  };
}

// ============================================================================
// Server Startup
// ============================================================================

async function startServer(): Promise<void> {
  try {
    // Prepare Next.js
    await app.prepare();

    // Create HTTP server
    const httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url ?? '/', true);
      handle(req, res, parsedUrl);
    });

    // Create Socket.io server
    const io = createSocketServer(httpServer, {
      cors: {
        origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Configure authentication middleware
    configureSocketServer(io, {
      authMiddleware: (socket, next) => {
        const token = socket.handshake.auth?.['token'] as string | undefined;
        const userId = socket.handshake.auth?.['userId'] as string | undefined;

        // In production, validate JWT token here
        if (userId) {
          (socket.data as { userId: string }).userId = userId;
          next();
        } else if (dev) {
          // Dev mode: allow anonymous connections with generated user ID
          (socket.data as { userId: string }).userId = `user-${socket.id.slice(0, 8)}`;
          next();
        } else {
          next(new Error('Authentication required'));
        }
      },
      onConnection: (socket) => {
        console.log(`[Server] Client connected: ${socket.id}`);
      },
      onDisconnection: (socket, reason) => {
        console.log(`[Server] Client disconnected: ${socket.id} (${reason})`);
      },
    });

    // Setup Redis adapter for horizontal scaling (production only)
    if (!dev) {
      await setupRedisAdapter(io);
    }

    // Register handlers
    const dependencies = createMockDependencies();
    io.on('connection', (socket) => {
      registerAllHandlers(socket, dependencies);
    });

    // Start server
    httpServer.listen(port, () => {
      console.log(`
========================================
  ChatFlow Server Running
========================================
  Mode:     ${dev ? 'Development' : 'Production'}
  URL:      http://${hostname}:${port}
  Socket:   ws://${hostname}:${port}
========================================
      `);
    });

    // Graceful shutdown
    setupGracefulShutdown(httpServer);
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

function setupGracefulShutdown(httpServer: ReturnType<typeof createServer>): void {
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);

    try {
      // Shutdown Socket.io
      await shutdownSocketServer();

      // Close Redis connections
      await closeAdapterConnections();
      await closeAllRedisConnections();

      // Close HTTP server
      await new Promise<void>((resolve) => {
        httpServer.close(() => {
          console.log('[Server] HTTP server closed');
          resolve();
        });
      });

      console.log('[Server] Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('[Server] Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ============================================================================
// Start Server
// ============================================================================

startServer();
