/**
 * Authentication Service Interface
 *
 * Domain service for handling authentication logic.
 */

import type { User } from '../entities/user';
import type { Session } from '../entities/session';
import type { Email } from '../value-objects/email';
import type { SessionToken } from '../value-objects/session-token';
import type { DeviceInfo } from '../entities/session';

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export interface AuthenticationService {
  /**
   * Authenticate user with email and password
   */
  authenticateWithCredentials(
    email: Email,
    password: string,
    deviceInfo: DeviceInfo
  ): Promise<AuthenticationResult>;

  /**
   * Authenticate user with OAuth provider
   */
  authenticateWithOAuth(
    provider: string,
    providerToken: string,
    deviceInfo: DeviceInfo
  ): Promise<AuthenticationResult>;

  /**
   * Validate an existing session
   */
  validateSession(token: SessionToken): Promise<AuthenticationResult>;

  /**
   * Refresh a session (extend expiration)
   */
  refreshSession(token: SessionToken): Promise<AuthenticationResult>;

  /**
   * Logout (invalidate session)
   */
  logout(token: SessionToken): Promise<void>;

  /**
   * Logout from all devices
   */
  logoutAll(userId: string): Promise<void>;

  /**
   * Verify password for sensitive operations
   */
  verifyPassword(userId: string, password: string): Promise<boolean>;

  /**
   * Change password
   */
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean>;
}
