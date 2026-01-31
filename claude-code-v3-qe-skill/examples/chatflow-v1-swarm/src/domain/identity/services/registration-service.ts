/**
 * Registration Service Interface
 *
 * Domain service for handling user registration logic.
 */

import type { User } from '../entities/user';
import type { Email } from '../value-objects/email';

export interface RegistrationResult {
  success: boolean;
  user?: User;
  error?: string;
  validationErrors?: Record<string, string>;
}

export interface RegistrationInput {
  email: string;
  password: string;
  displayName: string;
  timezone?: string;
}

export interface OAuthRegistrationInput {
  provider: string;
  providerAccountId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
}

export interface RegistrationService {
  /**
   * Register a new user with email/password
   */
  registerWithCredentials(input: RegistrationInput): Promise<RegistrationResult>;

  /**
   * Register or link user from OAuth provider
   */
  registerWithOAuth(input: OAuthRegistrationInput): Promise<RegistrationResult>;

  /**
   * Validate registration input
   */
  validateRegistrationInput(input: RegistrationInput): Promise<{
    valid: boolean;
    errors: Record<string, string>;
  }>;

  /**
   * Check if email is available
   */
  isEmailAvailable(email: Email): Promise<boolean>;

  /**
   * Send email verification
   */
  sendVerificationEmail(userId: string): Promise<void>;

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Promise<boolean>;

  /**
   * Resend verification email
   */
  resendVerificationEmail(email: Email): Promise<void>;
}
