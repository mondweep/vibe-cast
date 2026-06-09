import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../../shared/infrastructure/logging/Logger';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Coupon Controller — learner-facing coupon redemption + access query (ADR-018).
 *
 * POST /api/v1/coupons/redeem  — redeem a coupon code for premium access
 * GET  /api/v1/coupons/my-access — list the caller's active access grants
 */
export class CouponController {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
  ) {}

  private userId(request: FastifyRequest): string | null {
    return (request as any).authUser?.id ?? (request as any).authUser?.sub ?? null;
  }

  /**
   * POST /api/v1/coupons/redeem
   * Body: { code: string }
   *
   * Validates the coupon, checks for duplicate redemption, inserts a
   * redemption row, and increments use_count on the coupon atomically.
   */
  async redeemCoupon(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const userId = this.userId(request);
    const { code } = (request.body as any) ?? {};

    try {
      if (!userId) {
        return reply
          .status(401)
          .send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
      }
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return reply
          .status(400)
          .send(errorResponse('code is required', 'VALIDATION_ERROR', undefined, correlationId));
      }

      const normalised = code.trim().toUpperCase();

      // Load coupon
      const { data: coupon, error: couponErr } = await this.supabase
        .from('ruflo_demo_coupon')
        .select('id, code, is_active, expires_at, max_uses, use_count, tier_access, notes')
        .eq('code', normalised)
        .maybeSingle();

      if (couponErr) throw couponErr;

      if (!coupon) {
        return reply
          .status(404)
          .send(errorResponse('Coupon code not found', 'NOT_FOUND', undefined, correlationId));
      }

      if (!coupon.is_active) {
        return reply
          .status(410)
          .send(errorResponse('Coupon is no longer active', 'COUPON_EXPIRED', undefined, correlationId));
      }

      if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
        return reply
          .status(410)
          .send(errorResponse('Coupon has expired', 'COUPON_EXPIRED', undefined, correlationId));
      }

      if (coupon.max_uses != null && coupon.use_count >= coupon.max_uses) {
        return reply
          .status(422)
          .send(errorResponse('Coupon has reached maximum uses', 'MAX_USES_REACHED', undefined, correlationId));
      }

      // Check duplicate redemption
      const { data: existing, error: existErr } = await this.supabase
        .from('ruflo_demo_coupon_redemption')
        .select('id')
        .eq('user_id', userId)
        .eq('coupon_id', coupon.id)
        .maybeSingle();

      if (existErr) throw existErr;

      if (existing) {
        return reply
          .status(409)
          .send(errorResponse('You have already redeemed this coupon', 'ALREADY_REDEEMED', undefined, correlationId));
      }

      // Insert redemption
      const redemptionId = uuidv4();
      const { error: insertErr } = await this.supabase
        .from('ruflo_demo_coupon_redemption')
        .insert({
          id: redemptionId,
          user_id: userId,
          coupon_id: coupon.id,
          access_expires_at: coupon.expires_at,
          redeemed_at: new Date().toISOString(),
        });

      if (insertErr) throw insertErr;

      // Increment use_count
      const { error: updateErr } = await this.supabase
        .from('ruflo_demo_coupon')
        .update({ use_count: coupon.use_count + 1 })
        .eq('id', coupon.id);

      if (updateErr) throw updateErr;

      this.logger.info('Coupon redeemed', { correlationId, userId, couponId: coupon.id, redemptionId });
      reply.status(200).send(
        successResponse({
          redemptionId,
          accessExpiresAt: coupon.expires_at,
          tierAccess: coupon.tier_access ?? [],
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('redeemCoupon failed', { error: message, correlationId, userId });
      reply
        .status(500)
        .send(errorResponse('Failed to redeem coupon', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * GET /api/v1/coupons/my-access
   * Returns the caller's active (non-expired) coupon access grants.
   */
  async getMyAccess(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    const userId = this.userId(request);

    try {
      if (!userId) {
        return reply
          .status(401)
          .send(errorResponse('Authentication required', 'UNAUTHORIZED', undefined, correlationId));
      }

      const { data, error } = await this.supabase
        .from('ruflo_demo_coupon_redemption')
        .select(`
          id,
          access_expires_at,
          redeemed_at,
          ruflo_demo_coupon!inner ( tier_access, notes, is_active )
        `)
        .eq('user_id', userId)
        .eq('ruflo_demo_coupon.is_active', true)
        .gt('access_expires_at', new Date().toISOString());

      if (error) throw error;

      const grants = (data ?? []).map((row: any) => ({
        id: row.id,
        accessExpiresAt: row.access_expires_at,
        redeemedAt: row.redeemed_at,
        tierAccess: row.ruflo_demo_coupon?.tier_access ?? [],
        notes: row.ruflo_demo_coupon?.notes ?? null,
      }));

      reply.status(200).send(successResponse(grants));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('getMyAccess failed', { error: message, correlationId, userId });
      reply
        .status(500)
        .send(errorResponse('Failed to fetch access grants', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}
