import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../../shared/infrastructure/logging/Logger';

/**
 * Global Error Handler Middleware
 *
 * Maps domain exceptions to HTTP status codes:
 * - 400 Bad Request (validation, user error)
 * - 401 Unauthorized (missing/invalid auth)
 * - 403 Forbidden (insufficient permissions)
 * - 404 Not Found (resource doesn't exist)
 * - 409 Conflict (business rule violation)
 * - 500 Internal Server Error (infrastructure)
 *
 * Never exposes internal stack traces in production
 */

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function registerErrorHandler(fastify: FastifyInstance, logger: Logger) {
  fastify.setErrorHandler(
    (error: any, request: FastifyRequest, reply: FastifyReply) => {
      const correlationId = getCorrelationId(request);
      const statusCode = getStatusCode(error);

      // Log the error with context
      logger.error('Request error', {
        correlationId,
        path: request.url,
        method: request.method,
        statusCode,
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
      });

      // Determine error response
      const errorResponse = {
        status: 'error',
        message: getErrorMessage(error, statusCode),
        code: error.code || getErrorCode(statusCode),
        correlationId,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
      };

      reply.status(statusCode).send(errorResponse);
    }
  );
}

/**
 * Get correlation ID from request headers or generate new one
 */
function getCorrelationId(request: FastifyRequest): string {
  return (
    (request.headers['x-correlation-id'] as string) ||
    (request.headers['x-request-id'] as string) ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
}

/**
 * Determine appropriate HTTP status code from error
 */
function getStatusCode(error: any): number {
  // Explicit status code
  if (error.statusCode && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  // Map common error types
  if (error.name === 'NotFoundError' || error.code === 'NOT_FOUND') {
    return 404;
  }

  if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
    return 400;
  }

  if (error.name === 'ConflictError' || error.code === 'CONFLICT') {
    return 409;
  }

  if (
    error.name === 'UnauthorizedError' ||
    error.code === 'UNAUTHORIZED' ||
    error.code === 'MISSING_AUTH'
  ) {
    return 401;
  }

  if (
    error.name === 'ForbiddenError' ||
    error.code === 'FORBIDDEN' ||
    error.code === 'INSUFFICIENT_PERMISSIONS'
  ) {
    return 403;
  }

  // Fastify error handling
  if (error.statusCode) {
    return error.statusCode;
  }

  // Default to 500
  return 500;
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: any, statusCode: number): string {
  // Use custom message if available
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  // Fallback messages by status code
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 500:
      return 'Internal Server Error';
    default:
      return 'An error occurred';
  }
}

/**
 * Get error code from error object or status code
 */
function getErrorCode(statusCode: number): string {
  const codeMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    500: 'INTERNAL_SERVER_ERROR',
  };

  return codeMap[statusCode] || 'UNKNOWN_ERROR';
}
