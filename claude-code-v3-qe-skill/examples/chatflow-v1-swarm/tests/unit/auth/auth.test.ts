/**
 * NextAuth Configuration Tests
 *
 * Tests for the authentication configuration including
 * OAuth providers, callbacks, and session handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    account: {
      findUnique: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  })),
}));

// Mock the Prisma adapter
vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(() => ({
    createUser: vi.fn(),
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserByAccount: vi.fn(),
    updateUser: vi.fn(),
    linkAccount: vi.fn(),
    createSession: vi.fn(),
    getSessionAndUser: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    createVerificationToken: vi.fn(),
    useVerificationToken: vi.fn(),
  })),
}));

describe('NextAuth Configuration', () => {
  beforeEach(() => {
    // Set up environment variables for testing
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
    process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('authOptions', () => {
    it('should export authOptions configuration', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions).toBeDefined();
    });

    it('should have configured providers', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.providers).toBeDefined();
      expect(Array.isArray(authOptions.providers)).toBe(true);
      expect(authOptions.providers.length).toBeGreaterThanOrEqual(2);
    });

    it('should include Google OAuth provider', async () => {
      const { authOptions } = await import('@/lib/auth');
      const googleProvider = authOptions.providers.find(
        (p: { id: string }) => p.id === 'google'
      );
      expect(googleProvider).toBeDefined();
    });

    it('should include GitHub OAuth provider', async () => {
      const { authOptions } = await import('@/lib/auth');
      const githubProvider = authOptions.providers.find(
        (p: { id: string }) => p.id === 'github'
      );
      expect(githubProvider).toBeDefined();
    });

    it('should use Prisma adapter', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.adapter).toBeDefined();
    });

    it('should have session strategy set to jwt', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.session?.strategy).toBe('jwt');
    });

    it('should have custom pages configured', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.pages).toBeDefined();
      expect(authOptions.pages?.signIn).toBe('/sign-in');
      expect(authOptions.pages?.signOut).toBe('/sign-out');
    });
  });

  describe('callbacks', () => {
    it('should have jwt callback that adds user id', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.callbacks?.jwt).toBeDefined();

      const mockToken = { sub: 'user-123' };
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      const result = await authOptions.callbacks?.jwt?.({
        token: mockToken,
        user: mockUser,
        account: null,
        trigger: 'signIn',
      });

      expect(result?.id).toBe('user-123');
    });

    it('should have session callback that exposes user id', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.callbacks?.session).toBeDefined();

      const mockSession = {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };
      const mockToken = { sub: 'user-123', id: 'user-123', email: 'test@example.com' };

      const result = await authOptions.callbacks?.session?.({
        session: mockSession,
        token: mockToken,
        user: { id: 'user-123', email: 'test@example.com', emailVerified: null },
        trigger: 'update',
        newSession: null,
      });

      expect(result?.user?.id).toBe('user-123');
    });

    it('should have signIn callback for validation', async () => {
      const { authOptions } = await import('@/lib/auth');
      expect(authOptions.callbacks?.signIn).toBeDefined();

      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockAccount = { provider: 'google', providerAccountId: '12345' };

      const result = await authOptions.callbacks?.signIn?.({
        user: mockUser,
        account: mockAccount,
        profile: undefined,
        email: undefined,
        credentials: undefined,
      });

      expect(result).toBe(true);
    });

    it('should reject signIn when user has no email', async () => {
      const { authOptions } = await import('@/lib/auth');

      const mockUser = { id: 'user-123', email: null };
      const mockAccount = { provider: 'google', providerAccountId: '12345' };

      const result = await authOptions.callbacks?.signIn?.({
        user: mockUser,
        account: mockAccount,
        profile: undefined,
        email: undefined,
        credentials: undefined,
      });

      expect(result).toBe(false);
    });
  });

  describe('getServerSession helper', () => {
    it('should export getServerAuthSession function', async () => {
      const { getServerAuthSession } = await import('@/lib/auth');
      expect(getServerAuthSession).toBeDefined();
      expect(typeof getServerAuthSession).toBe('function');
    });
  });
});

describe('Provider Configuration', () => {
  describe('Google Provider', () => {
    it('should require GOOGLE_CLIENT_ID environment variable', async () => {
      const originalId = process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_ID;

      // Clear module cache
      vi.resetModules();

      await expect(import('@/lib/auth')).rejects.toThrow();

      process.env.GOOGLE_CLIENT_ID = originalId;
    });

    it('should require GOOGLE_CLIENT_SECRET environment variable', async () => {
      const originalSecret = process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_CLIENT_SECRET;

      // Clear module cache
      vi.resetModules();

      await expect(import('@/lib/auth')).rejects.toThrow();

      process.env.GOOGLE_CLIENT_SECRET = originalSecret;
    });
  });

  describe('GitHub Provider', () => {
    it('should require GITHUB_CLIENT_ID environment variable', async () => {
      const originalId = process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;

      // Clear module cache
      vi.resetModules();

      await expect(import('@/lib/auth')).rejects.toThrow();

      process.env.GITHUB_CLIENT_ID = originalId;
    });

    it('should require GITHUB_CLIENT_SECRET environment variable', async () => {
      const originalSecret = process.env.GITHUB_CLIENT_SECRET;
      delete process.env.GITHUB_CLIENT_SECRET;

      // Clear module cache
      vi.resetModules();

      await expect(import('@/lib/auth')).rejects.toThrow();

      process.env.GITHUB_CLIENT_SECRET = originalSecret;
    });
  });
});

describe('Auth Events', () => {
  beforeEach(() => {
    // Ensure environment variables are set for this test group
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
    process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    // Reset modules to ensure fresh import with new env vars
    vi.resetModules();
  });

  it('should have createUser event handler', async () => {
    const { authOptions } = await import('@/lib/auth');
    expect(authOptions.events?.createUser).toBeDefined();
  });

  it('should have signIn event handler', async () => {
    const { authOptions } = await import('@/lib/auth');
    expect(authOptions.events?.signIn).toBeDefined();
  });
});
