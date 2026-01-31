/**
 * PresenceStatus Value Object
 *
 * Represents a user's online status.
 * Immutable and type-safe.
 */

export type PresenceStatusValue = 'online' | 'away' | 'dnd' | 'offline';

export class PresenceStatus {
  static readonly ONLINE = new PresenceStatus('online');
  static readonly AWAY = new PresenceStatus('away');
  static readonly DND = new PresenceStatus('dnd'); // Do Not Disturb
  static readonly OFFLINE = new PresenceStatus('offline');

  private constructor(private readonly value: PresenceStatusValue) {}

  static fromString(value: string): PresenceStatus {
    switch (value.toLowerCase()) {
      case 'online':
        return PresenceStatus.ONLINE;
      case 'away':
        return PresenceStatus.AWAY;
      case 'dnd':
        return PresenceStatus.DND;
      case 'offline':
        return PresenceStatus.OFFLINE;
      default:
        throw new Error(`Invalid presence status: ${value}`);
    }
  }

  toString(): PresenceStatusValue {
    return this.value;
  }

  equals(other: PresenceStatus): boolean {
    return this.value === other.value;
  }

  isOnline(): boolean {
    return this.value !== 'offline';
  }

  isAvailable(): boolean {
    return this.value === 'online';
  }

  canReceiveNotifications(): boolean {
    return this.value !== 'dnd' && this.value !== 'offline';
  }

  toJSON(): PresenceStatusValue {
    return this.value;
  }
}
