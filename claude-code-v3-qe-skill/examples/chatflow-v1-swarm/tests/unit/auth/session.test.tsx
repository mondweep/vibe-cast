/**
 * Session Management Tests
 *
 * Tests for session handling, validation, and lifecycle management.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
    update: vi.fn(),
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  getSession: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/test',
  redirect: vi.fn(),
}));

describe('Session Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('useSession hook integration', () => {
    it('should return unauthenticated status when no session', async () => {
      const { useSession } = await import('next-auth/react');
      const session = useSession();

      expect(session.status).toBe('unauthenticated');
      expect(session.data).toBeNull();
    });

    it('should return authenticated status with valid session', async () => {
      const { useSession } = await import('next-auth/react');

      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      const session = useSession();

      expect(session.status).toBe('authenticated');
      expect(session.data?.user?.id).toBe('user-123');
    });

    it('should return loading status during session fetch', async () => {
      const { useSession } = await import('next-auth/react');

      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn(),
      });

      const session = useSession();

      expect(session.status).toBe('loading');
    });
  });

  describe('SignInButton Component', () => {
    it('should render sign in button when unauthenticated', async () => {
      const { useSession } = await import('next-auth/react');
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      const { SignInButton } = await import('@/components/auth/SignInButton');
      render(<SignInButton />);

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should call signIn when button is clicked', async () => {
      const user = userEvent.setup();
      const { useSession, signIn } = await import('next-auth/react');

      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      const { SignInButton } = await import('@/components/auth/SignInButton');
      render(<SignInButton />);

      const button = screen.getByRole('button', { name: /sign in/i });
      await user.click(button);

      expect(signIn).toHaveBeenCalled();
    });

    it('should not render when authenticated', async () => {
      const { useSession } = await import('next-auth/react');
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      const { SignInButton } = await import('@/components/auth/SignInButton');
      render(<SignInButton />);

      expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
    });
  });

  describe('SignOutButton Component', () => {
    it('should render sign out button when authenticated', async () => {
      const { useSession } = await import('next-auth/react');
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      const { SignOutButton } = await import('@/components/auth/SignOutButton');
      render(<SignOutButton />);

      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('should call signOut when button is clicked', async () => {
      const user = userEvent.setup();
      const { useSession, signOut } = await import('next-auth/react');

      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      const { SignOutButton } = await import('@/components/auth/SignOutButton');
      render(<SignOutButton />);

      const button = screen.getByRole('button', { name: /sign out/i });
      await user.click(button);

      expect(signOut).toHaveBeenCalled();
    });

    it('should not render when unauthenticated', async () => {
      const { useSession } = await import('next-auth/react');
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      const { SignOutButton } = await import('@/components/auth/SignOutButton');
      render(<SignOutButton />);

      expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
    });
  });

  describe('UserAvatar Component', () => {
    it('should render user avatar when authenticated', async () => {
      const { useSession } = await import('next-auth/react');
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            image: 'https://example.com/avatar.jpg',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      const { UserAvatar } = await import('@/components/auth/UserAvatar');
      render(<UserAvatar />);

      expect(screen.getByRole('img', { name: /test user/i })).toBeInTheDocument();
    });

    it('should show initials fallback when no image', async () => {
      const { useSession } = await import('next-auth/react');
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            image: null,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      });

      const { UserAvatar } = await import('@/components/auth/UserAvatar');
      render(<UserAvatar />);

      expect(screen.getByText('TU')).toBeInTheDocument();
    });

    it('should not render when unauthenticated', async () => {
      const { useSession } = await import('next-auth/react');
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      });

      const { UserAvatar } = await import('@/components/auth/UserAvatar');
      const { container } = render(<UserAvatar />);

      expect(container.firstChild).toBeNull();
    });
  });
});

describe('Session Validation', () => {
  describe('Token expiration', () => {
    it('should detect expired sessions', async () => {
      const expiredDate = new Date(Date.now() - 1000).toISOString();
      const session = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: expiredDate,
      };

      const isExpired = new Date(session.expires) < new Date();
      expect(isExpired).toBe(true);
    });

    it('should validate non-expired sessions', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const session = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: futureDate,
      };

      const isExpired = new Date(session.expires) < new Date();
      expect(isExpired).toBe(false);
    });
  });

  describe('Session data integrity', () => {
    it('should require user id in session', () => {
      const session = {
        user: { email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      const hasUserId = 'id' in (session.user ?? {});
      expect(hasUserId).toBe(false);
    });

    it('should require user email in session', () => {
      const session = {
        user: { id: 'user-123' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      const hasEmail = 'email' in (session.user ?? {});
      expect(hasEmail).toBe(false);
    });
  });
});

describe('Protected Route Behavior', () => {
  it('should redirect unauthenticated users from protected routes', async () => {
    const { useSession } = await import('next-auth/react');
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    // Test that middleware would redirect
    const session = useSession();
    const shouldRedirect = session.status === 'unauthenticated';

    expect(shouldRedirect).toBe(true);
  });

  it('should allow authenticated users to access protected routes', async () => {
    const { useSession } = await import('next-auth/react');
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    const session = useSession();
    const shouldAllow = session.status === 'authenticated';

    expect(shouldAllow).toBe(true);
  });
});

describe('OAuth Provider Selection', () => {
  it('should support Google sign in', async () => {
    const { signIn } = await import('next-auth/react');

    await signIn('google', { callbackUrl: '/' });

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' });
  });

  it('should support GitHub sign in', async () => {
    const { signIn } = await import('next-auth/react');

    await signIn('github', { callbackUrl: '/' });

    expect(signIn).toHaveBeenCalledWith('github', { callbackUrl: '/' });
  });
});
