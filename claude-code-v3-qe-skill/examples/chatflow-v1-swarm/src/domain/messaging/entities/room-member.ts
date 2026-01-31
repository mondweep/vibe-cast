/**
 * RoomMember Entity
 *
 * Represents a user's membership in a chat room.
 */

export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';
export type NotificationLevel = 'all' | 'mentions' | 'none';

export interface RoomMemberProps {
  userId: string;
  role: MemberRole;
  nickname?: string;
  mutedUntil?: Date;
  notificationLevel: NotificationLevel;
  lastReadAt: Date;
  lastTypedAt?: Date;
  joinedAt: Date;
  leftAt?: Date;
}

export interface RoomMember extends RoomMemberProps {}

export function createRoomMember(params: {
  userId: string;
  role?: MemberRole;
  nickname?: string;
}): RoomMember {
  return {
    userId: params.userId,
    role: params.role ?? 'member',
    nickname: params.nickname,
    notificationLevel: 'all',
    lastReadAt: new Date(),
    joinedAt: new Date(),
  };
}

export function canModerate(role: MemberRole): boolean {
  return ['owner', 'admin', 'moderator'].includes(role);
}

export function canManageMembers(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

export function canChangeSettings(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

export function getRolePriority(role: MemberRole): number {
  const priorities: Record<MemberRole, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
  };
  return priorities[role];
}

export function canAssignRole(assignerRole: MemberRole, targetRole: MemberRole): boolean {
  // Can only assign roles lower than your own
  return getRolePriority(assignerRole) > getRolePriority(targetRole);
}
