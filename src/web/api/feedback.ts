import apiClient from './client';

export type FeedbackCategory = 'comment' | 'suggestion' | 'content_error';

export interface FeedbackPayload {
  category: FeedbackCategory;
  subject?: string;
  message: string;
  name?: string;
  email?: string;
  pageContext?: string;
  allowPublic?: boolean;
}

export const feedbackApi = {
  /**
   * Submit the "Feedback & contact" form. Public endpoint — works signed-in or
   * anonymously. The Supabase JWT (if any) is attached by the client interceptor,
   * letting the backend record the learner's identity.
   */
  async submit(payload: FeedbackPayload): Promise<void> {
    await apiClient.post('/feedback', payload);
  },
};

export default feedbackApi;
