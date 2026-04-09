/**
 * useApiCall Hook
 *
 * Wrapper for making API calls to Netlify Functions with consistent error handling.
 * Returns loading state, error, and data.
 *
 * Usage:
 * ```tsx
 * const { call, loading, error } = useApiCall();
 * await call('/api/search', { query: 'machine learning' });
 * ```
 */

import { useState, useCallback } from 'react';
import type { ApiError } from '../types';

interface UseApiCallState {
  loading: boolean;
  error: ApiError | null;
}

export function useApiCall() {
  const [state, setState] = useState<UseApiCallState>({
    loading: false,
    error: null,
  });

  const call = useCallback(
    async <T,>(
      endpoint: string,
      body?: any,
      headers?: Record<string, string>,
    ): Promise<T> => {
      setState({ loading: true, error: null });

      try {
        const apiKey = sessionStorage.getItem('piNetworkApiKey');
        const sessionId = sessionStorage.getItem('sessionId');

        if (!apiKey) {
          throw new Error('API key not found. Please authenticate first.');
        }

        if (!sessionId) {
          throw new Error('Session ID not found. Please refresh the page.');
        }

        const response = await fetch(endpoint, {
          method: body ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'x-session-id': sessionId,
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: 'Unknown error',
          }));

          const apiError: ApiError = {
            code: errorData.error || 'API_ERROR',
            message: errorData.message || 'API request failed',
            timestamp: new Date().toISOString(),
          };

          setState({ loading: false, error: apiError });
          throw apiError;
        }

        const data = await response.json();
        setState({ loading: false, error: null });

        return data as T;
      } catch (error: any) {
        const apiError: ApiError = {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message || 'An unknown error occurred',
          timestamp: new Date().toISOString(),
        };

        setState({ loading: false, error: apiError });
        throw apiError;
      }
    },
    [],
  );

  return {
    call,
    loading: state.loading,
    error: state.error,
  };
}

/**
 * Format error message for display
 */
export function getErrorMessage(error: ApiError | null): string {
  if (!error) return '';

  switch (error.code) {
    case 'INVALID_API_KEY':
      return 'Invalid API key. Please check your credentials.';
    case 'RATE_LIMITED':
      return 'API rate limited. Please try again in a moment.';
    case 'TIMEOUT':
      return 'Request timed out. Please try again.';
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection.';
    default:
      return error.message || 'An error occurred';
  }
}
