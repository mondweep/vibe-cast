'use client';

/**
 * Sign Out Page
 *
 * Confirms sign out action and handles the sign out flow.
 * Shows appropriate UI based on authentication status.
 */

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SignOutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedOut, setIsSignedOut] = useState(false);

  // Redirect if not authenticated and not just signed out
  useEffect(() => {
    if (status === 'unauthenticated' && !isSignedOut) {
      router.push('/sign-in');
    }
  }, [status, router, isSignedOut]);

  /**
   * Handles the sign out action
   */
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({ redirect: false });
      setIsSignedOut(true);
    } catch (err) {
      console.error('Sign out error:', err);
      setIsLoading(false);
    }
  };

  /**
   * Handles cancellation - returns to previous page
   */
  const handleCancel = () => {
    router.back();
  };

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Successfully signed out
  if (isSignedOut) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Message */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Signed Out</h1>
            <p className="mt-2 text-muted-foreground">
              You have been successfully signed out. See you next time!
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <Button onClick={() => router.push('/sign-in')} className="w-full">
              Sign in again
            </Button>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Go to home page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show confirmation
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign Out</h1>
          <p className="mt-2 text-muted-foreground">
            Are you sure you want to sign out?
          </p>
        </div>

        {/* User Info */}
        {session?.user && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-4">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User avatar'}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-medium text-primary-foreground">
                  {session.user.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium">{session.user.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          <Button
            onClick={handleSignOut}
            disabled={isLoading}
            variant="destructive"
            className="w-full"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Signing out...</span>
              </div>
            ) : (
              'Sign out'
            )}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        </div>

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground">
          You can always sign back in at any time.
        </p>
      </div>
    </div>
  );
}
