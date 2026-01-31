/**
 * UserPresence Entity (Aggregate Root)
 *
 * Represents a user's presence state including all active connections.
 */

import { PresenceStatus } from '../value-objects/presence-status';
import type { Connection } from './connection';

export interface UserPresenceProps {
  userId: string;
  status: PresenceStatus;
  customStatus?: string;
  connections: Connection[];
  lastSeenAt: Date;
}

export class UserPresence {
  private constructor(private props: UserPresenceProps) {}

  static create(props: UserPresenceProps): UserPresence {
    return new UserPresence(props);
  }

  static createOffline(userId: string): UserPresence {
    return new UserPresence({
      userId,
      status: PresenceStatus.OFFLINE,
      connections: [],
      lastSeenAt: new Date(),
    });
  }

  get userId(): string {
    return this.props.userId;
  }

  get status(): PresenceStatus {
    return this.props.status;
  }

  get customStatus(): string | undefined {
    return this.props.customStatus;
  }

  get connections(): Connection[] {
    return [...this.props.connections];
  }

  get connectionCount(): number {
    return this.props.connections.length;
  }

  get isOnline(): boolean {
    return this.props.status.isOnline() && this.props.connections.length > 0;
  }

  get lastSeenAt(): Date {
    return this.props.lastSeenAt;
  }

  setStatus(status: PresenceStatus): void {
    this.props.status = status;
  }

  setCustomStatus(customStatus: string | undefined): void {
    if (customStatus && customStatus.length > 128) {
      throw new Error('Custom status cannot exceed 128 characters');
    }
    this.props.customStatus = customStatus;
  }

  addConnection(connection: Connection): void {
    const existing = this.props.connections.find(c => c.socketId === connection.socketId);
    if (existing) {
      throw new Error('Connection already exists');
    }
    this.props.connections.push(connection);

    // Auto-set to online if this is the first connection
    if (this.props.connections.length === 1 && this.props.status.equals(PresenceStatus.OFFLINE)) {
      this.props.status = PresenceStatus.ONLINE;
    }
  }

  removeConnection(socketId: string): void {
    const index = this.props.connections.findIndex(c => c.socketId === socketId);
    if (index === -1) {
      throw new Error('Connection not found');
    }
    this.props.connections.splice(index, 1);

    // Auto-set to offline if no more connections
    if (this.props.connections.length === 0) {
      this.props.status = PresenceStatus.OFFLINE;
      this.props.lastSeenAt = new Date();
    }
  }

  updateLastSeen(): void {
    this.props.lastSeenAt = new Date();
  }

  updateConnectionActivity(socketId: string): void {
    const connection = this.props.connections.find(c => c.socketId === socketId);
    if (connection) {
      connection.lastActivityAt = new Date();
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      userId: this.props.userId,
      status: this.props.status.toString(),
      customStatus: this.props.customStatus,
      connectionCount: this.connectionCount,
      isOnline: this.isOnline,
      lastSeenAt: this.props.lastSeenAt.toISOString(),
    };
  }
}
