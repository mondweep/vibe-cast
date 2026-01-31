/**
 * SessionCreated Domain Event
 *
 * Emitted when a user successfully logs in and a session is created.
 */

import type { UserId } from '../value-objects/user-id';
import type { DeviceInfo } from '../entities/session';

export interface SessionCreatedEvent {
  type: 'SessionCreated';
  payload: {
    sessionId: string;
    userId: string;
    deviceInfo: DeviceInfo;
    expiresAt: string;
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

export function createSessionCreatedEvent(params: {
  sessionId: string;
  userId: UserId;
  deviceInfo: DeviceInfo;
  expiresAt: Date;
  correlationId: string;
}): SessionCreatedEvent {
  return {
    type: 'SessionCreated',
    payload: {
      sessionId: params.sessionId,
      userId: params.userId.toString(),
      deviceInfo: params.deviceInfo,
      expiresAt: params.expiresAt.toISOString(),
    },
    metadata: {
      timestamp: new Date(),
      correlationId: params.correlationId,
    },
  };
}
