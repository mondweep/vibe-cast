import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import progressApi from '@/api/progress';
import { CACHE_DURATION } from '@/config/constants';

/**
 * Hooks for the Progress Dashboard (PRD §4.3, ADR-011 CQRS read models).
 */
export function useLearnerProgress(learnerId?: string) {
  return useQuery({
    queryKey: ['learner-progress', learnerId],
    queryFn: () => (learnerId ? progressApi.getLearnerProgress(learnerId) : null),
    enabled: !!learnerId,
    staleTime: CACHE_DURATION.SHORT,
    gcTime: CACHE_DURATION.MEDIUM,
    retry: 2,
  });
}

export function usePathEnrollments(learnerId?: string) {
  return useQuery({
    queryKey: ['path-enrollments', learnerId],
    queryFn: () =>
      learnerId ? progressApi.getPathEnrollments(learnerId) : Promise.resolve([]),
    enabled: !!learnerId,
    staleTime: CACHE_DURATION.SHORT,
    gcTime: CACHE_DURATION.MEDIUM,
    retry: 2,
  });
}

export function useCompletedLessons(learnerId?: string) {
  return useQuery({
    queryKey: ['completed-lessons', learnerId],
    queryFn: () =>
      learnerId ? progressApi.getCompletedLessons(learnerId) : Promise.resolve([]),
    enabled: !!learnerId,
    staleTime: CACHE_DURATION.SHORT,
    gcTime: CACHE_DURATION.MEDIUM,
    retry: 2,
  });
}

export function useEnrollInPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pathId, learnerId }: { pathId: string; learnerId: string }) =>
      progressApi.enrollInPath(pathId, learnerId),
    onSuccess: (_data, { learnerId }) => {
      queryClient.invalidateQueries({ queryKey: ['learner-progress', learnerId] });
      queryClient.invalidateQueries({ queryKey: ['path-enrollments', learnerId] });
    },
  });
}

export function useCompleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, learnerId }: { lessonId: string; learnerId: string }) =>
      progressApi.completeLesson(lessonId, learnerId),
    onSuccess: (_data, { learnerId }) => {
      queryClient.invalidateQueries({ queryKey: ['learner-progress', learnerId] });
      queryClient.invalidateQueries({ queryKey: ['completed-lessons', learnerId] });
      queryClient.invalidateQueries({ queryKey: ['path-enrollments', learnerId] });
    },
  });
}
