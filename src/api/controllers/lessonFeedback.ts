import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../../shared/infrastructure/logging/Logger';
import { successResponse, errorResponse } from '../utils/response';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ReactionRow {
  id: string;
  lesson_id: string;
  learner_id: string;
  reacted_at: string;
}

interface CommentRow {
  id: string;
  lesson_id: string;
  learner_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

const MAX_COMMENT_BODY = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lesson Feedback Controller — per-lesson likes (toggle) + comments.
 *
 * Reads ruflo_demo_lesson_reaction and ruflo_demo_lesson_comment.
 * Like counts are also surfaced on the learning-path catalog so cards
 * can show cumulative engagement (totalLikes).
 *
 * Auth is required for reactions and comment writes. Reads are public.
 */
export class LessonFeedbackController {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
  ) {}

  // ------------------------------------------------------------------ helpers

  private learnerId(request: FastifyRequest): string | null {
    return (request as any).authUser?.id ?? (request as any).authUser?.sub ?? null;
  }

  // -------------------------------------------------------------------- reads

  /**
   * GET /api/v1/lessons/:lessonId/feedback
   * Public. Returns { likeCount, myLike, comments }.
   * myLike is true only when the caller is authenticated and has liked.
   */
  async getFeedback(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const { lessonId } = request.params as { lessonId: string };
    const callerId = this.learnerId(request);

    try {
      // Like count
      const { count: likeCount, error: reactionErr } = await this.supabase
        .from('ruflo_demo_lesson_reaction')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_id', lessonId);

      if (reactionErr) throw reactionErr;

      // My like (only when authenticated)
      let myLike = false;
      if (callerId) {
        const { data: myReaction, error: myErr } = await this.supabase
          .from('ruflo_demo_lesson_reaction')
          .select('id')
          .eq('lesson_id', lessonId)
          .eq('learner_id', callerId)
          .maybeSingle();
        if (myErr) throw myErr;
        myLike = !!myReaction;
      }

      // Comments (newest first, cap at 100)
      const { data: comments, error: commentErr } = await this.supabase
        .from('ruflo_demo_lesson_comment')
        .select('id, learner_id, body, created_at')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (commentErr) throw commentErr;

      reply.status(200).send(
        successResponse({
          likeCount: likeCount ?? 0,
          myLike,
          comments: comments ?? [],
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('getFeedback failed', { error: message, correlationId, lessonId });
      reply
        .status(500)
        .send(errorResponse('Failed to load lesson feedback', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  // ------------------------------------------------------------------ writes

  /**
   * POST /api/v1/lessons/:lessonId/reactions
   * Auth required. Toggles the like for the authenticated learner.
   * Returns { liked: boolean, likeCount: number }.
   */
  async toggleReaction(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const { lessonId } = request.params as { lessonId: string };
    const learnerId = this.learnerId(request);

    if (!learnerId) {
      return reply
        .status(401)
        .send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
    }

    try {
      // Check existing reaction
      const { data: existing, error: checkErr } = await this.supabase
        .from('ruflo_demo_lesson_reaction')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('learner_id', learnerId)
        .maybeSingle();

      if (checkErr) throw checkErr;

      let liked: boolean;

      if (existing) {
        // Toggle off — delete the reaction
        const { error: deleteErr } = await this.supabase
          .from('ruflo_demo_lesson_reaction')
          .delete()
          .eq('lesson_id', lessonId)
          .eq('learner_id', learnerId);
        if (deleteErr) throw deleteErr;
        liked = false;
      } else {
        // Toggle on — insert reaction
        const { error: insertErr } = await this.supabase
          .from('ruflo_demo_lesson_reaction')
          .insert({ lesson_id: lessonId, learner_id: learnerId });
        if (insertErr) throw insertErr;
        liked = true;
      }

      // Re-query count so the response is always accurate
      const { count: likeCount, error: countErr } = await this.supabase
        .from('ruflo_demo_lesson_reaction')
        .select('*', { count: 'exact', head: true })
        .eq('lesson_id', lessonId);
      if (countErr) throw countErr;

      this.logger.info('Reaction toggled', { correlationId, lessonId, learnerId, liked });
      reply.status(200).send(successResponse({ liked, likeCount: likeCount ?? 0 }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('toggleReaction failed', { error: message, correlationId, lessonId, learnerId });
      reply
        .status(500)
        .send(errorResponse('Failed to toggle reaction', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * POST /api/v1/lessons/:lessonId/comments
   * Auth required. Body: { body: string }.
   * Returns the created comment row.
   */
  async addComment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const { lessonId } = request.params as { lessonId: string };
    const learnerId = this.learnerId(request);

    if (!learnerId) {
      return reply
        .status(401)
        .send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
    }

    const rawBody = ((request.body as any) ?? {}).body;
    const body =
      typeof rawBody === 'string' ? rawBody.trim().slice(0, MAX_COMMENT_BODY) : '';

    if (!body) {
      return reply
        .status(400)
        .send(errorResponse('Comment body is required', 'VALIDATION_ERROR', undefined, correlationId));
    }

    try {
      const { data, error: insertErr } = await this.supabase
        .from('ruflo_demo_lesson_comment')
        .insert({ lesson_id: lessonId, learner_id: learnerId, body })
        .select('id, lesson_id, learner_id, body, created_at')
        .single();

      if (insertErr) throw insertErr;

      this.logger.info('Comment added', { correlationId, lessonId, learnerId });
      reply.status(201).send(successResponse(data as CommentRow));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('addComment failed', { error: message, correlationId, lessonId, learnerId });
      reply
        .status(500)
        .send(errorResponse('Failed to add comment', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}
