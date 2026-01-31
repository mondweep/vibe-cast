/**
 * UserId Value Object
 *
 * Represents a unique identifier for a user.
 * Immutable and validated on construction.
 */
export class UserId {
  private constructor(private readonly value: string) {}

  static create(value: string): UserId {
    if (!value || value.trim().length === 0) {
      throw new Error('UserId cannot be empty');
    }
    if (value.length < 10) {
      throw new Error('UserId must be at least 10 characters');
    }
    return new UserId(value);
  }

  static fromString(value: string): UserId {
    return UserId.create(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toJSON(): string {
    return this.value;
  }
}
