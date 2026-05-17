import { useAuth } from './useAuth';

/**
 * Returns whether the signed-in user is a curator.
 *
 * The actual authority lives server-side (RLS on `curator_allowlist` and
 * the `is_curator()` SECURITY DEFINER function in migration 013). This hook
 * just reads the boolean that AuthContext fetches via the `am_i_curator`
 * RPC after sign-in, so UI components can synchronously gate rendering.
 *
 * `isCurator` is `false` for signed-out users and during the brief window
 * after sign-in before the RPC returns. `AuthContext.isCurator` is `null`
 * during that window for components that want to render a "checking…" state.
 */
export function useCurator(): { isCurator: boolean; email: string | null } {
  const { user, isCurator } = useAuth();
  const email = (user?.email || '').toLowerCase();
  return {
    isCurator: isCurator === true,
    email: email || null,
  };
}
