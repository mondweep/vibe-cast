import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LessonFeedbackController } from '../../src/api/controllers/lessonFeedback';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';
import { FastifyRequest, FastifyReply } from 'fastify';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<FastifyRequest> & { params?: Record<string, string>; body?: unknown; authUser?: { id: string } | null } = {}): FastifyRequest {
  const req: any = {
    params: {},
    body: {},
    correlationId: 'test-correlation-id',
    authUser: null,
    ...overrides,
  };
  return req as FastifyRequest;
}

function makeReply(): { reply: FastifyReply; statusCode: number | null; payload: unknown } {
  const state = { statusCode: null as number | null, payload: undefined as unknown };
  const reply: any = {
    status(code: number) {
      state.statusCode = code;
      return reply;
    },
    send(payload: unknown) {
      state.payload = payload;
      return reply;
    },
  };
  return { reply: reply as FastifyReply, ...state, get statusCode() { return state.statusCode; }, get payload() { return state.payload; } };
}

function buildSupabaseMock(overrides: Record<string, unknown> = {}) {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    ...overrides,
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('LessonFeedbackController', () => {
  const logger = new ConsoleLogger();
  const LESSON_ID = '00000000-0000-0000-0000-000000000001';
  const LEARNER_ID = '00000000-0000-0000-0000-000000000002';

  describe('getFeedback', () => {
    it('returns 200 with likeCount, myLike and comments for an unauthenticated caller', async () => {
      const supabase: any = {
        from: vi.fn(() => supabase),
        select: vi.fn(() => supabase),
        eq: vi.fn(() => supabase),
        order: vi.fn(() => supabase),
        limit: vi.fn(() => supabase),
        maybeSingle: vi.fn(() => supabase),
        // count query resolves first
        count: 3,
        error: null,
        data: [
          { id: 'c1', learner_id: LEARNER_ID, body: 'Great lesson!', created_at: '2026-06-10T10:00:00Z' },
        ],
      };

      // Fake the count-only head query
      supabase.select.mockImplementationOnce(() => ({ ...supabase, count: 3, error: null, data: null }));
      // Fake the comments query
      supabase.limit.mockResolvedValueOnce({ data: supabase.data, error: null });

      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID }, authUser: null });
      const { reply, ...state } = makeReply();

      await controller.getFeedback(req, reply);

      expect(state.statusCode).toBe(200);
      const body = state.payload as any;
      expect(body.data).toHaveProperty('likeCount');
      expect(body.data).toHaveProperty('myLike');
      expect(body.data).toHaveProperty('comments');
    });

    it('returns 200 with myLike=true when the caller has already liked', async () => {
      const supabase: any = buildSupabaseMock();
      // HEAD count query
      supabase.select.mockReturnValueOnce({ ...supabase, count: 1, error: null });
      // My-reaction lookup
      supabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'r1' }, error: null });
      // Comments query
      supabase.limit.mockResolvedValueOnce({ data: [], error: null });

      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID }, authUser: { id: LEARNER_ID } });
      const { reply, ...state } = makeReply();

      await controller.getFeedback(req, reply);

      expect(state.statusCode).toBe(200);
    });

    it('returns 500 when the database errors', async () => {
      const supabase: any = buildSupabaseMock();
      supabase.select.mockReturnValueOnce({ count: null, error: new Error('DB error') });

      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID } });
      const { reply, ...state } = makeReply();

      await controller.getFeedback(req, reply);

      expect(state.statusCode).toBe(500);
    });
  });

  describe('toggleReaction', () => {
    it('returns 401 when called without authentication', async () => {
      const supabase: any = buildSupabaseMock();
      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID }, authUser: null });
      const { reply, ...state } = makeReply();

      await controller.toggleReaction(req, reply);

      expect(state.statusCode).toBe(401);
    });

    it('inserts a reaction and returns liked=true when no prior like exists', async () => {
      const supabase: any = buildSupabaseMock();
      // check existing → null
      supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // insert reaction
      supabase.eq.mockResolvedValueOnce({ error: null });
      // re-query count
      supabase.select.mockReturnValueOnce({ ...supabase });
      supabase.eq.mockResolvedValueOnce({ count: 1, error: null });

      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID }, authUser: { id: LEARNER_ID } });
      const { reply, ...state } = makeReply();

      await controller.toggleReaction(req, reply);

      expect(state.statusCode).toBe(200);
    });

    it('deletes a reaction and returns liked=false when a prior like exists', async () => {
      const supabase: any = buildSupabaseMock();
      // check existing → found
      supabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'r1' }, error: null });
      // delete reaction
      supabase.eq.mockResolvedValueOnce({ error: null });
      // re-query count
      supabase.select.mockReturnValueOnce({ ...supabase });
      supabase.eq.mockResolvedValueOnce({ count: 0, error: null });

      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID }, authUser: { id: LEARNER_ID } });
      const { reply, ...state } = makeReply();

      await controller.toggleReaction(req, reply);

      expect(state.statusCode).toBe(200);
    });
  });

  describe('addComment', () => {
    it('returns 401 when called without authentication', async () => {
      const supabase: any = buildSupabaseMock();
      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID }, body: { body: 'Nice lesson' }, authUser: null });
      const { reply, ...state } = makeReply();

      await controller.addComment(req, reply);

      expect(state.statusCode).toBe(401);
    });

    it('returns 400 when body is empty', async () => {
      const supabase: any = buildSupabaseMock();
      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID }, body: { body: '   ' }, authUser: { id: LEARNER_ID } });
      const { reply, ...state } = makeReply();

      await controller.addComment(req, reply);

      expect(state.statusCode).toBe(400);
    });

    it('returns 201 with the saved comment on success', async () => {
      const supabase: any = buildSupabaseMock();
      const saved = { id: 'cmt-1', lesson_id: LESSON_ID, learner_id: LEARNER_ID, body: 'Nice lesson', created_at: '2026-06-10T10:00:00Z' };
      supabase.single.mockResolvedValueOnce({ data: saved, error: null });

      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID }, body: { body: 'Nice lesson' }, authUser: { id: LEARNER_ID } });
      const { reply, ...state } = makeReply();

      await controller.addComment(req, reply);

      expect(state.statusCode).toBe(201);
      const payload = state.payload as any;
      expect(payload.data.body).toBe('Nice lesson');
    });

    it('returns 400 when body is missing entirely', async () => {
      const supabase: any = buildSupabaseMock();
      const controller = new LessonFeedbackController(supabase, logger);
      const req = makeRequest({ params: { lessonId: LESSON_ID }, body: {}, authUser: { id: LEARNER_ID } });
      const { reply, ...state } = makeReply();

      await controller.addComment(req, reply);

      expect(state.statusCode).toBe(400);
    });
  });
});
