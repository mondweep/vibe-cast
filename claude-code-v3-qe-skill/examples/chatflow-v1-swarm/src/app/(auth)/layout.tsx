/**
 * Auth Layout
 *
 * Shared layout for authentication pages (sign-in, sign-out).
 * Provides a clean, centered layout without navigation.
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - ChatFlow',
  description: 'Sign in or sign out of ChatFlow',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {children}
    </main>
  );
}
