import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import staticPlugin from '@fastify/static';
import path from 'path';
import { Logger, ConsoleLogger } from '../shared/infrastructure/logging/Logger';
import { EventBus } from '../shared/infrastructure/events/EventBus';
import { IEventBus } from '../shared/infrastructure/events/IEventBus';
import { IReadModelRepository } from '../shared/infrastructure/readmodels/IReadModelRepository';
import { SupabaseReadModelRepository } from '../shared/infrastructure/readmodels/SupabaseReadModelRepository';
import { createAuthMiddleware } from './middleware/auth';
import { createLoggingMiddleware } from './middleware/logging';
import { registerErrorHandler } from './middleware/error';
import { registerLearningRoutes } from './routes/learning';
import { registerCertificationRoutes } from './routes/certification';
import { registerCommunityRoutes } from './routes/community';
import { LearningController } from './controllers/learning';
import { CertificationController } from './controllers/certification';
import { CommunityController } from './controllers/community';
import { successResponse } from './utils/response';

/**
 * Vibe-Cast REST API Server
 *
 * Fastify-based HTTP server with:
 * - CORS and security middleware (helmet)
 * - API key authentication
 * - Request/response logging with correlation IDs
 * - Zod validation middleware
 * - Global error handling
 * - 7 core endpoints across 3 domains
 * - Integration with EventBus and read models
 *
 * Health check endpoint: GET /health
 * Metrics endpoint: GET /metrics (basic)
 */
export class ApiServer {
  private fastify: FastifyInstance;
  private logger: Logger;
  private eventBus: IEventBus;
  private readModelRepository: IReadModelRepository;

  constructor() {
    this.logger = new ConsoleLogger();
    this.fastify = Fastify({
      logger: false, // Use custom logger middleware instead
    });
    this.eventBus = new EventBus(this.logger);
    this.readModelRepository = new SupabaseReadModelRepository(this.logger);
  }

  /**
   * Initialize server with middleware and routes
   */
  async initialize(): Promise<void> {
    // Register CORS
    await this.fastify.register(cors, {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Correlation-ID'],
    });

    // Register security headers
    await this.fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    // Register static file serving for SPA frontend
    const distPath = path.join(__dirname, '../../web/dist');
    await this.fastify.register(staticPlugin, {
      root: distPath,
      prefix: '/',
    });

    // Register custom middleware
    this.fastify.addHook('preHandler', createLoggingMiddleware(this.logger));
    this.fastify.addHook('preHandler', createAuthMiddleware(this.logger));

    // Register global error handler
    registerErrorHandler(this.fastify, this.logger);

    // Register health check endpoint
    this.registerHealthCheck();

    // Register metrics endpoint
    this.registerMetrics();

    // Initialize controllers
    const learningController = new LearningController(
      this.eventBus,
      this.readModelRepository,
      this.logger
    );

    const certificationController = new CertificationController(
      this.eventBus,
      this.readModelRepository,
      this.logger
    );

    const communityController = new CommunityController(
      this.readModelRepository,
      this.logger
    );

    // Register routes
    await registerLearningRoutes(this.fastify, learningController);
    await registerCertificationRoutes(this.fastify, certificationController);
    await registerCommunityRoutes(this.fastify, communityController);

    this.logger.info('API server initialized', {
      port: process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development',
    });
  }

  /**
   * Register health check endpoint
   */
  private registerHealthCheck(): void {
    this.fastify.get('/health', async (request, reply) => {
      return reply.status(200).send(
        successResponse({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
        })
      );
    });
  }

  /**
   * Register basic metrics endpoint
   */
  private registerMetrics(): void {
    this.fastify.get('/metrics', async (request, reply) => {
      // In production, integrate with Prometheus/DataDog
      return reply.status(200).send(
        successResponse({
          eventCount: 0, // Would come from MetricsCollector
          errorCount: 0,
          avgLatency: 0,
          timestamp: new Date().toISOString(),
        })
      );
    });
  }

  /**
   * Start the server and listen on port
   */
  async start(): Promise<void> {
    try {
      const port = parseInt(process.env.PORT || '3000', 10);
      const host = process.env.HOST || '0.0.0.0';

      await this.fastify.listen({ port, host });

      this.logger.info('API server started', {
        port,
        host,
        url: `http://${host}:${port}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to start API server', {
        error: message,
      });
      throw error;
    }
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    try {
      await this.fastify.close();
      this.logger.info('API server stopped');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Error stopping API server', {
        error: message,
      });
      throw error;
    }
  }

  /**
   * Get Fastify instance for testing
   */
  getFastifyInstance(): FastifyInstance {
    return this.fastify;
  }

  /**
   * Get EventBus instance
   */
  getEventBus(): IEventBus {
    return this.eventBus;
  }

  /**
   * Get ReadModel repository instance
   */
  getReadModelRepository(): IReadModelRepository {
    return this.readModelRepository;
  }
}

/**
 * Start server (called when running as CLI)
 */
async function main() {
  const server = new ApiServer();
  await server.initialize();
  await server.start();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });
}

// Export for both CLI and testing
export { ApiServer };

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
