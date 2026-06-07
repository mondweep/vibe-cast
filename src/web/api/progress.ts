import apiClient from './client';

/**
 * Progress Dashboard API (PRD §4.3, ADR-011 CQRS read models).
 *
 * Maps to the per-learner progress endpoints under /api/v1/learning.
 * Types are declared here (not in the shared types/index.ts, which is owned by
 * the integrator) and re-exported for the hook + DashboardPage.
 */

export interface PathProgressSummary {
  pathId: string;
  pathTitle: string;
  level: string;
  status: string; // ACTIVE | COMPLETED
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  nextLessonId: string | null;
  estimatedHoursRemaining: number;
  startedAt: string;
  completedAt: string | null;
}

export interface LearnerProgress {
  learnerId: string;
  activePath: PathProgressSummary | null;
  paths: PathProgressSummary[];
}

export interface PathEnrollment {
  id: string;
  learnerId: string;
  pathId: string;
  totalLessons: number;
  status: string;
  enrolledAt: string;
  progressPercent: number;
  completedLessons: number;
  currentLessonId: string | null;
}

export interface CompletedLesson {
  id: string;
  learnerId: string;
  pathId: string;
  lessonId: string;
  progressPercent: number;
  completedAt: string;
}

export const progressApi = {
  async getLearnerProgress(learnerId: string): Promise<LearnerProgress> {
    const response = await apiClient.get(`/learning/learners/${learnerId}/progress`);
    return response.data.data;
  },

  async getPathEnrollments(learnerId: string): Promise<PathEnrollment[]> {
    const response = await apiClient.get(`/learning/learners/${learnerId}/path-enrollments`);
    return response.data.data;
  },

  async getCompletedLessons(learnerId: string): Promise<CompletedLesson[]> {
    const response = await apiClient.get(`/learning/learners/${learnerId}/completed-lessons`);
    return response.data.data;
  },

  async enrollInPath(pathId: string, learnerId: string): Promise<{ id: string; status: string }> {
    const response = await apiClient.post(`/learning/paths/${pathId}/enroll`, { learnerId });
    return response.data.data;
  },

  async completeLesson(
    lessonId: string,
    learnerId: string,
  ): Promise<{ lessonId: string; pathId: string; progressPercent: number; status: string }> {
    const response = await apiClient.post(`/learning/lessons/${lessonId}/complete`, { learnerId });
    return response.data.data;
  },
};

export default progressApi;
