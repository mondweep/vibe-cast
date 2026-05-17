import { useAuth } from './useAuth';

// Must stay in sync with:
//   - api/routes/songs.ts → CURATOR_EMAILS
//   - api/routes/songRequests.ts → CURATOR_EMAILS
//   - supabase/migrations/011_song_requests.sql → RLS policy literals
//
// The server (RLS + endpoint checks) is the source of truth for authorisation.
// This hook is only for client-side UI gating (showing/hiding the URL input,
// the Queue tab, the curator banner). Even if a malicious user spoofed it,
// the server would still reject any curator-only API call.
export const CURATOR_EMAILS = new Set<string>([
  'mondweep@gmail.com',
  'mondweep@dxsure.uk',
]);

export function useCurator(): { isCurator: boolean; email: string | null } {
  const { user } = useAuth();
  const email = (user?.email || '').toLowerCase();
  return {
    isCurator: !!email && CURATOR_EMAILS.has(email),
    email: email || null,
  };
}
