import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { Logger } from '../../shared/infrastructure/logging/Logger';

/**
 * Validation Middleware Factory
 *
 * Creates middleware for validating request body and query parameters
 * Returns 400 with detailed error messages on validation failure
 * Provides validated data to controllers
 */

export interface ValidationOptions {
  bodySchema?: ZodSchema;
  querySchema?: ZodSchema;
}

export function createValidationMiddleware(
  logger: Logger,
  options: ValidationOptions
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate query parameters if schema provided
      if (options.querySchema) {
        const queryValidation = options.querySchema.safeParse(request.query);
        if (!queryValidation.success) {
          const errors = formatZodErrors(queryValidation.error);
          logger.warn('Query validation failed', {
            path: request.url,
            errors,
          });
          return reply.status(400).send({
            status: 'error',
            message: 'Query parameter validation failed',
            code: 'VALIDATION_ERROR',
            errors,
          });
        }
        // Attach validated query to request
        (request as any).validatedQuery = queryValidation.data;
      }

      // Validate body if schema provided
      if (options.bodySchema && request.method !== 'GET') {
        const bodyValidation = options.bodySchema.safeParse(request.body);
        if (!bodyValidation.success) {
          const errors = formatZodErrors(bodyValidation.error);
          logger.warn('Body validation failed', {
            path: request.url,
            method: request.method,
            errors,
          });
          return reply.status(400).send({
            status: 'error',
            message: 'Request body validation failed',
            code: 'VALIDATION_ERROR',
            errors,
          });
        }
        // Attach validated body to request
        (request as any).validatedBody = bodyValidation.data;
      }
    } catch (error) {
      logger.error('Validation middleware error', {
        path: request.url,
        error: error instanceof Error ? error.message : String(error),
      });
      return reply.status(500).send({
        status: 'error',
        message: 'Internal validation error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Format Zod validation errors into readable error messages
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });

  return errors;
}
