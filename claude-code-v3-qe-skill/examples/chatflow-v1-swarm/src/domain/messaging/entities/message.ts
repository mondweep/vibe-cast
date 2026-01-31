/**
 * Message Entity (Aggregate Root)
 *
 * Represents a chat message with content, reactions, and metadata.
 */

import { MessageId } from '../value-objects/message-id';
import { RoomId } from '../value-objects/room-id';
import { MessageContent } from '../value-objects/message-content';
import type { Reaction } from './reaction';

export type MessageType = 'text' | 'image' | 'file' | 'video' | 'audio' | 'system' | 'embed';

export interface MessageMetadata {
  attachments?: Attachment[];
  embeds?: Embed[];
  replyToPreview?: string;
  editHistory?: EditHistoryEntry[];
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

export interface Embed {
  type: 'link' | 'image' | 'video';
  url: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface EditHistoryEntry {
  content: string;
  editedAt: Date;
}

export interface MessageProps {
  id: MessageId;
  roomId: RoomId;
  senderId: string;
  content: MessageContent;
  type: MessageType;
  metadata?: MessageMetadata;
  reactions: Reaction[];
  threadId?: MessageId;
  replyToId?: MessageId;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

export class Message {
  private constructor(private props: MessageProps) {}

  static create(props: MessageProps): Message {
    return new Message(props);
  }

  get id(): MessageId {
    return this.props.id;
  }

  get roomId(): RoomId {
    return this.props.roomId;
  }

  get senderId(): string {
    return this.props.senderId;
  }

  get content(): MessageContent {
    return this.props.content;
  }

  get type(): MessageType {
    return this.props.type;
  }

  get metadata(): MessageMetadata | undefined {
    return this.props.metadata;
  }

  get reactions(): Reaction[] {
    return [...this.props.reactions];
  }

  get threadId(): MessageId | undefined {
    return this.props.threadId;
  }

  get replyToId(): MessageId | undefined {
    return this.props.replyToId;
  }

  get replyCount(): number {
    return this.props.replyCount;
  }

  get isEdited(): boolean {
    return this.props.editedAt !== undefined;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== undefined;
  }

  get isThreadParent(): boolean {
    return this.props.replyCount > 0;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  canEdit(userId: string): boolean {
    return this.props.senderId === userId && !this.isDeleted;
  }

  canDelete(userId: string, isAdmin: boolean = false): boolean {
    return (this.props.senderId === userId || isAdmin) && !this.isDeleted;
  }

  edit(newContent: MessageContent): void {
    if (this.isDeleted) {
      throw new Error('Cannot edit deleted message');
    }

    // Store edit history
    const history = this.props.metadata?.editHistory ?? [];
    history.push({
      content: this.props.content.text,
      editedAt: new Date(),
    });

    this.props.metadata = {
      ...this.props.metadata,
      editHistory: history,
    };

    this.props.content = newContent;
    this.props.editedAt = new Date();
    this.props.updatedAt = new Date();
  }

  delete(): void {
    if (this.isDeleted) {
      throw new Error('Message already deleted');
    }
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
  }

  addReaction(reaction: Reaction): void {
    const existing = this.props.reactions.find(
      r => r.emoji === reaction.emoji && r.userId === reaction.userId
    );
    if (existing) {
      throw new Error('User has already reacted with this emoji');
    }
    this.props.reactions.push(reaction);
  }

  removeReaction(userId: string, emoji: string): void {
    const index = this.props.reactions.findIndex(
      r => r.emoji === emoji && r.userId === userId
    );
    if (index === -1) {
      throw new Error('Reaction not found');
    }
    this.props.reactions.splice(index, 1);
  }

  incrementReplyCount(): void {
    this.props.replyCount += 1;
    this.props.updatedAt = new Date();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.props.id.toString(),
      roomId: this.props.roomId.toString(),
      senderId: this.props.senderId,
      content: this.isDeleted ? '[deleted]' : this.props.content.text,
      type: this.props.type,
      metadata: this.props.metadata,
      reactions: this.props.reactions,
      threadId: this.props.threadId?.toString(),
      replyToId: this.props.replyToId?.toString(),
      replyCount: this.props.replyCount,
      isEdited: this.isEdited,
      isDeleted: this.isDeleted,
      createdAt: this.props.createdAt.toISOString(),
      editedAt: this.props.editedAt?.toISOString(),
    };
  }
}
