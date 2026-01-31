/**
 * RoomCreated Domain Event
 *
 * Emitted when a new chat room is created.
 */

import type { RoomType } from '../entities/room';

export interface RoomCreatedEvent {
  type: 'RoomCreated';
  payload: {
    roomId: string;
    name: string;
    roomType: RoomType;
    createdById: string;
    initialMemberIds: string[];
    isPrivate: boolean;
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

export function createRoomCreatedEvent(params: {
  roomId: string;
  name: string;
  roomType: RoomType;
  createdById: string;
  initialMemberIds: string[];
  isPrivate: boolean;
  correlationId: string;
}): RoomCreatedEvent {
  return {
    type: 'RoomCreated',
    payload: {
      roomId: params.roomId,
      name: params.name,
      roomType: params.roomType,
      createdById: params.createdById,
      initialMemberIds: params.initialMemberIds,
      isPrivate: params.isPrivate,
    },
    metadata: {
      timestamp: new Date(),
      correlationId: params.correlationId,
    },
  };
}
