/**
 * API Service Layer
 * Handles all communication with the backend API
 */

import { API_ENDPOINTS, API_TIMEOUT } from '../config';
import type { LearnerSession, ApiResponse } from '../types/index';

/**
 * Generic API request handler with timeout and error handling
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || `API request failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      throw new Error(`API Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Session API endpoints
 */
export const sessionAPI = {
  /**
   * Create a new learning session
   */
  async create(userId: string, email: string, displayName: string): Promise<LearnerSession> {
    const response = await apiRequest<ApiResponse<LearnerSession>>(
      API_ENDPOINTS.sessions.create,
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, email, display_name: displayName }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create session');
    }

    return response.data;
  },

  /**
   * Retrieve an existing session
   */
  async get(userId: string): Promise<LearnerSession | null> {
    try {
      const response = await apiRequest<ApiResponse<LearnerSession>>(
        API_ENDPOINTS.sessions.get(userId)
      );

      if (!response.success) {
        console.warn('Session not found:', response.error);
        return null;
      }

      return response.data || null;
    } catch (error) {
      console.warn('Failed to fetch session:', error);
      return null;
    }
  },

  /**
   * Update user progress (mark module complete)
   */
  async updateProgress(userId: string, moduleId: number): Promise<LearnerSession> {
    const response = await apiRequest<ApiResponse<LearnerSession>>(
      API_ENDPOINTS.sessions.updateProgress(userId),
      {
        method: 'PUT',
        body: JSON.stringify({ module_id: moduleId }),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update progress');
    }

    return response.data;
  },
};

/**
 * Health check endpoint
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await apiRequest<ApiResponse<{ status: string }>>(
      API_ENDPOINTS.health
    );
    return response.success && response.data?.status === 'healthy';
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
}
