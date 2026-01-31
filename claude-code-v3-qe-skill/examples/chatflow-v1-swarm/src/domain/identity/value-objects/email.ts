/**
 * Email Value Object
 *
 * Represents a validated email address.
 * Immutable and validated on construction.
 */
export class Email {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(private readonly value: string) {}

  static create(value: string): Email {
    const normalizedEmail = value.toLowerCase().trim();

    if (!normalizedEmail) {
      throw new Error('Email cannot be empty');
    }

    if (!Email.EMAIL_REGEX.test(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    return new Email(normalizedEmail);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  getDomain(): string {
    return this.value.split('@')[1] ?? '';
  }

  toJSON(): string {
    return this.value;
  }
}
