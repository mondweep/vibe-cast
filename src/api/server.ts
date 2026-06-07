import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger, ConsoleLogger } from '../shared/infrastructure/logging/Logger';
import { EventBus } from '../shared/infrastructure/events/EventBus';
import { IEventBus } from '../shared/infrastructure/events/IEventBus';
import { IReadModelRepository } from '../shared/infrastructure/readmodels/IReadModelRepository';
import { SupabaseReadModelRepository } from '../shared/infrastructure/readmodels/SupabaseReadModelRepository';
import { createAuthMiddleware } from './middleware/auth';
import { createLoggingMiddleware, createResponseLoggingHook } from './middleware/logging';
import { registerErrorHandler } from './middleware/error';
import { registerLearningRoutes } from './routes/learning';
import { registerCertificationRoutes } from './routes/certification';
import { registerCommunityRoutes } from './routes/community';
import { LearningController } from './controllers/learning';
import { CertificationController } from './controllers/certification';
import { CommunityController } from './controllers/community';
import { successResponse } from './utils/response';
import {
  LearningCatalogRepository,
  createCatalogSupabaseClient,
} from '../learning/infrastructure/repositories/LearningCatalogRepository';
import { LearningCatalogController } from './controllers/learningCatalog';
import { registerLearningPathRoutes } from './routes/learningPaths';
import { TutorController } from './controllers/tutor';
import { registerTutorRoutes } from './routes/tutor';
import {
  ProgressReadRepository,
  createProgressSupabaseClient,
} from '../learning/infrastructure/repositories/ProgressReadRepository';
import { LearningProgressController } from './controllers/learningProgress';
import { registerLearningProgressRoutes } from './routes/learningProgress';
import { registerContractGapReadRoutes } from './routes/contractGapReads';

// ESM equivalents of CommonJS __filename/__dirname (this runs under tsx as ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID'],
    });

    // Register security headers
    await this.fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    // Register static file serving for SPA frontend
    const distPath = path.join(__dirname, '../../dist');
    await this.fastify.register(staticPlugin, {
      root: distPath,
      prefix: '/',
    });

    // One Supabase client serves both JWT verification (auth) and catalog reads.
    // Null if env is absent — auth then falls back to X-API-Key, catalog disables.
    const supabaseClient = createCatalogSupabaseClient();

    // Register custom middleware
    this.fastify.addHook('preHandler', createLoggingMiddleware(this.logger));
    this.fastify.addHook('onResponse', createResponseLoggingHook(this.logger));
    this.fastify.addHook('preHandler', createAuthMiddleware(this.logger, supabaseClient));

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

    // Learning curriculum catalog + learner reads (read side, ADR-013 Phase 3).
    // Wrapped so a client/config failure can never crash server boot.
    try {
      if (supabaseClient) {
        const catalogRepo = new LearningCatalogRepository(supabaseClient);
        const catalogController = new LearningCatalogController(catalogRepo, this.logger);
        await registerLearningPathRoutes(this.fastify, catalogController);
        this.logger.info('Learning catalog routes registered');

        // GraphRAG tutor (ADR-014 KG-3) — reuses the same Supabase client
        const tutorController = new TutorController(supabaseClient, this.logger);
        await registerTutorRoutes(this.fastify, tutorController);
        this.logger.info('Tutor routes registered');

        // Learner progress read models + dashboard (PRD §4.3, ADR-011).
        // Prefers a service client for the enroll/complete write path; reads
        // work with the publishable key.
        const progressSupabase = createProgressSupabaseClient() ?? supabaseClient;
        const progressRepo = new ProgressReadRepository(progressSupabase);
        const progressController = new LearningProgressController(
          progressRepo,
          catalogRepo,
          this.logger,
        );
        await registerLearningProgressRoutes(this.fastify, progressController);
        this.logger.info('Learning progress routes registered');

        // Contract-gap read endpoints (certifications, badges, community,
        // single enrollment) — closes the frontend↔backend audit gaps.
        await registerContractGapReadRoutes(this.fastify, supabaseClient, this.logger);
        this.logger.info('Contract-gap read routes registered');
      } else {
        this.logger.warn(
          'Learning catalog routes NOT registered (set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('Learning catalog routes NOT registered (initialization failed)', {
        error: message,
      });
    }

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

// Run if called directly (ESM entry-point check; ApiServer is already exported above)
if (process.argv[1] === __filename) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
