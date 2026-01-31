/**
 * User Entity (Aggregate Root)
 *
 * The central entity of the Identity context.
 * Manages user identity, authentication, and profile.
 */

import { UserId } from '../value-objects/user-id';
import { Email } from '../value-objects/email';
import type { UserProfile } from './user-profile';

export interface UserProps {
  id: UserId;
  email: Email;
  profile: UserProfile;
  passwordHash?: string;
  emailVerified?: Date;
  isActive: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  static create(props: UserProps): User {
    return new User(props);
  }

  get id(): UserId {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get profile(): UserProfile {
    return this.props.profile;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isEmailVerified(): boolean {
    return this.props.emailVerified !== undefined;
  }

  get lastSeenAt(): Date {
    return this.props.lastSeenAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  updateProfile(profile: Partial<UserProfile>): void {
    this.props.profile = { ...this.props.profile, ...profile };
    this.props.updatedAt = new Date();
  }

  updateLastSeen(): void {
    this.props.lastSeenAt = new Date();
  }

  verifyEmail(): void {
    this.props.emailVerified = new Date();
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      email: this.props.email.toString(),
      profile: this.props.profile,
      isActive: this.props.isActive,
      emailVerified: this.props.emailVerified?.toISOString(),
      lastSeenAt: this.props.lastSeenAt.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
