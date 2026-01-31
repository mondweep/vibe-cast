/**
 * MessageItem Component
 *
 * Individual message with avatar, content, timestamp, and reactions.
 * Supports text, images, files, and link previews.
 */

'use client';

import * as React from 'react';
import { cn, formatMessageTime } from '@/lib/utils';
import { AvatarWithPresence } from '@/components/ui/avatar';
import { SimpleTooltip } from '@/components/ui/tooltip';

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: Date;
  updatedAt?: Date;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyToId?: string;
  reactions?: Array<{ emoji: string; userId: string; createdAt: Date }>;
}

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface MessageItemProps {
  message: Message;
  sender?: User;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
  onAddReaction?: () => void;
  onReact?: (messageId: string, emoji: string) => void;
  className?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  sender,
  isOwn,
  showAvatar = true,
  showTimestamp = true,
  onContextMenu,
  onAddReaction,
  onReact,
  className,
}) => {
  const [showActions, setShowActions] = React.useState(false);

  // Group reactions by emoji
  const groupedReactions = React.useMemo(() => {
    const groups: Record<string, { emoji: string; count: number; userIds: string[] }> = {};

    message.reactions?.forEach((reaction) => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = { emoji: reaction.emoji, count: 0, userIds: [] };
      }
      groups[reaction.emoji]!.count++;
      groups[reaction.emoji]!.userIds.push(reaction.userId);
    });

    return Object.values(groups);
  }, [message.reactions]);

  return (
    <div
      data-testid={`message-item-${message.id}`}
      className={cn(
        'group flex gap-3 max-w-[80%]',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onContextMenu={onContextMenu}
      role="article"
      aria-label={`Message from ${sender?.name ?? 'Unknown'}`}
    >
      {/* Avatar */}
      {showAvatar ? (
        <AvatarWithPresence
          src={sender?.avatar}
          alt={sender?.name}
          fallback={sender?.name}
          size="sm"
          className={cn(
            'flex-shrink-0',
            isOwn ? 'order-1' : 'order-none'
          )}
        />
      ) : (
        <div className="w-8 flex-shrink-0" /> // Spacer for alignment
      )}

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-1',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender Name (only show for first message in group) */}
        {showAvatar && !isOwn && (
          <span className="text-xs text-muted-foreground font-medium">
            {sender?.name ?? 'Unknown'}
          </span>
        )}

        {/* Message Bubble */}
        <div className="relative">
          <div
            className={cn(
              'rounded-2xl px-4 py-2',
              message.isDeleted
                ? 'bg-muted text-muted-foreground italic'
                : isOwn
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            )}
          >
            {message.isDeleted ? (
              <span>This message was deleted</span>
            ) : (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {/* Edited indicator */}
            {message.isEdited && !message.isDeleted && (
              <span className="text-xs opacity-70 ml-1">(edited)</span>
            )}
          </div>

          {/* Quick Actions */}
          {showActions && !message.isDeleted && (
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 flex items-center gap-1 bg-popover border rounded-md p-1 shadow-sm',
                isOwn ? '-left-20' : '-right-20'
              )}
            >
              <button
                data-testid="add-reaction-button"
                className="p-1 hover:bg-muted rounded transition-colors"
                onClick={onAddReaction}
                aria-label="Add reaction"
              >
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              <button
                className="p-1 hover:bg-muted rounded transition-colors"
                aria-label="More options"
              >
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Reactions */}
        {groupedReactions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {groupedReactions.map((reaction) => (
              <SimpleTooltip
                key={reaction.emoji}
                content={`${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}`}
              >
                <button
                  data-testid="reaction-badge"
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                    'bg-muted hover:bg-muted/80 transition-colors'
                  )}
                  onClick={() => onReact?.(message.id, reaction.emoji)}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              </SimpleTooltip>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {showTimestamp && (
          <span
            className={cn(
              'text-xs text-muted-foreground',
              isOwn ? 'text-right' : 'text-left'
            )}
          >
            {formatMessageTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
};

MessageItem.displayName = 'MessageItem';
