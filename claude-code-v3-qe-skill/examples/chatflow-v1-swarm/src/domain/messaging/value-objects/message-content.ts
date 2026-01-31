/**
 * MessageContent Value Object
 *
 * Represents validated message content with text parsing.
 * Immutable and validated on construction.
 */

export class MessageContent {
  static readonly MAX_LENGTH = 4000;
  static readonly MIN_LENGTH = 1;

  private readonly _mentions: string[];
  private readonly _links: string[];

  private constructor(private readonly value: string) {
    this._mentions = this.extractMentions();
    this._links = this.extractLinks();
  }

  static create(value: string): MessageContent {
    const trimmed = value.trim();

    if (!trimmed || trimmed.length < MessageContent.MIN_LENGTH) {
      throw new Error('Message content cannot be empty');
    }

    if (trimmed.length > MessageContent.MAX_LENGTH) {
      throw new Error(`Message content cannot exceed ${MessageContent.MAX_LENGTH} characters`);
    }

    return new MessageContent(trimmed);
  }

  get text(): string {
    return this.value;
  }

  get length(): number {
    return this.value.length;
  }

  get mentions(): string[] {
    return [...this._mentions];
  }

  get links(): string[] {
    return [...this._links];
  }

  get hasMentions(): boolean {
    return this._mentions.length > 0;
  }

  get hasLinks(): boolean {
    return this._links.length > 0;
  }

  private extractMentions(): string[] {
    // Match @username patterns
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = this.value.matchAll(mentionRegex);
    return Array.from(matches, m => m[1] ?? '').filter(Boolean);
  }

  private extractLinks(): string[] {
    // Match URLs
    const urlRegex = /https?:\/\/[^\s<>\"{}|\\^`[\]]+/gi;
    const matches = this.value.match(urlRegex);
    return matches ?? [];
  }

  toString(): string {
    return this.value;
  }

  equals(other: MessageContent): boolean {
    return this.value === other.value;
  }

  toJSON(): string {
    return this.value;
  }
}
