import apiClient from './client';
import { CommunityMember, LeaderboardEntry, PaginatedResponse } from '@/types';

/**
 * Community domain API calls
 */

export const communityApi = {
  /**
   * Get member profile
   */
  async getMemberProfile(learnerId: string): Promise<CommunityMember> {
    const response = await apiClient.get(`/community/members/${learnerId}/profile`);
    return response.data.data;
  },

  /**
   * Get leaderboard with pagination
   */
  async getLeaderboard(
    limit: number = 10,
    skip: number = 0,
    certificationId?: string,
  ): Promise<PaginatedResponse<LeaderboardEntry>> {
    const response = await apiClient.get('/community/leaderboard', {
      params: {
        limit,
        skip,
        certificationId,
      },
    });
    return response.data.data;
  },

  /**
   * Get current user's leaderboard rank
   */
  async getCurrentUserRank(): Promise<{ rank: number; position: string }> {
    const response = await apiClient.get('/community/leaderboard/current-user');
    return response.data.data;
  },

  /**
   * Search members by name
   */
  async searchMembers(
    query: string,
    limit: number = 10,
  ): Promise<CommunityMember[]> {
    const response = await apiClient.get('/community/members/search', {
      params: {
        q: query,
        limit,
      },
    });
    return response.data.data;
  },
};

export default communityApi;
