import { useMutation, useQuery } from '@tanstack/react-query';
import learningApi from '@/api/learning';
import { Learner, Enrollment } from '@/types';
import { CACHE_DURATION } from '@/config/constants';

/**
 * Hook to fetch and manage learner profile
 */
export function useLearnerProfile(learnerId?: string) {
  return useQuery({
    queryKey: ['learner', learnerId],
    queryFn: () => (learnerId ? learningApi.getLearnerProfile(learnerId) : null),
    enabled: !!learnerId,
    staleTime: CACHE_DURATION.MEDIUM,
    gcTime: CACHE_DURATION.LONG,
    retry: 2,
  });
}

/**
 * Hook to fetch learner enrollments
 */
export function useLearnerEnrollments(learnerId?: string) {
  return useQuery({
    queryKey: ['learner-enrollments', learnerId],
    queryFn: () =>
      learnerId
        ? learningApi.getLearnerEnrollments(learnerId)
        : Promise.resolve([]),
    enabled: !!learnerId,
    staleTime: CACHE_DURATION.MEDIUM,
    gcTime: CACHE_DURATION.LONG,
    retry: 2,
  });
}

/**
 * Hook to fetch single enrollment
 */
export function useEnrollment(enrollmentId?: string) {
  return useQuery({
    queryKey: ['enrollment', enrollmentId],
    queryFn: () =>
      enrollmentId ? learningApi.getEnrollment(enrollmentId) : null,
    enabled: !!enrollmentId,
    staleTime: CACHE_DURATION.MEDIUM,
    gcTime: CACHE_DURATION.LONG,
    retry: 2,
  });
}

/**
 * Hook to complete an enrollment (mutation)
 */
export function useCompleteEnrollment() {
  return useMutation({
    mutationFn: ({
      enrollmentId,
      finalScore,
    }: {
      enrollmentId: string;
      finalScore: number;
    }) => learningApi.completeEnrollment(enrollmentId, finalScore),
  });
}
