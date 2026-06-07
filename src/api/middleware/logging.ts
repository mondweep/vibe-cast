import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../../shared/infrastructure/logging/Logger';

/**
 * Request/Response Logging Middleware
 *
 * Logs all requests with:
 * - Correlation ID for distributed tracing
 * - HTTP method and path
 * - Response status code
 * - Duration in milliseconds
 * - Integration with existing Logger infrastructure
 */

export function createLoggingMiddleware(logger: Logger) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    const correlationId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store correlation ID on request for downstream use
    (request as any).correlationId = correlationId;
    (reply as any).correlationId = correlationId;

    // Log request
    logger.debug('Request received', {
      correlationId,
      method: request.method,
      path: request.url,
      query: Object.keys(request.query).length > 0 ? request.query : undefined,
      ip: request.ip,
    });

    // Hook into response to log after response is sent
    reply.addHook('onResponse', (request, reply, done) => {
      const duration = Date.now() - startTime;
      const statusCode = reply.statusCode;

      // Log response
      logger.info('Request completed', {
        correlationId,
        method: request.method,
        path: request.url,
        statusCode,
        duration: `${duration}ms`,
      });

      // Log warnings for slow requests (>1s)
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          correlationId,
          method: request.method,
          path: request.url,
          duration: `${duration}ms`,
        });
      }

      done();
    });
  };
}
