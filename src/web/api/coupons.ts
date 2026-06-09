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
  tier_access: string[];
  expires_at: string;
  max_uses: number;
  use_count: number;
  is_active: boolean;
  notes: string | null;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  created_at: string;
  redeemed_by_user_id: string | null;
  redeemed_at: string | null;
  redemption_expires_at: string | null;
}

export interface CreateCouponBody {
  tierAccess: string[];
  expiresInDays?: number;
  maxUses?: number;
  notes?: string;
  assignedToEmail?: string;
  assignedToName?: string;
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
  listCoupons: (email?: string): Promise<AdminCoupon[]> =>
    apiClient
      .get(`/admin/coupons${email ? `?email=${encodeURIComponent(email)}` : ''}`)
      .then((r) => r.data?.data ?? []),

  createCoupon: (body: CreateCouponBody): Promise<AdminCoupon> =>
    apiClient.post('/admin/coupons', body).then((r) => r.data?.data),

  renewCoupon: (id: string, expiresInDays: number): Promise<AdminCoupon> =>
    apiClient.patch(`/admin/coupons/${id}/renew`, { expiresInDays }).then((r) => r.data?.data),

  deactivateCoupon: (id: string): Promise<void> =>
    apiClient.delete(`/admin/coupons/${id}`),
};

export default couponApi;
