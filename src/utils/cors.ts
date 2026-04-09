/**
 * CORS Headers Utility
 *
 * Provides consistent CORS headers for all Netlify Functions to enable
 * cross-origin requests from the frontend and handle OPTIONS preflights.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, x-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * Helper to check if a request is an OPTIONS preflight
 */
export const isPreflight = (event: any) => event.httpMethod === 'OPTIONS';

/**
 * Standard preflight response (HTTP 204 No Content)
 */
export const preflightResponse = {
  statusCode: 204,
  headers: corsHeaders,
  body: '',
};
