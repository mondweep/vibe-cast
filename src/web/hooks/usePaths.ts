import { useQuery } from '@tanstack/react-query';
import pathsApi from '@/api/paths';
import { CACHE_DURATION } from '@/config/constants';

/**
 * Hooks for the learning curriculum catalog (paths + lessons).
 */
export function useLearningPaths() {
  return useQuery({
    queryKey: ['learning-paths'],
    queryFn: () => pathsApi.getPaths(),
    staleTime: CACHE_DURATION.LONG,
    gcTime: CACHE_DURATION.LONG,
    retry: 2,
  });
}

export function useLearningPath(pathId?: string) {
  return useQuery({
    queryKey: ['learning-path', pathId],
    queryFn: () => (pathId ? pathsApi.getPath(pathId) : null),
    enabled: !!pathId,
    staleTime: CACHE_DURATION.LONG,
    gcTime: CACHE_DURATION.LONG,
    retry: 2,
  });
}

export function usePathLessons(pathId?: string) {
  return useQuery({
    queryKey: ['path-lessons', pathId],
    queryFn: () =>
      pathId ? pathsApi.getPathLessons(pathId) : Promise.resolve([]),
    enabled: !!pathId,
    staleTime: CACHE_DURATION.LONG,
    gcTime: CACHE_DURATION.LONG,
    retry: 2,
  });
}

export function useLesson(lessonId?: string) {
  return useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => (lessonId ? pathsApi.getLesson(lessonId) : null),
    enabled: !!lessonId,
    staleTime: CACHE_DURATION.LONG,
    gcTime: CACHE_DURATION.LONG,
    retry: 2,
  });
}
