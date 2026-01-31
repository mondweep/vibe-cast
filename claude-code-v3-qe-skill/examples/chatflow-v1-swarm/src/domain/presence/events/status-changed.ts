/**
 * StatusChanged Domain Event
 *
 * Emitted when a user changes their presence status.
 */

import type { PresenceStatusValue } from '../value-objects/presence-status';

export interface StatusChangedEvent {
  type: 'StatusChanged';
  payload: {
    userId: string;
    previousStatus: PresenceStatusValue;
    newStatus: PresenceStatusValue;
    customStatus?: string;
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

export function createStatusChangedEvent(params: {
  userId: string;
  previousStatus: PresenceStatusValue;
  newStatus: PresenceStatusValue;
  customStatus?: string;
  correlationId: string;
}): StatusChangedEvent {
  return {
    type: 'StatusChanged',
    payload: {
      userId: params.userId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      customStatus: params.customStatus,
    },
    metadata: {
      timestamp: new Date(),
      correlationId: params.correlationId,
    },
  };
}
