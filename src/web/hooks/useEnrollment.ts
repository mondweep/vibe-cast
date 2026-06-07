import { useMutation, useQueryClient } from '@tanstack/react-query';
import learningApi from '@/api/learning';

/**
 * Hook for creating new enrollment with optimistic updates
 */
export function useCreateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      learnerId,
      certificationId,
    }: {
      learnerId: string;
      certificationId: string;
    }) => learningApi.createEnrollment(learnerId, certificationId),
    onSuccess: (data, variables) => {
      // Invalidate and refetch learner profile
      queryClient.invalidateQueries({
        queryKey: ['learner', variables.learnerId],
      });

      // Invalidate learner enrollments
      queryClient.invalidateQueries({
        queryKey: ['learner-enrollments', variables.learnerId],
      });

      // Update cache with new enrollment
      queryClient.setQueryData(['enrollment', data.id], data);
    },
    retry: 1,
  });
}

/**
 * Hook for submitting exam results
 */
export function useSubmitExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      enrollmentId,
      examId,
      answers,
      score,
    }: {
      enrollmentId: string;
      examId: string;
      answers: Record<string, number>;
      score: number;
    }) => {
      const { certificationApi } = await import('@/api/certification');
      return certificationApi.submitExam(enrollmentId, examId, answers, score);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['enrollment'],
      });
      queryClient.invalidateQueries({
        queryKey: ['learner'],
      });
    },
  });
}
