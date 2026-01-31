/**
 * UserProfileUpdated Domain Event
 *
 * Emitted when a user updates their profile information.
 */

import type { UserId } from '../value-objects/user-id';
import type { UserProfile } from '../entities/user-profile';

export interface UserProfileUpdatedEvent {
  type: 'UserProfileUpdated';
  payload: {
    userId: string;
    changes: Partial<UserProfile>;
    previousValues: Partial<UserProfile>;
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

export function createUserProfileUpdatedEvent(params: {
  userId: UserId;
  changes: Partial<UserProfile>;
  previousValues: Partial<UserProfile>;
  correlationId: string;
}): UserProfileUpdatedEvent {
  return {
    type: 'UserProfileUpdated',
    payload: {
      userId: params.userId.toString(),
      changes: params.changes,
      previousValues: params.previousValues,
    },
    metadata: {
      timestamp: new Date(),
      correlationId: params.correlationId,
    },
  };
}
