import { FastifyInstance } from 'fastify';
import { CouponController } from '../controllers/coupon';

/**
 * Coupon Routes — learner coupon redemption (ADR-018).
 *
 * All routes require Supabase JWT authentication.
 *
 * POST /api/v1/coupons/redeem      — redeem a coupon code
 * GET  /api/v1/coupons/my-access   — list active access grants for the caller
 */
export async function registerCouponRoutes(
  fastify: FastifyInstance,
  controller: CouponController,
): Promise<void> {
  fastify.post('/api/v1/coupons/redeem', (req, reply) =>
    controller.redeemCoupon(req, reply),
  );
  fastify.get('/api/v1/coupons/my-access', (req, reply) =>
    controller.getMyAccess(req, reply),
  );
}
