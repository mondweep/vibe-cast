/**
 * Room Entity (Aggregate Root)
 *
 * Represents a chat room with members and settings.
 */

import { RoomId } from '../value-objects/room-id';
import type { RoomMember, MemberRole } from './room-member';

export type RoomType = 'direct' | 'group' | 'channel';

export interface RoomSettings {
  isPrivate: boolean;
  allowInvites: boolean;
  slowModeSeconds: number;
  messageRetentionDays?: number;
}

export interface RoomProps {
  id: RoomId;
  name: string;
  description?: string;
  type: RoomType;
  avatarUrl?: string;
  settings: RoomSettings;
  members: RoomMember[];
  createdById: string;
  lastMessageAt?: Date;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export class Room {
  private constructor(private props: RoomProps) {}

  static create(props: RoomProps): Room {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Room name cannot be empty');
    }
    if (props.name.length > 100) {
      throw new Error('Room name cannot exceed 100 characters');
    }
    if (props.type === 'direct' && props.members.length !== 2) {
      throw new Error('Direct rooms must have exactly 2 members');
    }
    return new Room(props);
  }

  get id(): RoomId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get type(): RoomType {
    return this.props.type;
  }

  get settings(): RoomSettings {
    return { ...this.props.settings };
  }

  get members(): RoomMember[] {
    return [...this.props.members];
  }

  get memberCount(): number {
    return this.props.members.length;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  get isArchived(): boolean {
    return this.props.archivedAt !== undefined;
  }

  get lastMessageAt(): Date | undefined {
    return this.props.lastMessageAt;
  }

  get messageCount(): number {
    return this.props.messageCount;
  }

  hasMember(userId: string): boolean {
    return this.props.members.some(m => m.userId === userId);
  }

  getMember(userId: string): RoomMember | undefined {
    return this.props.members.find(m => m.userId === userId);
  }

  getMemberRole(userId: string): MemberRole | undefined {
    return this.getMember(userId)?.role;
  }

  canUserInvite(userId: string): boolean {
    if (!this.props.settings.allowInvites) {
      return false;
    }
    const member = this.getMember(userId);
    if (!member) return false;
    return ['owner', 'admin', 'moderator'].includes(member.role);
  }

  addMember(member: RoomMember): void {
    if (this.hasMember(member.userId)) {
      throw new Error('User is already a member of this room');
    }
    if (this.props.type === 'direct') {
      throw new Error('Cannot add members to direct rooms');
    }
    this.props.members.push(member);
    this.props.updatedAt = new Date();
  }

  removeMember(userId: string): void {
    const memberIndex = this.props.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      throw new Error('User is not a member of this room');
    }
    const member = this.props.members[memberIndex];
    if (member?.role === 'owner') {
      throw new Error('Cannot remove room owner');
    }
    this.props.members.splice(memberIndex, 1);
    this.props.updatedAt = new Date();
  }

  updateSettings(settings: Partial<RoomSettings>): void {
    this.props.settings = { ...this.props.settings, ...settings };
    this.props.updatedAt = new Date();
  }

  recordMessage(): void {
    this.props.lastMessageAt = new Date();
    this.props.messageCount += 1;
    this.props.updatedAt = new Date();
  }

  archive(): void {
    this.props.archivedAt = new Date();
    this.props.updatedAt = new Date();
  }

  unarchive(): void {
    this.props.archivedAt = undefined;
    this.props.updatedAt = new Date();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      name: this.props.name,
      description: this.props.description,
      type: this.props.type,
      avatarUrl: this.props.avatarUrl,
      settings: this.props.settings,
      memberCount: this.memberCount,
      createdById: this.props.createdById,
      lastMessageAt: this.props.lastMessageAt?.toISOString(),
      messageCount: this.props.messageCount,
      createdAt: this.props.createdAt.toISOString(),
      isArchived: this.isArchived,
    };
  }
}
