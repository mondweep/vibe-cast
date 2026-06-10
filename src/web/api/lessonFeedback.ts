import apiClient from './client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LessonComment {
  id: string;
  lesson_id: string;
  learner_id: string;
  body: string;
  created_at: string;
}

export interface LessonFeedback {
  likeCount: number;
  myLike: boolean;
  comments: LessonComment[];
}

export interface ReactionResult {
  liked: boolean;
  likeCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API module
// ─────────────────────────────────────────────────────────────────────────────

export const lessonFeedbackApi = {
  /**
   * Get feedback (like count + comments) for a lesson.
   * Public — myLike is true only when authenticated.
   */
  async getFeedback(lessonId: string): Promise<LessonFeedback> {
    const { data } = await apiClient.get(`/lessons/${lessonId}/feedback`);
    return data?.data as LessonFeedback;
  },

  /**
   * Toggle the authenticated learner's like on a lesson.
   * Auth required.
   */
  async toggleReaction(lessonId: string): Promise<ReactionResult> {
    const { data } = await apiClient.post(`/lessons/${lessonId}/reactions`);
    return data?.data as ReactionResult;
  },

  /**
   * Add a comment to a lesson.
   * Auth required.
   */
  async addComment(lessonId: string, body: string): Promise<LessonComment> {
    const { data } = await apiClient.post(`/lessons/${lessonId}/comments`, { body });
    return data?.data as LessonComment;
  },
};

export default lessonFeedbackApi;
