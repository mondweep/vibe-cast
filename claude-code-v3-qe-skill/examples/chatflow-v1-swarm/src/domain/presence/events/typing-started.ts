/**
 * TypingStarted Domain Event
 *
 * Emitted when a user starts typing in a room.
 */

export interface TypingStartedEvent {
  type: 'TypingStarted';
  payload: {
    userId: string;
    roomId: string;
    expiresAt: string;
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

export function createTypingStartedEvent(params: {
  userId: string;
  roomId: string;
  expiresAt: Date;
  correlationId: string;
}): TypingStartedEvent {
  return {
    type: 'TypingStarted',
    payload: {
      userId: params.userId,
      roomId: params.roomId,
      expiresAt: params.expiresAt.toISOString(),
    },
    metadata: {
      timestamp: new Date(),
      correlationId: params.correlationId,
    },
  };
}
