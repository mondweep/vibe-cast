/**
 * MessageList Component
 *
 * Scrollable, virtualized message list with grouping and date separators.
 * Supports auto-scroll, reactions, and context menus.
 */

'use client';

import * as React from 'react';
import { cn, formatDateSeparator, isSameDay } from '@/lib/utils';
import { ScrollArea, useScrollToBottom } from '@/components/ui/scroll-area';
import { MessageItem } from './MessageItem';
import { Button } from '@/components/ui/button';

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

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  users: Record<string, User>;
  isLoading?: boolean;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyMessage?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  className?: string;
}

interface MessageGroup {
  senderId: string;
  messages: Message[];
  date: Date;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  users,
  isLoading = false,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onReact,
  className,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const { scrollToBottom, shouldAutoScroll, setShouldAutoScroll } = useScrollToBottom(scrollRef);

  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    messageId: string;
  } | null>(null);

  const [reactionPicker, setReactionPicker] = React.useState<string | null>(null);

  // Group messages by sender and date
  const groupedMessages = React.useMemo(() => {
    const groups: { date: Date; groups: MessageGroup[] }[] = [];
    let currentDay: Date | null = null;
    let currentDayGroups: MessageGroup[] = [];
    let currentGroup: MessageGroup | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt);

      // Check if we need a new day
      if (!currentDay || !isSameDay(messageDate, currentDay)) {
        if (currentDayGroups.length > 0) {
          groups.push({ date: currentDay!, groups: [...currentDayGroups] });
        }
        currentDay = messageDate;
        currentDayGroups = [];
        currentGroup = null;
      }

      // Check if we need a new group (different sender or too much time passed)
      const shouldStartNewGroup =
        !currentGroup ||
        currentGroup.senderId !== message.senderId ||
        messageDate.getTime() - new Date(currentGroup.messages[currentGroup.messages.length - 1]!.createdAt).getTime() > 300000; // 5 minutes

      if (shouldStartNewGroup) {
        currentGroup = {
          senderId: message.senderId,
          messages: [message],
          date: messageDate,
        };
        currentDayGroups.push(currentGroup);
      } else {
        currentGroup!.messages.push(message);
      }
    });

    // Don't forget the last day
    if (currentDayGroups.length > 0 && currentDay) {
      groups.push({ date: currentDay, groups: currentDayGroups });
    }

    return groups;
  }, [messages]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (shouldAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Handle context menu
  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent, messageId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, messageId });
    },
    []
  );

  // Close context menu on click outside
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Handle scroll events
  const handleScroll = React.useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShouldAutoScroll(isNearBottom);
  }, [setShouldAutoScroll]);

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="messages-loading"
        className={cn('flex items-center justify-center h-full', className)}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-pulse flex flex-col gap-3 w-full max-w-md px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div
        data-testid="empty-messages"
        className={cn('flex items-center justify-center h-full', className)}
      >
        <div className="text-center">
          <div className="rounded-full bg-muted p-4 mx-auto w-fit mb-4">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="font-medium">No messages yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to send a message!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full', className)}>
      <ScrollArea
        ref={scrollRef}
        className="h-full"
        onScrollCapture={handleScroll}
      >
        <div
          data-testid="message-list"
          className="flex flex-col gap-4 p-4"
          role="log"
          aria-label="Chat messages"
        >
          {groupedMessages.map((day, dayIndex) => (
            <React.Fragment key={day.date.toISOString()}>
              {/* Date Separator */}
              {dayIndex > 0 && (
                <div
                  data-testid="date-separator"
                  className="flex items-center gap-3 my-4"
                  role="separator"
                >
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatDateSeparator(day.date)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Message Groups */}
              {day.groups.map((group, groupIndex) => (
                <div
                  key={`${group.senderId}-${group.date.toISOString()}`}
                  data-testid="message-group"
                  className={cn(
                    'flex flex-col gap-0.5',
                    group.senderId === currentUserId ? 'items-end' : 'items-start'
                  )}
                >
                  {group.messages.map((message, messageIndex) => {
                    const isOwn = message.senderId === currentUserId;
                    const sender = users[message.senderId];
                    const showAvatar = messageIndex === 0;
                    const showTimestamp =
                      messageIndex === group.messages.length - 1;

                    return (
                      <MessageItem
                        key={message.id}
                        message={message}
                        sender={sender}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        showTimestamp={showTimestamp}
                        onContextMenu={(e) => handleContextMenu(e, message.id)}
                        onAddReaction={() => setReactionPicker(message.id)}
                        onReact={onReact}
                        className={cn(
                          isOwn ? 'message-sent' : 'message-received'
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </React.Fragment>
          ))}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Scroll to Bottom Button */}
      {!shouldAutoScroll && (
        <Button
          data-testid="scroll-to-bottom"
          variant="secondary"
          size="icon"
          className="absolute bottom-4 right-4 rounded-full shadow-lg"
          onClick={() => {
            scrollToBottom('smooth');
            setShouldAutoScroll(true);
          }}
          aria-label="Scroll to latest messages"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </Button>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          data-testid="message-context-menu"
          className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          {messages.find((m) => m.id === contextMenu.messageId)?.senderId ===
            currentUserId && (
            <>
              <button
                role="menuitem"
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
                onClick={() => {
                  onEditMessage?.(contextMenu.messageId);
                  setContextMenu(null);
                }}
              >
                Edit
              </button>
              <button
                role="menuitem"
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent text-destructive"
                onClick={() => {
                  onDeleteMessage?.(contextMenu.messageId);
                  setContextMenu(null);
                }}
              >
                Delete
              </button>
            </>
          )}
          <button
            role="menuitem"
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onClick={() => {
              onReplyMessage?.(contextMenu.messageId);
              setContextMenu(null);
            }}
          >
            Reply
          </button>
          <button
            role="menuitem"
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onClick={() => {
              navigator.clipboard.writeText(
                messages.find((m) => m.id === contextMenu.messageId)?.content ?? ''
              );
              setContextMenu(null);
            }}
          >
            Copy
          </button>
        </div>
      )}

      {/* Reaction Picker */}
      {reactionPicker && (
        <div
          data-testid="reaction-picker"
          className="fixed inset-0 z-50"
          onClick={() => setReactionPicker(null)}
        >
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-popover border rounded-lg p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2">
              {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                <button
                  key={emoji}
                  className="text-2xl hover:scale-125 transition-transform"
                  onClick={() => {
                    onReact?.(reactionPicker, emoji);
                    setReactionPicker(null);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

MessageList.displayName = 'MessageList';
