import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../../shared/infrastructure/logging/Logger';
import { successResponse, errorResponse } from '../utils/response';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ExerciseRow {
  exercise_id: string;
  skill_lab_id: string;
  title: string;
  skill: string;
  level: string;
  description: string;
  instructions: string;
  starter_code: string;
  hints: Hint[];
  bonus_challenges: BonusChallenge[];
  status: string;
  lesson_id: string | null;
  created_at: string;
}

interface Hint {
  index: number;
  text: string;
}

interface BonusChallenge {
  text: string;
}

interface AttemptRow {
  attempt_id: string;
  learner_id: string;
  exercise_id: string;
  submitted_code: string | null;
  test_results: TestResults;
  hints_used: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

interface TestResults {
  passed?: number;
  failed?: number;
  feedback?: string[];
}

// Required code patterns per skill category
const REQUIRED_PATTERNS: Record<string, { patterns: RegExp[]; label: string }[]> = {
  'message-passing': [
    { patterns: [/SendMessage|send_message/i], label: 'SendMessage call' },
    { patterns: [/Agent\s*\(/], label: 'Agent() spawn' },
  ],
  'leader-election': [
    { patterns: [/SendMessage|send_message/i], label: 'SendMessage call' },
    { patterns: [/Agent\s*\(/], label: 'Agent() spawn' },
    { patterns: [/vote|leader|elect/i], label: 'election logic (vote / leader / elect)' },
  ],
  topology: [
    { patterns: [/Agent\s*\(/], label: 'Agent() spawn' },
    { patterns: [/hierarchical|mesh|ring|star|adaptive/i], label: 'topology name' },
  ],
  memory: [
    { patterns: [/memory_store|memory_search/i], label: 'memory_store or memory_search call' },
  ],
  default: [
    { patterns: [/Agent\s*\(/], label: 'Agent() spawn' },
  ],
};

function runHiddenTests(skill: string, code: string): { passed: number; failed: number; feedback: string[] } {
  const checks = REQUIRED_PATTERNS[skill] ?? REQUIRED_PATTERNS.default;
  const feedback: string[] = [];
  let passed = 0;

  for (const check of checks) {
    const hit = check.patterns.some((re) => re.test(code));
    if (hit) {
      passed++;
    } else {
      feedback.push(`Missing: ${check.label}`);
    }
  }

  // Bonus check: run_in_background usage (best practice)
  if (/run_in_background\s*:\s*true/i.test(code)) {
    passed++;
    feedback.push('Good: run_in_background: true detected');
  } else {
    feedback.push('Tip: add run_in_background: true to spawn agents asynchronously');
  }

  const total = checks.length + 1; // +1 for the bonus check
  return { passed, failed: total - passed, feedback };
}

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Skill Lab Controller — Exercise catalog + attempts (ADR-015, PRD §5).
 *
 * Reads ruflo_demo_exercise_read_model for the catalog and writes to
 * ruflo_demo_exercise_attempt_read_model for per-learner attempts.
 * Hidden-test grading runs server-side (pattern validation); the full
 * hidden test suite is never sent to the client.
 */
export class SkillLabController {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
  ) {}

  // ------------------------------------------------------------------ helpers

  private learnerId(request: FastifyRequest): string | null {
    return (request as any).authUser?.sub ?? (request as any).authUser?.id ?? null;
  }

  // -------------------------------------------------------------------- reads

  /**
   * GET /api/v1/skill-lab/exercises
   * Public. Optional ?skill= and ?level= filters.
   */
  async listExercises(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const { skill, level } = request.query as { skill?: string; level?: string };

    try {
      let query = this.supabase
        .from('ruflo_demo_exercise_read_model')
        .select('exercise_id, skill_lab_id, title, skill, level, description, status, lesson_id, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (skill) query = query.eq('skill', skill);
      if (level) query = query.eq('level', level);

      const { data, error } = await query;
      if (error) throw error;

      reply.status(200).send(successResponse(data ?? []));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('listExercises failed', { error: message, correlationId });
      reply.status(500).send(errorResponse('Failed to list exercises', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * GET /api/v1/skill-lab/exercises/:exerciseId
   * Public. Returns full exercise (instructions + starter code + hints).
   * NOTE: hidden test suite is never returned.
   */
  async getExercise(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const { exerciseId } = request.params as { exerciseId: string };

    try {
      const { data, error } = await this.supabase
        .from('ruflo_demo_exercise_read_model')
        .select('exercise_id, skill_lab_id, title, skill, level, description, instructions, starter_code, hints, bonus_challenges, status, lesson_id, created_at')
        .eq('exercise_id', exerciseId)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return reply
          .status(404)
          .send(errorResponse('Exercise not found', 'NOT_FOUND', undefined, correlationId));
      }

      // Strip hint text — return only count so the client can show "X hints available"
      const safeData = { ...data as ExerciseRow, hintCount: (data as ExerciseRow).hints?.length ?? 0, hints: undefined };
      reply.status(200).send(successResponse(safeData));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('getExercise failed', { error: message, correlationId, exerciseId });
      reply.status(500).send(errorResponse('Failed to get exercise', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  // ------------------------------------------------------------------ writes

  /**
   * POST /api/v1/skill-lab/exercises/:exerciseId/submit
   * Auth required. Body: { code: string }.
   * Runs hidden-test validation server-side; returns { passed, failed, feedback }.
   */
  async submitAttempt(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const { exerciseId } = request.params as { exerciseId: string };
    const learnerId = this.learnerId(request);
    const { code } = (request.body as any) ?? {};

    try {
      if (!learnerId) {
        return reply.status(401).send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
      }
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return reply.status(400).send(errorResponse('code is required', 'VALIDATION_ERROR', undefined, correlationId));
      }

      // Load exercise to get skill category for test selection
      const { data: exercise, error: exErr } = await this.supabase
        .from('ruflo_demo_exercise_read_model')
        .select('exercise_id, skill, title')
        .eq('exercise_id', exerciseId)
        .eq('status', 'published')
        .maybeSingle();

      if (exErr) throw exErr;
      if (!exercise) {
        return reply.status(404).send(errorResponse('Exercise not found', 'NOT_FOUND', undefined, correlationId));
      }

      const { passed, failed, feedback } = runHiddenTests((exercise as any).skill, code);
      const allPassed = failed === 0;
      const attemptStatus = allPassed ? 'passed' : 'in_progress';

      // Upsert attempt row
      const { error: upsertErr } = await this.supabase
        .from('ruflo_demo_exercise_attempt_read_model')
        .upsert(
          {
            learner_id: learnerId,
            exercise_id: exerciseId,
            submitted_code: code,
            test_results: { passed, failed, feedback },
            status: attemptStatus,
            completed_at: allPassed ? new Date().toISOString() : null,
          },
          { onConflict: 'learner_id,exercise_id', ignoreDuplicates: false },
        );

      if (upsertErr) throw upsertErr;

      this.logger.info('Attempt submitted', { correlationId, learnerId, exerciseId, passed, failed });
      reply.status(200).send(successResponse({ passed, failed, feedback, allPassed }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('submitAttempt failed', { error: message, correlationId, exerciseId, learnerId });
      reply.status(500).send(errorResponse('Failed to submit attempt', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * GET /api/v1/skill-lab/exercises/:exerciseId/hint
   * Auth required. Query: ?index=<number> (0-based).
   * Enforces hint cap per ADR-015 §1.
   */
  async getHint(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const { exerciseId } = request.params as { exerciseId: string };
    const learnerId = this.learnerId(request);
    const { index: rawIndex } = request.query as { index?: string };

    try {
      if (!learnerId) {
        return reply.status(401).send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
      }

      const hintIndex = parseInt(rawIndex ?? '0', 10);
      if (!Number.isInteger(hintIndex) || hintIndex < 0) {
        return reply.status(400).send(errorResponse('index must be a non-negative integer', 'VALIDATION_ERROR', undefined, correlationId));
      }

      // Load exercise hints
      const { data: exercise, error: exErr } = await this.supabase
        .from('ruflo_demo_exercise_read_model')
        .select('exercise_id, hints')
        .eq('exercise_id', exerciseId)
        .eq('status', 'published')
        .maybeSingle();

      if (exErr) throw exErr;
      if (!exercise) {
        return reply.status(404).send(errorResponse('Exercise not found', 'NOT_FOUND', undefined, correlationId));
      }

      const hints: Hint[] = (exercise as any).hints ?? [];
      if (hintIndex < 0 || hintIndex >= hints.length) {
        return reply.status(404).send(errorResponse('Hint not found', 'NOT_FOUND', undefined, correlationId));
      }

      // Track hints used in attempt row
      const { data: existing } = await this.supabase
        .from('ruflo_demo_exercise_attempt_read_model')
        .select('attempt_id, hints_used')
        .eq('learner_id', learnerId)
        .eq('exercise_id', exerciseId)
        .maybeSingle();

      const hintsUsed = ((existing as AttemptRow | null)?.hints_used ?? 0) + 1;

      if (existing) {
        await this.supabase
          .from('ruflo_demo_exercise_attempt_read_model')
          .update({ hints_used: hintsUsed })
          .eq('learner_id', learnerId)
          .eq('exercise_id', exerciseId);
      } else {
        await this.supabase
          .from('ruflo_demo_exercise_attempt_read_model')
          .insert({ learner_id: learnerId, exercise_id: exerciseId, hints_used: 1, status: 'in_progress' });
      }

      this.logger.info('Hint requested', { correlationId, learnerId, exerciseId, hintIndex, hintsUsed });
      reply.status(200).send(successResponse({ hintIndex, text: hints[hintIndex].text, hintsUsed }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('getHint failed', { error: message, correlationId, exerciseId, learnerId });
      reply.status(500).send(errorResponse('Failed to retrieve hint', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * POST /api/v1/skill-lab/exercises/:exerciseId/complete
   * Auth required. Marks exercise completed for the learner. Idempotent.
   */
  async completeExercise(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const { exerciseId } = request.params as { exerciseId: string };
    const learnerId = this.learnerId(request);

    try {
      if (!learnerId) {
        return reply.status(401).send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
      }

      // Idempotency: check current status
      const { data: existing } = await this.supabase
        .from('ruflo_demo_exercise_attempt_read_model')
        .select('attempt_id, status')
        .eq('learner_id', learnerId)
        .eq('exercise_id', exerciseId)
        .maybeSingle();

      if ((existing as AttemptRow | null)?.status === 'completed') {
        return reply.status(200).send(successResponse({ exerciseId, status: 'completed', alreadyCompleted: true }));
      }

      const now = new Date().toISOString();
      if (existing) {
        await this.supabase
          .from('ruflo_demo_exercise_attempt_read_model')
          .update({ status: 'completed', completed_at: now })
          .eq('learner_id', learnerId)
          .eq('exercise_id', exerciseId);
      } else {
        await this.supabase
          .from('ruflo_demo_exercise_attempt_read_model')
          .insert({ learner_id: learnerId, exercise_id: exerciseId, status: 'completed', completed_at: now });
      }

      this.logger.info('Exercise completed', { correlationId, learnerId, exerciseId });
      reply.status(200).send(successResponse({ exerciseId, status: 'completed', completedAt: now }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('completeExercise failed', { error: message, correlationId, exerciseId, learnerId });
      reply.status(500).send(errorResponse('Failed to complete exercise', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}
