import apiClient from './client';
import { LearningPath, Lesson } from '@/types';

/**
 * Learning curriculum catalog API (paths + lessons).
 * Maps to the public read endpoints under /api/v1/learning (ADR-013 Phase 3).
 */
export const pathsApi = {
  async getPaths(): Promise<LearningPath[]> {
    const response = await apiClient.get('/learning/paths');
    return response.data.data;
  },

  async getPath(pathId: string): Promise<LearningPath> {
    const response = await apiClient.get(`/learning/paths/${pathId}`);
    return response.data.data;
  },

  async getPathLessons(pathId: string): Promise<Lesson[]> {
    const response = await apiClient.get(`/learning/paths/${pathId}/lessons`);
    return response.data.data;
  },

  async getLesson(lessonId: string): Promise<Lesson> {
    const response = await apiClient.get(`/learning/lessons/${lessonId}`);
    return response.data.data;
  },
};

export default pathsApi;
