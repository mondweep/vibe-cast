/**
 * RoomId Value Object
 *
 * Represents a unique identifier for a chat room.
 * Immutable and validated on construction.
 */
export class RoomId {
  private constructor(private readonly value: string) {}

  static create(value: string): RoomId {
    if (!value || value.trim().length === 0) {
      throw new Error('RoomId cannot be empty');
    }
    if (value.length < 10) {
      throw new Error('RoomId must be at least 10 characters');
    }
    return new RoomId(value);
  }

  static fromString(value: string): RoomId {
    return RoomId.create(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: RoomId): boolean {
    return this.value === other.value;
  }

  toJSON(): string {
    return this.value;
  }
}
