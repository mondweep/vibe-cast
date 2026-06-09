import apiClient from './client';

/**
 * Metrics API — Learner & Cohort Analytics (PRD §8, ADR-017).
 *
 * Maps to the read endpoints under /api/v1/metrics.
 * Types are local to this module and re-exported for AnalyticsPage.
 */

export interface LearnerMetrics {
  metricsId?:           string;
  learnerId:            string;
  pathProgressPercent:  number;
  lessonsCompleted:     number;
  lessonsTotal:         number;
  exercisesCompleted:   number;
  exercisesTotal:       number;
  timeInvestedHours:    number;
  lastActivityAt:       string | null;
  daysInactive:         number;
  engagementTrend:      'up' | 'neutral' | 'down';
  estCertDate:          string | null;
  updatedAt?:           string;
}

export interface CohortMetrics {
  cohortId:               string;
  name:                   string;
  instructorId:           string | null;
  learnerCount:           number;
  activeThisWeekPct:      number;
  avgPathProgress:        number;
  completionRate:         number;
  avgTimePerLessonHours:  number;
  churnRiskCount:         number;
  updatedAt:              string;
}

export const metricsApi = {
  /** GET /api/v1/metrics/my — authenticated learner's own metrics */
  async getMyMetrics(): Promise<LearnerMetrics> {
    const response = await apiClient.get('/metrics/my');
    return response.data.data as LearnerMetrics;
  },

  /** GET /api/v1/metrics/cohorts — list all cohorts */
  async getCohorts(): Promise<CohortMetrics[]> {
    const response = await apiClient.get('/metrics/cohorts');
    return response.data.data as CohortMetrics[];
  },

  /** GET /api/v1/metrics/cohorts/:id — single cohort overview */
  async getCohort(id: string): Promise<CohortMetrics> {
    const response = await apiClient.get(`/metrics/cohorts/${id}`);
    return response.data.data as CohortMetrics;
  },
};

export default metricsApi;
