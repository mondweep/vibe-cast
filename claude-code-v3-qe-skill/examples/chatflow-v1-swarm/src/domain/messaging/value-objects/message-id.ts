/**
 * MessageId Value Object
 *
 * Represents a unique identifier for a message.
 * Immutable and validated on construction.
 */
export class MessageId {
  private constructor(private readonly value: string) {}

  static create(value: string): MessageId {
    if (!value || value.trim().length === 0) {
      throw new Error('MessageId cannot be empty');
    }
    if (value.length < 10) {
      throw new Error('MessageId must be at least 10 characters');
    }
    return new MessageId(value);
  }

  static fromString(value: string): MessageId {
    return MessageId.create(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: MessageId): boolean {
    return this.value === other.value;
  }

  toJSON(): string {
    return this.value;
  }
}
