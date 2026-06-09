import apiClient from './client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type SkillCategory =
  | 'message-passing'
  | 'leader-election'
  | 'consensus'
  | 'topology'
  | 'memory';

export interface Exercise {
  exercise_id: string;
  skill_lab_id: string;
  title: string;
  skill: SkillCategory | string;
  level: SkillLevel | string;
  description: string;
  instructions?: string;
  starter_code?: string;
  hintCount?: number;
  bonus_challenges?: Array<{ text: string }>;
  status: string;
  lesson_id: string | null;
  created_at: string;
}

export interface ExerciseAttempt {
  attempt_id: string;
  learner_id: string;
  exercise_id: string;
  submitted_code: string | null;
  test_results: {
    passed?: number;
    failed?: number;
    feedback?: string[];
  };
  hints_used: number;
  status: 'in_progress' | 'passed' | 'completed';
  started_at: string;
  completed_at: string | null;
}

export interface SubmitAttemptResult {
  passed: number;
  failed: number;
  feedback: string[];
  allPassed: boolean;
}

export interface HintResult {
  hintIndex: number;
  text: string;
  hintsUsed: number;
}

export interface ExerciseFilters {
  skill?: SkillCategory | string;
  level?: SkillLevel | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API module
// ─────────────────────────────────────────────────────────────────────────────

export const skillLabApi = {
  /**
   * List published exercises. Optionally filter by skill or level.
   */
  async listExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
    const params: Record<string, string> = {};
    if (filters?.skill) params.skill = filters.skill;
    if (filters?.level) params.level = filters.level;

    const { data } = await apiClient.get('/skill-lab/exercises', { params });
    return (data?.data ?? []) as Exercise[];
  },

  /**
   * Get a single exercise by ID (includes instructions + starter code).
   * Note: hints are not returned at this stage — use getHint() to fetch individually.
   */
  async getExercise(id: string): Promise<Exercise> {
    const { data } = await apiClient.get(`/skill-lab/exercises/${id}`);
    return data?.data as Exercise;
  },

  /**
   * Submit code for an exercise. Returns test results.
   * Auth required.
   */
  async submitAttempt(id: string, code: string): Promise<SubmitAttemptResult> {
    const { data } = await apiClient.post(`/skill-lab/exercises/${id}/submit`, { code });
    return data?.data as SubmitAttemptResult;
  },

  /**
   * Request a hint for an exercise (0-based index).
   * Auth required.
   */
  async getHint(id: string, hintIndex: number): Promise<HintResult> {
    const { data } = await apiClient.get(`/skill-lab/exercises/${id}/hint`, {
      params: { index: hintIndex },
    });
    return data?.data as HintResult;
  },

  /**
   * Mark an exercise as completed. Idempotent.
   * Auth required.
   */
  async completeExercise(id: string): Promise<{ exerciseId: string; status: string; completedAt?: string }> {
    const { data } = await apiClient.post(`/skill-lab/exercises/${id}/complete`);
    return data?.data;
  },
};

export default skillLabApi;
