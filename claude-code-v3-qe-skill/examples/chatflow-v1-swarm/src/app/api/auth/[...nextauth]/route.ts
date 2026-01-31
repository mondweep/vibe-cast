/**
 * NextAuth API Route
 *
 * This route handles all NextAuth.js authentication endpoints:
 * - /api/auth/signin - Sign in page
 * - /api/auth/signout - Sign out page
 * - /api/auth/callback/:provider - OAuth callback
 * - /api/auth/session - Session info
 * - /api/auth/csrf - CSRF token
 * - /api/auth/providers - List of providers
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * NextAuth handler for App Router
 * Exports both GET and POST methods for the API route
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
