import apiClient from './client';
import { Learner, Enrollment, ExamSubmission } from '@/types';

/**
 * Learning domain API calls
 */

export const learningApi = {
  /**
   * Create a new enrollment for a learner
   */
  async createEnrollment(
    learnerId: string,
    certificationId: string,
  ): Promise<Enrollment> {
    const response = await apiClient.post('/learning/enrollments', {
      learnerId,
      certificationId,
    });
    return response.data.data;
  },

  /**
   * Get learner profile with stats
   */
  async getLearnerProfile(learnerId: string): Promise<Learner> {
    const response = await apiClient.get(`/learning/learners/${learnerId}/profile`);
    return response.data.data;
  },

  /**
   * Complete an enrollment with final score
   */
  async completeEnrollment(
    enrollmentId: string,
    finalScore: number,
    completedAt: string = new Date().toISOString(),
  ): Promise<Enrollment> {
    const response = await apiClient.post(
      `/learning/enrollments/${enrollmentId}/complete`,
      {
        finalScore,
        completedAt,
      },
    );
    return response.data.data;
  },

  /**
   * Get all enrollments for a learner
   */
  async getLearnerEnrollments(learnerId: string): Promise<Enrollment[]> {
    const response = await apiClient.get(
      `/learning/learners/${learnerId}/enrollments`,
    );
    return response.data.data;
  },

  /**
   * Get a specific enrollment
   */
  async getEnrollment(enrollmentId: string): Promise<Enrollment> {
    const response = await apiClient.get(
      `/learning/enrollments/${enrollmentId}`,
    );
    return response.data.data;
  },
};

export default learningApi;
