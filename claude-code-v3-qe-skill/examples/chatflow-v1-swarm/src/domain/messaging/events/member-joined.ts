/**
 * MemberJoined Domain Event
 *
 * Emitted when a user joins a chat room.
 */

import type { MemberRole } from '../entities/room-member';

export interface MemberJoinedEvent {
  type: 'MemberJoined';
  payload: {
    roomId: string;
    userId: string;
    role: MemberRole;
    invitedById?: string;
    joinMethod: 'invite' | 'link' | 'direct';
  };
  metadata: {
    timestamp: Date;
    correlationId: string;
  };
}

export function createMemberJoinedEvent(params: {
  roomId: string;
  userId: string;
  role: MemberRole;
  invitedById?: string;
  joinMethod: 'invite' | 'link' | 'direct';
  correlationId: string;
}): MemberJoinedEvent {
  return {
    type: 'MemberJoined',
    payload: {
      roomId: params.roomId,
      userId: params.userId,
      role: params.role,
      invitedById: params.invitedById,
      joinMethod: params.joinMethod,
    },
    metadata: {
      timestamp: new Date(),
      correlationId: params.correlationId,
    },
  };
}
