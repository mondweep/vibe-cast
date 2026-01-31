/**
 * SessionToken Value Object
 *
 * Represents a secure session token.
 * Immutable and validated on construction.
 */
export class SessionToken {
  private static readonly MIN_LENGTH = 32;

  private constructor(private readonly value: string) {}

  static create(value: string): SessionToken {
    if (!value || value.length < SessionToken.MIN_LENGTH) {
      throw new Error(`Session token must be at least ${SessionToken.MIN_LENGTH} characters`);
    }
    return new SessionToken(value);
  }

  static generate(): SessionToken {
    // Generate a cryptographically secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return new SessionToken(token);
  }

  toString(): string {
    return this.value;
  }

  equals(other: SessionToken): boolean {
    return this.value === other.value;
  }

  // Mask for logging purposes
  toMasked(): string {
    return `${this.value.slice(0, 8)}...${this.value.slice(-4)}`;
  }

  toJSON(): string {
    return this.value;
  }
}
