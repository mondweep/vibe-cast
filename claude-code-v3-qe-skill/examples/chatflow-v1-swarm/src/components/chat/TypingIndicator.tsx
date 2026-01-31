/**
 * TypingIndicator Component
 *
 * Shows who is currently typing in the chat.
 * Displays animated dots and user avatars.
 */

'use client';

import * as React from 'react';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  variant?: 'default' | 'compact';
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  variant = 'default',
  className,
}) => {
  // Don't render if no one is typing
  if (typingUsers.length === 0) {
    return null;
  }

  // Format the typing message
  const typingMessage = React.useMemo(() => {
    const count = typingUsers.length;

    if (count === 1) {
      return `${typingUsers[0]!.name} is typing...`;
    }

    if (count === 2) {
      return `${typingUsers[0]!.name} and ${typingUsers[1]!.name} are typing...`;
    }

    if (count === 3) {
      return `${typingUsers[0]!.name}, ${typingUsers[1]!.name}, and ${typingUsers[2]!.name} are typing...`;
    }

    return 'Several people are typing...';
  }, [typingUsers]);

  // Screen reader text (without "...")
  const srText = React.useMemo(() => {
    const count = typingUsers.length;

    if (count === 1) {
      return `${typingUsers[0]!.name} is typing`;
    }

    if (count === 2) {
      return `${typingUsers[0]!.name} and ${typingUsers[1]!.name} are typing`;
    }

    if (count === 3) {
      return `${typingUsers[0]!.name}, ${typingUsers[1]!.name}, and ${typingUsers[2]!.name} are typing`;
    }

    return `${count} people are typing`;
  }, [typingUsers]);

  // Limit avatars to 3
  const visibleAvatars = typingUsers.slice(0, 3);
  const remainingCount = typingUsers.length - 3;

  return (
    <div
      data-testid="typing-indicator"
      className={cn(
        'flex items-center gap-2 animate-fade-in',
        variant === 'compact' && 'typing-indicator-compact',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Avatars */}
      <div className="flex -space-x-2">
        {visibleAvatars.map((user) => (
          <Avatar
            key={user.id}
            size="xs"
            className="ring-2 ring-background"
            data-testid="typing-user-avatar"
          >
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="text-[8px]">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {remainingCount > 0 && (
          <Avatar size="xs" className="ring-2 ring-background">
            <AvatarFallback className="text-[8px] bg-muted">
              +{remainingCount}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Message and Dots */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span>{typingMessage.replace('...', '')}</span>
        <div data-testid="typing-dots" className="flex gap-0.5 ml-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              data-testid="typing-dot"
              className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: `${index * 100}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Screen Reader Text */}
      <span data-testid="typing-sr-text" className="sr-only">
        {srText}
      </span>
    </div>
  );
};

TypingIndicator.displayName = 'TypingIndicator';
