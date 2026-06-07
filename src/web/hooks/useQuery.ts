import {
  QueryClient,
  QueryClientProvider,
  useQuery as tanstackUseQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import { CACHE_DURATION } from '@/config/constants';

/**
 * Create and export a singleton QueryClient with project defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_DURATION.MEDIUM, // 5 minutes
      gcTime: CACHE_DURATION.LONG, // 10 minutes (previously cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
  },
});

/**
 * Wrapper around React Query's useQuery with project defaults
 */
export function useQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends unknown[] = unknown[],
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  return tanstackUseQuery({
    ...options,
    staleTime: options.staleTime ?? CACHE_DURATION.MEDIUM,
    gcTime: options.gcTime ?? CACHE_DURATION.LONG,
    retry: options.retry ?? 2,
  });
}

export { QueryClientProvider };
