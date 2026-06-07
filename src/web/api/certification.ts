import apiClient from './client';
import { Badge, CertificationProgress, ExamSubmission, Certification } from '@/types';

/**
 * Certification domain API calls
 */

export const certificationApi = {
  /**
   * Issue a badge to a learner
   */
  async issueBadge(
    learnerId: string,
    enrollmentId: string,
    badgeId: string,
    certificationName: string,
  ): Promise<{ status: string; sagaId: string }> {
    const response = await apiClient.post('/certification/badges/issue', {
      learnerId,
      enrollmentId,
      badgeId,
      certificationName,
    });
    return response.data.data;
  },

  /**
   * Get certification progress for a learner
   */
  async getCertificationProgress(
    learnerId: string,
    certificationId: string,
  ): Promise<CertificationProgress> {
    const response = await apiClient.get(
      `/certification/learners/${learnerId}/progress`,
      {
        params: { certificationId },
      },
    );
    return response.data.data;
  },

  /**
   * Submit exam answers and get score
   */
  async submitExam(
    enrollmentId: string,
    examId: string,
    answers: Record<string, number>,
    score: number,
  ): Promise<ExamSubmission> {
    const response = await apiClient.post('/certification/exams/submit', {
      enrollmentId,
      examId,
      answers,
      score,
    });
    return response.data.data;
  },

  /**
   * Get certification details
   */
  async getCertification(certificationId: string): Promise<Certification> {
    const response = await apiClient.get(
      `/certification/certifications/${certificationId}`,
    );
    return response.data.data;
  },

  /**
   * Get all certifications with optional filters
   */
  async getCertifications(filters?: {
    difficulty?: string;
    domain?: string;
    limit?: number;
    skip?: number;
  }): Promise<Certification[]> {
    const response = await apiClient.get('/certification/certifications', {
      params: filters,
    });
    return response.data.data;
  },

  /**
   * Get learner badges
   */
  async getLearnerBadges(learnerId: string): Promise<Badge[]> {
    const response = await apiClient.get(
      `/certification/learners/${learnerId}/badges`,
    );
    return response.data.data;
  },
};

export default certificationApi;
