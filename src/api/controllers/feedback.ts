import { FastifyRequest, FastifyReply } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import { successResponse, errorResponse } from '../utils/response';

const CATEGORIES = ['comment', 'suggestion', 'content_error'] as const;
type Category = (typeof CATEGORIES)[number];

// Bounds keep the table tidy and reject abuse at the boundary (CLAUDE.md:
// "Validate input at system boundaries").
const MAX = { subject: 200, message: 5000, name: 120, email: 254, context: 300 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/**
 * Feedback controller — stores submissions from the in-app "Feedback & contact"
 * form (ADR: accuracy-first; content-error reports flag wrong commands/lessons/
 * tutor answers). The endpoint is public so anonymous visitors can submit;
 * when a signed-in learner submits, their user id/email is attached from the
 * verified session. Rows are private (RLS: service-read only).
 */
export class FeedbackController {
  constructor(private supabase: SupabaseClient, private logger: Logger) {}

  async submit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const body = (request.body as any) || {};

    const category = String(body.category || '').trim() as Category;
    if (!CATEGORIES.includes(category)) {
      return reply
        .status(400)
        .send(errorResponse('Invalid feedback category', 'BAD_REQUEST', undefined, correlationId));
    }

    const message = clean(body.message, MAX.message);
    if (!message) {
      return reply
        .status(400)
        .send(errorResponse('A message is required', 'BAD_REQUEST', undefined, correlationId));
    }

    const email = clean(body.email, MAX.email);
    if (email && !EMAIL_RE.test(email)) {
      return reply
        .status(400)
        .send(errorResponse('Please provide a valid email address', 'BAD_REQUEST', undefined, correlationId));
    }

    // Trust the verified session over anything in the body for identity.
    const authUser = (request as FastifyRequest & { authUser?: { id: string; email?: string } }).authUser;

    const row = {
      category,
      subject: clean(body.subject, MAX.subject),
      message,
      name: clean(body.name, MAX.name),
      email: email || clean(authUser?.email, MAX.email),
      page_context: clean(body.pageContext, MAX.context),
      user_id: authUser?.id ?? null,
      allow_public: body.allowPublic === true,
    };

    try {
      // No .select() → PostgREST does not return the row, so no SELECT policy is
      // needed for the anon/publishable key path (submissions remain private).
      const { error } = await this.supabase.from('ruflo_demo_feedback').insert(row);
      if (error) throw error;

      // Log that feedback arrived (category only — never the message/email/name).
      this.logger.info('Feedback received', { category, hasEmail: !!row.email, correlationId });
      reply.status(201).send(successResponse({ received: true }));
    } catch (error) {
      const messageStr = error instanceof Error ? error.message : String(error);
      this.logger.error('Feedback submission failed', { error: messageStr, correlationId });
      reply
        .status(500)
        .send(errorResponse('Could not save your feedback. Please try again.', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}
