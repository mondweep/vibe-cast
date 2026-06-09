import { FastifyInstance } from 'fastify';
import { AdminCouponsController } from '../controllers/adminCoupons';

/**
 * Admin Coupon Routes — coupon lifecycle management (ADR-018).
 *
 * All routes require admin role (enforced inside the controller).
 *
 * GET    /api/v1/admin/coupons            — list all coupons
 * POST   /api/v1/admin/coupons            — create a new coupon
 * PATCH  /api/v1/admin/coupons/:id/renew  — extend expiry
 * DELETE /api/v1/admin/coupons/:id        — soft-deactivate
 */
export async function registerAdminCouponRoutes(
  fastify: FastifyInstance,
  controller: AdminCouponsController,
): Promise<void> {
  fastify.get('/api/v1/admin/coupons', (req, reply) =>
    controller.listCoupons(req, reply),
  );
  fastify.post('/api/v1/admin/coupons', (req, reply) =>
    controller.createCoupon(req, reply),
  );
  fastify.patch('/api/v1/admin/coupons/:id/renew', (req, reply) =>
    controller.renewCoupon(req, reply),
  );
  fastify.delete('/api/v1/admin/coupons/:id', (req, reply) =>
    controller.deactivateCoupon(req, reply),
  );
}
