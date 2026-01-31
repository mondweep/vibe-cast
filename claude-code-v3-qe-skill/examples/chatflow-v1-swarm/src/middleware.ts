/**
 * NextAuth Middleware
 *
 * Protects routes that require authentication.
 * Uses NextAuth.js middleware for session validation.
 */

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequestWithAuth } from 'next-auth/middleware';

/**
 * Protected route middleware
 * Redirects unauthenticated users to the sign-in page
 */
export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;

    // Log access attempts in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Middleware] Path: ${pathname}, Token: ${token ? 'present' : 'missing'}`);
    }

    // Allow authenticated users to proceed
    if (token) {
      return NextResponse.next();
    }

    // This shouldn't happen due to withAuth, but handle it gracefully
    return NextResponse.redirect(new URL('/sign-in', request.url));
  },
  {
    callbacks: {
      /**
       * Determines if a request is authorized
       * Returns true if the user has a valid token
       */
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/sign-in',
      signOut: '/sign-out',
      error: '/sign-in',
    },
  }
);

/**
 * Matcher configuration
 *
 * Specifies which routes should be protected by the middleware.
 * Excludes:
 * - Static files (_next, images, favicon)
 * - API auth routes (handled by NextAuth)
 * - Public pages (sign-in, sign-out, home)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     * - api/auth (NextAuth routes)
     * - sign-in, sign-out (auth pages)
     * - root path (landing page - optional protection)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/auth|sign-in|sign-out|$).*)',
  ],
};
