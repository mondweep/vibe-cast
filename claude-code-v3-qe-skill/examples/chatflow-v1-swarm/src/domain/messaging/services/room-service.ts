/**
 * Room Service Interface
 *
 * Domain service for room operations.
 */

import type { Room, RoomType, RoomSettings } from '../entities/room';
import type { RoomMember, MemberRole } from '../entities/room-member';

export interface CreateRoomInput {
  name: string;
  description?: string;
  type: RoomType;
  creatorId: string;
  initialMemberIds?: string[];
  settings?: Partial<RoomSettings>;
}

export interface CreateDirectRoomInput {
  userId1: string;
  userId2: string;
}

export interface RoomOperationResult {
  success: boolean;
  room?: Room;
  error?: string;
}

export interface RoomService {
  /**
   * Create a new group or channel room
   */
  createRoom(input: CreateRoomInput): Promise<RoomOperationResult>;

  /**
   * Create or get existing direct room between two users
   */
  getOrCreateDirectRoom(input: CreateDirectRoomInput): Promise<RoomOperationResult>;

  /**
   * Add a member to a room
   */
  addMember(
    roomId: string,
    userId: string,
    addedById: string,
    role?: MemberRole
  ): Promise<RoomOperationResult>;

  /**
   * Remove a member from a room
   */
  removeMember(
    roomId: string,
    userId: string,
    removedById: string
  ): Promise<RoomOperationResult>;

  /**
   * Update member role
   */
  updateMemberRole(
    roomId: string,
    userId: string,
    newRole: MemberRole,
    updatedById: string
  ): Promise<RoomOperationResult>;

  /**
   * Update room settings
   */
  updateSettings(
    roomId: string,
    settings: Partial<RoomSettings>,
    updatedById: string
  ): Promise<RoomOperationResult>;

  /**
   * Archive a room
   */
  archiveRoom(roomId: string, archivedById: string): Promise<RoomOperationResult>;

  /**
   * Leave a room
   */
  leaveRoom(roomId: string, userId: string): Promise<RoomOperationResult>;

  /**
   * Transfer ownership
   */
  transferOwnership(
    roomId: string,
    newOwnerId: string,
    currentOwnerId: string
  ): Promise<RoomOperationResult>;

  /**
   * Get room members
   */
  getMembers(roomId: string): Promise<RoomMember[]>;

  /**
   * Mute/unmute member
   */
  setMemberMute(
    roomId: string,
    userId: string,
    mutedUntil: Date | null,
    mutedById: string
  ): Promise<RoomOperationResult>;
}
