import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../../shared/infrastructure/logging/Logger';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Admin Coupons Controller — coupon lifecycle management (ADR-018).
 *
 * All endpoints require request.authUser.role === 'admin'.
 *
 * GET    /api/v1/admin/coupons            — list all coupons
 * POST   /api/v1/admin/coupons            — create a new coupon
 * PATCH  /api/v1/admin/coupons/:id/renew  — extend expiry + update redemptions
 * DELETE /api/v1/admin/coupons/:id        — soft-deactivate a coupon
 */
export class AdminCouponsController {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
  ) {}

  private generateCode(): string {
    const part1 = randomBytes(4).toString('hex').toUpperCase().slice(0, 4);
    const part2 = randomBytes(4).toString('hex').toUpperCase().slice(0, 4);
    return `RUFLO-${part1}-${part2}`;
  }

  private isAdmin(request: FastifyRequest): boolean {
    return (request as any).authUser?.role === 'admin';
  }

  private adminGuard(request: FastifyRequest, reply: FastifyReply, correlationId: string): boolean {
    if (!this.isAdmin(request)) {
      reply
        .status(403)
        .send(errorResponse('Admin access required', 'FORBIDDEN', undefined, correlationId));
      return false;
    }
    return true;
  }

  /**
   * GET /api/v1/admin/coupons
   * Returns all coupons ordered by created_at DESC.
   * Optional query param: email — filters by assigned_to_email (case-insensitive partial match).
   * Each coupon includes redemption info (first redemption) flattened into the row.
   */
  async listCoupons(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    if (!this.adminGuard(request, reply, correlationId)) return;

    try {
      const email = (request.query as any).email;

      let query = this.supabase
        .from('ruflo_demo_coupon')
        .select(`
          *,
          ruflo_demo_coupon_redemption (
            user_id,
            redeemed_at,
            access_expires_at
          )
        `)
        .order('created_at', { ascending: false });

      if (email) {
        query = query.ilike('assigned_to_email', `%${email}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data ?? []).map((c: any) => {
        const redemption = c.ruflo_demo_coupon_redemption?.[0] ?? null;
        return {
          ...c,
          ruflo_demo_coupon_redemption: undefined,
          redeemed_by_user_id: redemption?.user_id ?? null,
          redeemed_at: redemption?.redeemed_at ?? null,
          redemption_expires_at: redemption?.access_expires_at ?? null,
        };
      });

      reply.status(200).send(successResponse(mapped));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('listCoupons failed', { error: message, correlationId });
      reply
        .status(500)
        .send(errorResponse('Failed to list coupons', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * POST /api/v1/admin/coupons
   * Body: { expiresInDays?, maxUses?, tierAccess?, notes?, assignedToEmail?, assignedToName? }
   *
   * Auto-generates a RUFLO-XXXX-XXXX code.
   * tierAccess defaults to ['INTERMEDIATE','ADVANCED'] if omitted.
   */
  async createCoupon(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    if (!this.adminGuard(request, reply, correlationId)) return;

    const body = (request.body as any) ?? {};
    const expiresInDays: number = typeof body.expiresInDays === 'number' ? body.expiresInDays : 7;
    const maxUses: number = typeof body.maxUses === 'number' ? body.maxUses : 1;
    const tierAccess: string[] = Array.isArray(body.tierAccess)
      ? body.tierAccess
      : ['INTERMEDIATE', 'ADVANCED'];
    const notes: string | null = typeof body.notes === 'string' ? body.notes : null;
    const assignedToEmail: string | null =
      typeof body.assignedToEmail === 'string' ? body.assignedToEmail : null;
    const assignedToName: string | null =
      typeof body.assignedToName === 'string' ? body.assignedToName : null;

    try {
      const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
      const code = this.generateCode();
      const id = uuidv4();

      const { data, error } = await this.supabase
        .from('ruflo_demo_coupon')
        .insert({
          id,
          code,
          is_active: true,
          expires_at: expiresAt,
          max_uses: maxUses,
          use_count: 0,
          tier_access: tierAccess,
          notes,
          assigned_to_email: assignedToEmail,
          assigned_to_name: assignedToName,
        })
        .select('id, code, is_active, expires_at, max_uses, use_count, tier_access, notes, assigned_to_email, assigned_to_name, created_at')
        .single();

      if (error) throw error;

      this.logger.info('Coupon created', { correlationId, couponId: id, code, assignedToEmail });
      reply.status(201).send(successResponse(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('createCoupon failed', { error: message, correlationId });
      reply
        .status(500)
        .send(errorResponse('Failed to create coupon', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * PATCH /api/v1/admin/coupons/:id/renew
   * Body: { expiresInDays: number }
   *
   * Extends the coupon expiry and updates all existing redemptions so holders
   * retain access until the new expiry date.
   */
  async renewCoupon(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    if (!this.adminGuard(request, reply, correlationId)) return;

    const { id } = request.params as { id: string };
    const { expiresInDays } = (request.body as any) ?? {};

    if (typeof expiresInDays !== 'number' || expiresInDays <= 0) {
      return reply
        .status(400)
        .send(errorResponse('expiresInDays must be a positive number', 'VALIDATION_ERROR', undefined, correlationId));
    }

    try {
      const newExpires = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();

      const { data: coupon, error: couponErr } = await this.supabase
        .from('ruflo_demo_coupon')
        .update({ expires_at: newExpires })
        .eq('id', id)
        .select('id, code, is_active, expires_at, max_uses, use_count, tier_access, notes, created_at')
        .maybeSingle();

      if (couponErr) throw couponErr;
      if (!coupon) {
        return reply
          .status(404)
          .send(errorResponse('Coupon not found', 'NOT_FOUND', undefined, correlationId));
      }

      // Extend all existing redemptions so holders keep access
      const { error: redemptionErr } = await this.supabase
        .from('ruflo_demo_coupon_redemption')
        .update({ access_expires_at: newExpires })
        .eq('coupon_id', id);

      if (redemptionErr) throw redemptionErr;

      this.logger.info('Coupon renewed', { correlationId, couponId: id, newExpires });
      reply.status(200).send(successResponse(coupon));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('renewCoupon failed', { error: message, correlationId, couponId: id });
      reply
        .status(500)
        .send(errorResponse('Failed to renew coupon', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  /**
   * DELETE /api/v1/admin/coupons/:id
   * Soft-deactivates the coupon (is_active = false). Returns 204.
   */
  async deactivateCoupon(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId ?? uuidv4();
    if (!this.adminGuard(request, reply, correlationId)) return;

    const { id } = request.params as { id: string };

    try {
      const { error } = await this.supabase
        .from('ruflo_demo_coupon')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      this.logger.info('Coupon deactivated', { correlationId, couponId: id });
      reply.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('deactivateCoupon failed', { error: message, correlationId, couponId: id });
      reply
        .status(500)
        .send(errorResponse('Failed to deactivate coupon', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}
