/**
 * Connection Entity
 *
 * Represents a single WebSocket connection for a user.
 */

import { DeviceType } from '../value-objects/device-type';

export interface Connection {
  socketId: string;
  deviceType: DeviceType;
  userAgent?: string;
  ipAddress?: string;
  connectedAt: Date;
  lastActivityAt: Date;
}

export function createConnection(params: {
  socketId: string;
  deviceType: DeviceType;
  userAgent?: string;
  ipAddress?: string;
}): Connection {
  if (!params.socketId || params.socketId.trim().length === 0) {
    throw new Error('Socket ID cannot be empty');
  }

  const now = new Date();
  return {
    socketId: params.socketId,
    deviceType: params.deviceType,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
    connectedAt: now,
    lastActivityAt: now,
  };
}

export function isConnectionStale(connection: Connection, staleDurationMs: number = 30000): boolean {
  const now = Date.now();
  return now - connection.lastActivityAt.getTime() > staleDurationMs;
}

export function getConnectionDuration(connection: Connection): number {
  return Date.now() - connection.connectedAt.getTime();
}
