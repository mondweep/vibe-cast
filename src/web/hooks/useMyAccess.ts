import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { couponApi, CouponAccessGrant } from '@/api/coupons';

export function useMyAccess() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-access'],
    queryFn: couponApi.getMyAccess,
    enabled: !!user,
  });

  const access: CouponAccessGrant[] = data ?? [];

  const hasAccessTo = (tier: string): boolean =>
    access.some(
      (r) =>
        r.tierAccess?.includes(tier.toUpperCase()) ||
        r.tierAccess?.includes('ALL'),
    );

  const getExpiryFor = (tier: string): string | null => {
    const record = access.find(
      (r) =>
        r.tierAccess?.includes(tier.toUpperCase()) ||
        r.tierAccess?.includes('ALL'),
    );
    return record?.accessExpiresAt ?? null;
  };

  return { access, hasAccessTo, getExpiryFor, isLoading, refetch };
}
