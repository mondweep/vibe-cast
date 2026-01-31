/**
 * Reaction Entity
 *
 * Represents an emoji reaction to a message.
 */

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  createdAt: Date;
}

export function createReaction(params: {
  id: string;
  emoji: string;
  userId: string;
}): Reaction {
  if (!params.emoji || params.emoji.trim().length === 0) {
    throw new Error('Emoji cannot be empty');
  }

  return {
    id: params.id,
    emoji: params.emoji.trim(),
    userId: params.userId,
    createdAt: new Date(),
  };
}

export function isValidEmoji(emoji: string): boolean {
  // Basic emoji validation - either Unicode emoji or custom emoji format
  // Custom emojis follow format :emoji_name:
  const unicodeEmojiRegex = /\p{Emoji}/u;
  const customEmojiRegex = /^:[a-zA-Z0-9_+-]+:$/;

  return unicodeEmojiRegex.test(emoji) || customEmojiRegex.test(emoji);
}

export function groupReactionsByEmoji(reactions: Reaction[]): Map<string, Reaction[]> {
  const grouped = new Map<string, Reaction[]>();

  for (const reaction of reactions) {
    const existing = grouped.get(reaction.emoji) ?? [];
    existing.push(reaction);
    grouped.set(reaction.emoji, existing);
  }

  return grouped;
}
