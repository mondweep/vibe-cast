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
import { NullReadModelRepository } from '../shared/infrastructure/readmodels/NullReadModelRepository';
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
import { KnowledgeGraphController } from './controllers/knowledgeGraph';
import { registerKnowledgeGraphRoutes } from './routes/knowledgeGraph';
import { FeedbackController } from './controllers/feedback';
import { registerFeedbackRoutes } from './routes/feedback';
import { SkillLabController } from './controllers/skillLab';
import { registerSkillLabRoutes } from './routes/skillLab';
import { CommunityPatternsController } from './controllers/communityPatterns';
import { registerCommunityPatternRoutes } from './routes/communityPatterns';
import { MetricsController } from './controllers/metrics';
import { registerMetricsRoutes } from './routes/metrics';
import { MetricsReadRepository } from '../metrics/infrastructure/repositories/MetricsReadRepository';
import { PatternRepository } from '../community/infrastructure/repositories/PatternRepository';

// ESM equivalents of CommonJS __filename/__dirname (this runs under tsx as ESM)
// Falls back gracefully for test environments
let __filename_path = '';
let __dirname_path = process.cwd();
try {
  if (typeof import.meta?.url === 'string' && typeof fileURLToPath === 'function') {
    __filename_path = fileURLToPath(import.meta.url);
    __dirname_path = path.dirname(__filename_path);
  }
} catch {
  // Ignore: test environment may not support ESM file URLs
}
const __filename = __filename_path;
const __dirname = __dirname_path;

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
    // Decorate fastify instance with our custom logger so routes can access it
    this.fastify.decorate('logger', this.logger);
    this.eventBus = new EventBus(this.logger);
    // Use NullReadModelRepository as default; replaced with Supabase during initialize() if env vars available
    this.readModelRepository = new NullReadModelRepository();
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
      // wildcard:false serves real files only and lets unmatched paths fall
      // through to setNotFoundHandler (the SPA fallback below), so client-side
      // routes like /login, /paths, /reset-password and page refreshes work.
      wildcard: false,
    });

    // One Supabase client serves both JWT verification (auth) and catalog reads.
    // Null if env is absent — auth then falls back to X-API-Key, catalog disables.
    const supabaseClient = createCatalogSupabaseClient();

    // Upgrade from Null to Supabase-backed read model repository when env is available
    if (supabaseClient) {
      this.readModelRepository = new SupabaseReadModelRepository(supabaseClient);
    }

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

        // Knowledge graph read API (ADR-014) — powers the Knowledge Graph tab.
        const kgController = new KnowledgeGraphController(supabaseClient, this.logger);
        await registerKnowledgeGraphRoutes(this.fastify, kgController);
        this.logger.info('Knowledge graph routes registered');

        // Feedback & contact submissions. Writes are RLS-protected: the
        // `feedback_public_insert` policy lets the publishable (anon) key INSERT,
        // and the insert-only path (no .select()) never needs read access — so
        // the catalog publishable client is sufficient, no service key required.
        const feedbackController = new FeedbackController(supabaseClient, this.logger);
        await registerFeedbackRoutes(this.fastify, feedbackController);
        this.logger.info('Feedback routes registered');

        // Skill Lab — exercises catalog + attempt grading (ADR-015)
        const skillLabController = new SkillLabController(supabaseClient, this.logger);
        await registerSkillLabRoutes(this.fastify, skillLabController);
        this.logger.info('Skill Lab routes registered');

        // Community Patterns — pattern repository + ratings (ADR-016 P1)
        const patternRepo = new PatternRepository(supabaseClient);
        const communityPatternsController = new CommunityPatternsController(patternRepo, this.logger);
        await registerCommunityPatternRoutes(this.fastify, communityPatternsController);
        this.logger.info('Community patterns routes registered');

        // Metrics — learner analytics + cohort overview (ADR-017 P1)
        const metricsRepo = new MetricsReadRepository(supabaseClient);
        const metricsController = new MetricsController(metricsRepo, this.logger);
        await registerMetricsRoutes(this.fastify, metricsController);
        this.logger.info('Metrics routes registered');
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

    // SPA fallback: any non-API GET that didn't match a static file or API
    // route returns index.html, so client-side routes and deep links (e.g. the
    // Supabase password-recovery link to /reset-password, or a refresh on
    // /paths) load the app instead of 404ing.
    this.fastify.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) {
        return reply.type('text/html').sendFile('index.html');
      }
      return reply
        .status(404)
        .send({ status: 'error', message: 'Not found', code: 'NOT_FOUND' });
    });

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

// Run if called directly (ESM entry-point check; ApiServer is already exported
// above). Resolve argv[1] so a relative invocation (e.g. `node dist/server/
// server.mjs`) still matches the absolute __filename.
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
