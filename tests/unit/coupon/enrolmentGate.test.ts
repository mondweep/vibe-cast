import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningProgressController } from '../../../src/api/controllers/learningProgress';
import { ConsoleLogger } from '../../../src/shared/infrastructure/logging/Logger';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Enrolment Gate Tests (ADR-018 §3 — Freemium gating)
 *
 * BEGINNER paths are free for all learners.
 * INTERMEDIATE and ADVANCED paths require a valid, non-expired coupon redemption.
 *
 * The gate in LearningProgressController.enroll():
 *   - path.level is normalised to uppercase before comparison
 *   - If level is INTERMEDIATE or ADVANCED, queries ruflo_demo_coupon_redemption
 *   - If no active grant found, returns HTTP 402 PREMIUM_REQUIRED
 *   - Gate is bypassed when no supabase client is wired (optional param)
 */

// --------------------------------------------------------------------------
// Shared mock helpers
// --------------------------------------------------------------------------

function makeReply() {
  const reply: Partial<FastifyReply> = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as FastifyReply;
}

function makeRequest(overrides: Record<string, any> = {}): FastifyRequest {
  return {
    correlationId: 'gate-test-corr-001',
    body: {},
    params: {},
    headers: {},
    ...overrides,
  } as unknown as FastifyRequest;
}

// --------------------------------------------------------------------------
// Mock repositories
// --------------------------------------------------------------------------

function makeProgressRepo() {
  return {
    findEnrollmentsByLearner: vi.fn().mockResolvedValue([]),
    findProgressByLearner: vi.fn().mockResolvedValue([]),
    findProgress: vi.fn().mockResolvedValue(null),
    upsertEnrollment: vi.fn().mockResolvedValue(undefined),
    upsertProgress: vi.fn().mockResolvedValue(undefined),
    findCompletedLessons: vi.fn().mockResolvedValue([]),
    upsertCompletion: vi.fn().mockResolvedValue(undefined),
  };
}

function makeCatalogRepo(path: Record<string, any> | null) {
  return {
    findPathById: vi.fn().mockResolvedValue(path),
    findLessonById: vi.fn().mockResolvedValue(null),
  };
}

/** Build a fluent Supabase chain that terminates with `maybeSingle` returning `result`. */
function makeSupabaseForGate(grantData: any) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: grantData, error: null }),
  };
  // Make every method return the same chain object so the fluent calls chain correctly
  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.gt.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

// --------------------------------------------------------------------------
// Enrolment gate tests
// --------------------------------------------------------------------------

describe('LearningProgressController — enrolment gate (ADR-018)', () => {
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();
  });

  it('BEGINNER path: enrolment succeeds without coupon check (free tier)', async () => {
    const pathRow = {
      path_id: 'path-beginner-1',
      title: 'TypeScript Basics',
      level: 'beginner',
      lesson_count: 5,
      ordered_lesson_ids: ['l1', 'l2', 'l3', 'l4', 'l5'],
      estimated_hours: 3,
    };

    const progressRepo = makeProgressRepo();
    const catalogRepo = makeCatalogRepo(pathRow);
    // Supabase is wired but gate should NOT be queried for BEGINNER
    const supabase = makeSupabaseForGate(null);

    const controller = new LearningProgressController(
      progressRepo as any,
      catalogRepo as any,
      logger,
      supabase as any,
    );

    const request = makeRequest({
      params: { id: 'path-beginner-1' },
      body: { learnerId: 'learner-uuid-1' },
      authUser: { id: 'learner-uuid-1' },
    });
    const reply = makeReply();

    await controller.enroll(request, reply);

    expect(reply.status).toHaveBeenCalledWith(201);
    expect(progressRepo.upsertEnrollment).toHaveBeenCalled();
    // Gate query should NOT have been called for BEGINNER
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('INTERMEDIATE path without coupon: returns 402 with PREMIUM_REQUIRED', async () => {
    const pathRow = {
      path_id: 'path-intermediate-1',
      title: 'Advanced TypeScript Patterns',
      level: 'intermediate',
      lesson_count: 10,
      ordered_lesson_ids: Array.from({ length: 10 }, (_, i) => `l${i + 1}`),
      estimated_hours: 8,
    };

    const progressRepo = makeProgressRepo();
    const catalogRepo = makeCatalogRepo(pathRow);
    // No grant found → gate rejects
    const supabase = makeSupabaseForGate(null);

    const controller = new LearningProgressController(
      progressRepo as any,
      catalogRepo as any,
      logger,
      supabase as any,
    );

    const request = makeRequest({
      params: { id: 'path-intermediate-1' },
      body: { learnerId: 'learner-uuid-2' },
      authUser: { id: 'learner-uuid-2' },
    });
    const reply = makeReply();

    await controller.enroll(request, reply);

    expect(reply.status).toHaveBeenCalledWith(402);
    const sent = (reply.send as any).mock.calls[0][0];
    expect(sent.code).toBe('PREMIUM_REQUIRED');
    expect(sent.tier).toBe('INTERMEDIATE');
    // Should NOT have upserted any enrolment
    expect(progressRepo.upsertEnrollment).not.toHaveBeenCalled();
  });

  it('INTERMEDIATE path WITH valid coupon: enrolment proceeds (returns 201)', async () => {
    const pathRow = {
      path_id: 'path-intermediate-2',
      title: 'Advanced TypeScript Patterns',
      level: 'intermediate',
      lesson_count: 10,
      ordered_lesson_ids: Array.from({ length: 10 }, (_, i) => `l${i + 1}`),
      estimated_hours: 8,
    };

    const progressRepo = makeProgressRepo();
    const catalogRepo = makeCatalogRepo(pathRow);
    // Grant found → gate passes
    const supabase = makeSupabaseForGate({ id: 'redemption-uuid-valid' });

    const controller = new LearningProgressController(
      progressRepo as any,
      catalogRepo as any,
      logger,
      supabase as any,
    );

    const request = makeRequest({
      params: { id: 'path-intermediate-2' },
      body: { learnerId: 'learner-with-coupon' },
      authUser: { id: 'learner-with-coupon' },
    });
    const reply = makeReply();

    await controller.enroll(request, reply);

    expect(reply.status).toHaveBeenCalledWith(201);
    expect(progressRepo.upsertEnrollment).toHaveBeenCalled();
  });

  it('ADVANCED path without coupon: returns 402 with PREMIUM_REQUIRED', async () => {
    const pathRow = {
      path_id: 'path-advanced-1',
      title: 'TypeScript Compiler Internals',
      level: 'advanced',
      lesson_count: 15,
      ordered_lesson_ids: Array.from({ length: 15 }, (_, i) => `l${i + 1}`),
      estimated_hours: 20,
    };

    const progressRepo = makeProgressRepo();
    const catalogRepo = makeCatalogRepo(pathRow);
    // No grant found → gate rejects
    const supabase = makeSupabaseForGate(null);

    const controller = new LearningProgressController(
      progressRepo as any,
      catalogRepo as any,
      logger,
      supabase as any,
    );

    const request = makeRequest({
      params: { id: 'path-advanced-1' },
      body: { learnerId: 'learner-uuid-3' },
      authUser: { id: 'learner-uuid-3' },
    });
    const reply = makeReply();

    await controller.enroll(request, reply);

    expect(reply.status).toHaveBeenCalledWith(402);
    const sent = (reply.send as any).mock.calls[0][0];
    expect(sent.code).toBe('PREMIUM_REQUIRED');
    expect(sent.tier).toBe('ADVANCED');
    expect(progressRepo.upsertEnrollment).not.toHaveBeenCalled();
  });
});
