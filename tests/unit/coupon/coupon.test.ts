import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CouponController } from '../../../src/api/controllers/coupon';
import { AdminCouponsController } from '../../../src/api/controllers/adminCoupons';
import { ConsoleLogger } from '../../../src/shared/infrastructure/logging/Logger';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Coupon Controller Tests (ADR-018)
 *
 * Tests for:
 * - CouponController.redeemCoupon — all guard branches + happy path
 * - CouponController.getMyAccess — returns active non-expired redemptions
 * - AdminCouponsController.createCoupon — code generation, admin guard
 * - AdminCouponsController.renewCoupon — updates coupon + redemptions
 */

// --------------------------------------------------------------------------
// Supabase mock factory
// --------------------------------------------------------------------------

function makeSupabaseMock() {
  const chain: Record<string, any> = {};

  // Every chained call returns the chain so we can mock at the terminal call
  const self = (result: any) => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    // Terminal for lists
    then: undefined as any,
    // Make the chain itself thenable for `await supabase.from(...).select(...)`
  });

  return self;
}

// Minimal fluent Supabase chain builder used per-test
function makeChain(options: {
  singleResult?: { data: any; error: any };
  listResult?: { data: any; error: any };
  insertResult?: { data: any; error: any };
  updateResult?: { data: any; error: any };
} = {}) {
  const singleResult = options.singleResult ?? { data: null, error: null };
  const listResult = options.listResult ?? { data: [], error: null };
  const insertResult = options.insertResult ?? { data: null, error: null };
  const updateResult = options.updateResult ?? { data: null, error: null };

  const chain: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue(insertResult),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(listResult),
    maybeSingle: vi.fn().mockResolvedValue(singleResult),
    single: vi.fn().mockResolvedValue(singleResult),
  };

  // After update() the chain still needs eq() → then a terminal
  chain.update.mockReturnValue({
    eq: vi.fn().mockResolvedValue(updateResult),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(singleResult),
    eq: vi.fn().mockReturnThis(),
  });

  return chain;
}

// --------------------------------------------------------------------------
// Request / Reply helpers
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
    correlationId: 'test-corr-001',
    body: {},
    params: {},
    headers: {},
    ...overrides,
  } as unknown as FastifyRequest;
}

// --------------------------------------------------------------------------
// CouponController tests
// --------------------------------------------------------------------------

describe('CouponController', () => {
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();
  });

  describe('redeemCoupon', () => {
    it('valid code: creates redemption and returns 200', async () => {
      const futureDateStr = new Date(Date.now() + 86_400_000 * 7).toISOString();
      const couponRow = {
        id: 'coupon-uuid-1',
        code: 'RUFLO-TEST-0001',
        is_active: true,
        expires_at: futureDateStr,
        max_uses: 5,
        use_count: 2,
        tier_access: ['INTERMEDIATE', 'ADVANCED'],
        notes: null,
      };

      // Build a supabase mock that returns the coupon on the first query,
      // no existing redemption on the second, and success on insert/update.
      let callCount = 0;
      const supabase: any = {
        from: vi.fn().mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            // First from() → coupon lookup
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: couponRow, error: null }),
            };
          }
          if (callCount === 2) {
            // Second from() → duplicate redemption check
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          if (callCount === 3) {
            // Third from() → insert redemption
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          // Fourth from() → update use_count
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      };

      const controller = new CouponController(supabase, logger);
      const request = makeRequest({
        authUser: { id: 'user-uuid-1' },
        body: { code: 'ruflo-test-0001' }, // lowercase to test normalisation
      });
      const reply = makeReply();

      await controller.redeemCoupon(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      const sent = (reply.send as any).mock.calls[0][0];
      expect(sent.status).toBe('success');
      expect(sent.data.tierAccess).toEqual(['INTERMEDIATE', 'ADVANCED']);
    });

    it('expired coupon: returns 410', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const couponRow = {
        id: 'coupon-uuid-2',
        code: 'RUFLO-EXPR-0001',
        is_active: true,
        expires_at: pastDate,
        max_uses: 1,
        use_count: 0,
        tier_access: ['INTERMEDIATE'],
        notes: null,
      };

      const supabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: couponRow, error: null }),
        }),
      };

      const controller = new CouponController(supabase, logger);
      const request = makeRequest({
        authUser: { id: 'user-uuid-2' },
        body: { code: 'RUFLO-EXPR-0001' },
      });
      const reply = makeReply();

      await controller.redeemCoupon(request, reply);

      expect(reply.status).toHaveBeenCalledWith(410);
      const sent = (reply.send as any).mock.calls[0][0];
      expect(sent.code).toBe('COUPON_EXPIRED');
    });

    it('already redeemed by same user: returns 409', async () => {
      const futureDateStr = new Date(Date.now() + 86_400_000).toISOString();
      const couponRow = {
        id: 'coupon-uuid-3',
        code: 'RUFLO-DUPE-0001',
        is_active: true,
        expires_at: futureDateStr,
        max_uses: 10,
        use_count: 1,
        tier_access: ['INTERMEDIATE'],
        notes: null,
      };

      let callCount = 0;
      const supabase: any = {
        from: vi.fn().mockImplementation(() => {
          callCount += 1;
          if (callCount === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: couponRow, error: null }),
            };
          }
          // Second call → existing redemption found
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'redemption-1' }, error: null }),
          };
        }),
      };

      const controller = new CouponController(supabase, logger);
      const request = makeRequest({
        authUser: { id: 'user-uuid-3' },
        body: { code: 'RUFLO-DUPE-0001' },
      });
      const reply = makeReply();

      await controller.redeemCoupon(request, reply);

      expect(reply.status).toHaveBeenCalledWith(409);
      const sent = (reply.send as any).mock.calls[0][0];
      expect(sent.code).toBe('ALREADY_REDEEMED');
    });

    it('max uses reached: returns 422', async () => {
      const futureDateStr = new Date(Date.now() + 86_400_000).toISOString();
      const couponRow = {
        id: 'coupon-uuid-4',
        code: 'RUFLO-FULL-0001',
        is_active: true,
        expires_at: futureDateStr,
        max_uses: 3,
        use_count: 3, // at max
        tier_access: ['INTERMEDIATE'],
        notes: null,
      };

      const supabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: couponRow, error: null }),
        }),
      };

      const controller = new CouponController(supabase, logger);
      const request = makeRequest({
        authUser: { id: 'user-uuid-4' },
        body: { code: 'RUFLO-FULL-0001' },
      });
      const reply = makeReply();

      await controller.redeemCoupon(request, reply);

      expect(reply.status).toHaveBeenCalledWith(422);
      const sent = (reply.send as any).mock.calls[0][0];
      expect(sent.code).toBe('MAX_USES_REACHED');
    });

    it('code not found: returns 404', async () => {
      const supabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      const controller = new CouponController(supabase, logger);
      const request = makeRequest({
        authUser: { id: 'user-uuid-5' },
        body: { code: 'RUFLO-NOPE-0001' },
      });
      const reply = makeReply();

      await controller.redeemCoupon(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      const sent = (reply.send as any).mock.calls[0][0];
      expect(sent.code).toBe('NOT_FOUND');
    });
  });

  describe('getMyAccess', () => {
    it('returns only active non-expired redemptions for the caller', async () => {
      const futureDateStr = new Date(Date.now() + 86_400_000 * 30).toISOString();
      const rows = [
        {
          id: 'redemption-active-1',
          access_expires_at: futureDateStr,
          redeemed_at: new Date().toISOString(),
          ruflo_demo_coupon: { tier_access: ['INTERMEDIATE', 'ADVANCED'], notes: 'Demo', is_active: true },
        },
      ];

      const supabase: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      };

      const controller = new CouponController(supabase, logger);
      const request = makeRequest({ authUser: { id: 'user-uuid-access' } });
      const reply = makeReply();

      await controller.getMyAccess(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      const sent = (reply.send as any).mock.calls[0][0];
      expect(sent.status).toBe('success');
      expect(sent.data).toHaveLength(1);
      expect(sent.data[0].tierAccess).toEqual(['INTERMEDIATE', 'ADVANCED']);
    });
  });
});

// --------------------------------------------------------------------------
// AdminCouponsController tests
// --------------------------------------------------------------------------

describe('AdminCouponsController', () => {
  let logger: ConsoleLogger;

  beforeEach(() => {
    logger = new ConsoleLogger();
  });

  describe('createCoupon', () => {
    it('generates a RUFLO-XXXX-XXXX code format and returns 201', async () => {
      const futureDateStr = new Date(Date.now() + 86_400_000 * 7).toISOString();
      let capturedInsertData: any = null;

      const supabase: any = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockImplementation((data: any) => {
            capturedInsertData = data;
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { ...data, created_at: futureDateStr },
                error: null,
              }),
            };
          }),
        }),
      };

      const controller = new AdminCouponsController(supabase, logger);
      const request = makeRequest({
        authUser: { id: 'admin-uuid-1', role: 'admin' },
        body: { expiresInDays: 7, maxUses: 5, tierAccess: ['INTERMEDIATE', 'ADVANCED'] },
      });
      const reply = makeReply();

      await controller.createCoupon(request, reply);

      expect(reply.status).toHaveBeenCalledWith(201);
      expect(capturedInsertData).toBeTruthy();
      expect(capturedInsertData.code).toMatch(/^RUFLO-[A-F0-9]{4}-[A-F0-9]{4}$/);
    });

    it('non-admin returns 403', async () => {
      const supabase: any = { from: vi.fn() };

      const controller = new AdminCouponsController(supabase, logger);
      const request = makeRequest({
        authUser: { id: 'user-uuid-learner', role: 'learner' },
        body: {},
      });
      const reply = makeReply();

      await controller.createCoupon(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      const sent = (reply.send as any).mock.calls[0][0];
      expect(sent.code).toBe('FORBIDDEN');
      // Should not have called supabase at all
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('renewCoupon', () => {
    it('updates both the coupon expiry and existing redemptions', async () => {
      const couponId = 'coupon-uuid-renew';
      const updatedCoupon = {
        id: couponId,
        code: 'RUFLO-RENW-0001',
        is_active: true,
        expires_at: new Date(Date.now() + 86_400_000 * 30).toISOString(),
        max_uses: 5,
        use_count: 2,
        tier_access: ['INTERMEDIATE'],
        notes: null,
        created_at: new Date().toISOString(),
      };

      let couponUpdateCalled = false;
      let redemptionUpdateCalled = false;

      const supabase: any = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'ruflo_demo_coupon') {
            couponUpdateCalled = true;
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: updatedCoupon, error: null }),
            };
          }
          // ruflo_demo_coupon_redemption
          redemptionUpdateCalled = true;
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      };

      const controller = new AdminCouponsController(supabase, logger);
      const request = makeRequest({
        authUser: { id: 'admin-uuid-2', role: 'admin' },
        params: { id: couponId },
        body: { expiresInDays: 30 },
      });
      const reply = makeReply();

      await controller.renewCoupon(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(couponUpdateCalled).toBe(true);
      expect(redemptionUpdateCalled).toBe(true);
    });
  });
});
