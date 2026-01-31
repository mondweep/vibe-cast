/**
 * TypingIndicator Entity
 *
 * Represents a user currently typing in a room.
 * Short-lived entity with automatic expiration.
 */

export interface TypingIndicator {
  userId: string;
  roomId: string;
  startedAt: Date;
  expiresAt: Date;
}

export const TYPING_TIMEOUT_MS = 3000; // 3 seconds

export function createTypingIndicator(params: {
  userId: string;
  roomId: string;
}): TypingIndicator {
  const now = new Date();
  return {
    userId: params.userId,
    roomId: params.roomId,
    startedAt: now,
    expiresAt: new Date(now.getTime() + TYPING_TIMEOUT_MS),
  };
}

export function isTypingExpired(indicator: TypingIndicator): boolean {
  return Date.now() > indicator.expiresAt.getTime();
}

export function refreshTypingIndicator(indicator: TypingIndicator): TypingIndicator {
  return {
    ...indicator,
    expiresAt: new Date(Date.now() + TYPING_TIMEOUT_MS),
  };
}

export function getTypingDuration(indicator: TypingIndicator): number {
  return Date.now() - indicator.startedAt.getTime();
}
