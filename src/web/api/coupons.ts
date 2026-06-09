import apiClient from './client';

export interface CouponRedeemPayload {
  code: string;
}

export interface CouponRedeemResult {
  redemptionId: string;
  accessExpiresAt: string | null;
  tierAccess: string[];
}

export interface CouponAccessGrant {
  id: string;
  accessExpiresAt: string;
  redeemedAt: string;
  tierAccess: string[];
  notes: string | null;
}

export interface AdminCoupon {
  id: string;
  code: string;
  tierAccess: string[];
  expiresAt: string;
  maxUses: number;
  useCount: number;
  isActive: boolean;
  notes?: string;
}

export interface CreateCouponBody {
  expiresInDays?: number;
  maxUses?: number;
  tierAccess?: string[];
  notes?: string;
}

/** Learner-facing coupon API (ADR-018). */
export const couponApi = {
  /**
   * Redeem a coupon code for premium access.
   * Returns the redemption record including access expiry and tiers unlocked.
   */
  async redeem(payload: CouponRedeemPayload): Promise<CouponRedeemResult> {
    const { data } = await apiClient.post<{ data: CouponRedeemResult }>('/coupons/redeem', payload);
    return data.data;
  },

  /**
   * Return the caller's active (non-expired) coupon access grants.
   */
  async getMyAccess(): Promise<CouponAccessGrant[]> {
    const { data } = await apiClient.get<{ data: CouponAccessGrant[] }>('/coupons/my-access');
    return data.data ?? [];
  },

  // Admin endpoints
  listCoupons: (): Promise<AdminCoupon[]> =>
    apiClient.get('/admin/coupons').then((r) => r.data?.data ?? []),

  createCoupon: (body: CreateCouponBody): Promise<AdminCoupon> =>
    apiClient.post('/admin/coupons', body).then((r) => r.data?.data),

  renewCoupon: (id: string, expiresInDays: number): Promise<AdminCoupon> =>
    apiClient.patch(`/admin/coupons/${id}/renew`, { expiresInDays }).then((r) => r.data?.data),

  deactivateCoupon: (id: string): Promise<void> =>
    apiClient.delete(`/admin/coupons/${id}`),
};

export default couponApi;
