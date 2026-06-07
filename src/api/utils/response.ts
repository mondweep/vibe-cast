/**
 * Response Formatting Utilities
 *
 * Standardized response format across API:
 * - Success: { status: "success", data: T }
 * - Error: { status: "error", message: string, code: string, errors?: Record<string, string[]> }
 * - Consistent HTTP status codes
 */

export interface SuccessResponse<T> {
  status: 'success';
  data: T;
}

export interface ErrorResponse {
  status: 'error';
  message: string;
  code: string;
  errors?: Record<string, string[]>;
  correlationId?: string;
}

export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

/**
 * Format a successful response
 */
export function successResponse<T>(data: T): SuccessResponse<T> {
  return {
    status: 'success',
    data,
  };
}

/**
 * Format a paginated successful response
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  skip: number
): PaginatedResponse<T> {
  return {
    status: 'success',
    data,
    pagination: {
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
    },
  };
}

/**
 * Format an error response
 */
export function errorResponse(
  message: string,
  code: string,
  errors?: Record<string, string[]>,
  correlationId?: string
): ErrorResponse {
  return {
    status: 'error',
    message,
    code,
    ...(errors && Object.keys(errors).length > 0 && { errors }),
    ...(correlationId && { correlationId }),
  };
}
