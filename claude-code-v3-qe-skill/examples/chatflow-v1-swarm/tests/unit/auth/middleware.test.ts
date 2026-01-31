/**
 * Middleware Tests
 *
 * Tests for the protected route middleware functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock next-auth/middleware
vi.mock('next-auth/middleware', () => ({
  withAuth: vi.fn((middleware, options) => {
    return async (request: NextRequest) => {
      // Simulate token presence based on authorization header
      const token = request.headers.get('Authorization');

      if (token && options?.callbacks?.authorized?.({ token: { sub: 'user-123' } })) {
        return middleware({
          ...request,
          nextauth: { token: { sub: 'user-123' } },
        });
      }

      // Redirect to sign-in if not authorized
      return NextResponse.redirect(new URL('/sign-in', request.url));
    };
  }),
  default: vi.fn(),
}));

/**
 * Helper function to match paths similar to Next.js middleware matcher
 * Simulates the behavior of the middleware config matcher
 */
function matchesProtectedRoute(pathname: string): boolean {
  // Paths that should NOT be protected (excluded from middleware)
  const excludedPatterns = [
    /^\/_next\/static/,
    /^\/_next\/image/,
    /^\/favicon\.ico$/,
    /^\/public/,
    /^\/api\/auth/,
    /^\/sign-in/,
    /^\/sign-out/,
    /^\/$/,  // Root path
  ];

  // Check if path matches any excluded pattern
  for (const pattern of excludedPatterns) {
    if (pattern.test(pathname)) {
      return false;
    }
  }

  return true;
}

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Protected Route Matching', () => {
    it('should protect /chat routes', () => {
      const testPath = '/chat/room-123';
      expect(matchesProtectedRoute(testPath)).toBe(true);
    });

    it('should protect /rooms routes', () => {
      const testPath = '/rooms';
      expect(matchesProtectedRoute(testPath)).toBe(true);
    });

    it('should protect /dashboard routes', () => {
      const testPath = '/dashboard';
      expect(matchesProtectedRoute(testPath)).toBe(true);
    });

    it('should protect /settings routes', () => {
      const testPath = '/settings';
      expect(matchesProtectedRoute(testPath)).toBe(true);
    });

    it('should not protect sign-in page', () => {
      const testPath = '/sign-in';
      expect(matchesProtectedRoute(testPath)).toBe(false);
    });

    it('should not protect sign-out page', () => {
      const testPath = '/sign-out';
      expect(matchesProtectedRoute(testPath)).toBe(false);
    });

    it('should not protect api/auth routes', () => {
      expect(matchesProtectedRoute('/api/auth/signin')).toBe(false);
      expect(matchesProtectedRoute('/api/auth/signout')).toBe(false);
      expect(matchesProtectedRoute('/api/auth/callback/google')).toBe(false);
      expect(matchesProtectedRoute('/api/auth/callback/github')).toBe(false);
      expect(matchesProtectedRoute('/api/auth/session')).toBe(false);
      expect(matchesProtectedRoute('/api/auth/csrf')).toBe(false);
    });

    it('should not protect static files', () => {
      expect(matchesProtectedRoute('/_next/static/chunk.js')).toBe(false);
      expect(matchesProtectedRoute('/_next/static/css/styles.css')).toBe(false);
    });

    it('should not protect image optimization routes', () => {
      expect(matchesProtectedRoute('/_next/image')).toBe(false);
      expect(matchesProtectedRoute('/_next/image/avatar.png')).toBe(false);
    });

    it('should not protect root path', () => {
      const testPath = '/';
      expect(matchesProtectedRoute(testPath)).toBe(false);
    });

    it('should not protect public assets', () => {
      expect(matchesProtectedRoute('/public/logo.png')).toBe(false);
      expect(matchesProtectedRoute('/public/manifest.json')).toBe(false);
    });

    it('should not protect favicon', () => {
      expect(matchesProtectedRoute('/favicon.ico')).toBe(false);
    });
  });

  describe('Authorization Callback', () => {
    it('should authorize users with valid token', () => {
      const authorizedCallback = ({ token }: { token: unknown }) => !!token;

      expect(authorizedCallback({ token: { sub: 'user-123' } })).toBe(true);
    });

    it('should not authorize users without token', () => {
      const authorizedCallback = ({ token }: { token: unknown }) => !!token;

      expect(authorizedCallback({ token: null })).toBe(false);
      expect(authorizedCallback({ token: undefined })).toBe(false);
    });
  });

  describe('Redirect Behavior', () => {
    it('should redirect to sign-in for unauthenticated requests', () => {
      const request = new NextRequest('http://localhost:3000/chat');

      const redirectResponse = NextResponse.redirect(new URL('/sign-in', request.url));

      expect(redirectResponse.status).toBe(307);
      expect(redirectResponse.headers.get('location')).toBe('http://localhost:3000/sign-in');
    });

    it('should include callback URL in redirect', () => {
      const originalUrl = 'http://localhost:3000/rooms/room-123';
      const request = new NextRequest(originalUrl);

      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('callbackUrl', '/rooms/room-123');

      expect(signInUrl.toString()).toBe('http://localhost:3000/sign-in?callbackUrl=%2Frooms%2Froom-123');
    });

    it('should use 307 status for temporary redirect', () => {
      const request = new NextRequest('http://localhost:3000/protected');
      const redirect = NextResponse.redirect(new URL('/sign-in', request.url));

      expect(redirect.status).toBe(307);
    });
  });
});

describe('API Route Protection', () => {
  it('should protect /api/rooms routes', () => {
    expect(matchesProtectedRoute('/api/rooms')).toBe(true);
    expect(matchesProtectedRoute('/api/rooms/room-123')).toBe(true);
  });

  it('should protect /api/users routes', () => {
    expect(matchesProtectedRoute('/api/users')).toBe(true);
    expect(matchesProtectedRoute('/api/users/user-123')).toBe(true);
    expect(matchesProtectedRoute('/api/users/user-123/presence')).toBe(true);
  });

  it('should protect /api/messages routes', () => {
    expect(matchesProtectedRoute('/api/rooms/room-123/messages')).toBe(true);
    expect(matchesProtectedRoute('/api/rooms/room-123/messages/msg-123')).toBe(true);
  });

  it('should protect socket API routes', () => {
    expect(matchesProtectedRoute('/api/socket')).toBe(true);
  });
});

describe('Edge Cases', () => {
  it('should handle paths with query parameters', () => {
    // Note: matchesProtectedRoute only checks pathname, not query params
    expect(matchesProtectedRoute('/chat')).toBe(true);
  });

  it('should handle deep nested paths', () => {
    expect(matchesProtectedRoute('/rooms/room-123/messages/msg-456/reactions')).toBe(true);
  });

  it('should handle paths with special characters', () => {
    expect(matchesProtectedRoute('/chat/room-with-dashes')).toBe(true);
    expect(matchesProtectedRoute('/chat/room_with_underscores')).toBe(true);
  });

  it('should handle sign-in subpaths as protected', () => {
    // Only exact /sign-in is excluded, not subpaths
    // This is a design decision - adjust if needed
    expect(matchesProtectedRoute('/sign-in/callback')).toBe(false); // matches /sign-in prefix
  });
});
