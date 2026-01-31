'use client';

/**
 * SignInButton Component
 *
 * Button that triggers OAuth sign-in flow.
 */

import { useSession, signIn } from 'next-auth/react';

export function SignInButton() {
  const { status } = useSession();

  if (status === 'authenticated') {
    return null;
  }

  return (
    <button
      onClick={() => signIn()}
      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      Sign in
    </button>
  );
}
