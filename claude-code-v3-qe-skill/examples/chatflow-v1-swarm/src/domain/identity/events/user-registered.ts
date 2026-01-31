/**
 * UserRegistered Domain Event
 *
 * Emitted when a new user successfully registers.
 */

import type { UserId } from '../value-objects/user-id';
import type { Email } from '../value-objects/email';

export interface UserRegisteredEvent {
  type: 'UserRegistered';
  payload: {
    userId: string;
    email: string;
    displayName: string;
    registrationMethod: 'email' | 'oauth';
    provider?: string; // For OAuth registrations
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

export function createUserRegisteredEvent(params: {
  userId: UserId;
  email: Email;
  displayName: string;
  registrationMethod: 'email' | 'oauth';
  provider?: string;
  correlationId: string;
}): UserRegisteredEvent {
  return {
    type: 'UserRegistered',
    payload: {
      userId: params.userId.toString(),
      email: params.email.toString(),
      displayName: params.displayName,
      registrationMethod: params.registrationMethod,
      provider: params.provider,
    },
    metadata: {
      timestamp: new Date(),
      correlationId: params.correlationId,
    },
  };
}
