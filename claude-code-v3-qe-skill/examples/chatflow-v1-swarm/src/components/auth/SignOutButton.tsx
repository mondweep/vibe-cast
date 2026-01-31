'use client';

/**
 * SignOutButton Component
 *
 * Button that triggers sign-out flow.
 */

import { useSession, signOut } from 'next-auth/react';

export function SignOutButton() {
  const { status } = useSession();

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <button
      onClick={() => signOut()}
      className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      Sign out
    </button>
  );
}
