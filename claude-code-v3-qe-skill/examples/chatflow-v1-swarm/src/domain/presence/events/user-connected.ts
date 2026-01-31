/**
 * UserConnected Domain Event
 *
 * Emitted when a user establishes a WebSocket connection.
 */

import type { DeviceTypeValue } from '../value-objects/device-type';

export interface UserConnectedEvent {
  type: 'UserConnected';
  payload: {
    userId: string;
    socketId: string;
    deviceType: DeviceTypeValue;
    connectionCount: number;
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

export function createUserConnectedEvent(params: {
  userId: string;
  socketId: string;
  deviceType: DeviceTypeValue;
  connectionCount: number;
  correlationId: string;
}): UserConnectedEvent {
  return {
    type: 'UserConnected',
    payload: {
      userId: params.userId,
      socketId: params.socketId,
      deviceType: params.deviceType,
      connectionCount: params.connectionCount,
    },
    metadata: {
      timestamp: new Date(),
      correlationId: params.correlationId,
    },
  };
}
