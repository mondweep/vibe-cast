/**
 * Community Patterns API client
 * Wraps the Pattern Repository endpoints (ADR-016, P1)
 */

import apiClient from './client';

export interface Pattern {
  id: string;
  authorId: string;
  title: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  problem: string;
  solution: string;
  codeExample: string | null;
  productionContext: string | null;
  performanceNotes: string | null;
  knownLimitations: string | null;
  status: string;
  stars: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatternRating {
  patternId: string;
  stars: number;
  averageStars: number;
}

export interface PatternFilters {
  category?: string;
  difficulty?: string;
  search?: string;
}

export interface SubmitPatternData {
  title: string;
  category: string;
  difficulty: string;
  problem: string;
  solution: string;
  codeExample?: string;
}

export const communityPatternsApi = {
  /**
   * List published patterns with optional filters
   */
  async listPatterns(filters?: PatternFilters): Promise<Pattern[]> {
    const response = await apiClient.get('/community/patterns', {
      params: filters,
    });
    return response.data.data;
  },

  /**
   * Get a single pattern by ID
   */
  async getPattern(id: string): Promise<Pattern> {
    const response = await apiClient.get(`/community/patterns/${id}`);
    return response.data.data;
  },

  /**
   * Rate a pattern (auth required)
   */
  async ratePattern(id: string, stars: number, reviewText?: string): Promise<PatternRating> {
    const response = await apiClient.post(`/community/patterns/${id}/rate`, {
      stars,
      reviewText,
    });
    return response.data.data;
  },

  /**
   * Submit a new pattern for moderation (auth required)
   */
  async submitPattern(data: SubmitPatternData): Promise<{ id: string; status: string }> {
    const response = await apiClient.post('/community/patterns', data);
    return response.data.data;
  },
};

export default communityPatternsApi;
