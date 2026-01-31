/**
 * Session Entity
 *
 * Represents an authenticated user session.
 */

import { UserId } from '../value-objects/user-id';
import { SessionToken } from '../value-objects/session-token';

export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceType: 'web' | 'mobile' | 'desktop';
}

export interface SessionProps {
  id: string;
  userId: UserId;
  token: SessionToken;
  deviceInfo: DeviceInfo;
  expiresAt: Date;
  createdAt: Date;
}

export class Session {
  private constructor(private props: SessionProps) {}

  static create(props: SessionProps): Session {
    if (props.expiresAt <= new Date()) {
      throw new Error('Session expiration must be in the future');
    }
    return new Session(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get token(): SessionToken {
    return this.props.token;
  }

  get deviceInfo(): DeviceInfo {
    return this.props.deviceInfo;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isExpired(): boolean {
    return new Date() >= this.props.expiresAt;
  }

  isValid(): boolean {
    return !this.isExpired();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.props.id,
      userId: this.props.userId.toString(),
      deviceInfo: this.props.deviceInfo,
      expiresAt: this.props.expiresAt.toISOString(),
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
