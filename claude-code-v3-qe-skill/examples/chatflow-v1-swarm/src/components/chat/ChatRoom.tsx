/**
 * ChatRoom Component
 *
 * Main chat room container that orchestrates all chat functionality.
 * Includes message list, input, header, and typing indicators.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { RoomHeader } from './RoomHeader';
import { TypingIndicator } from './TypingIndicator';
import { useSocket } from '@/hooks/useSocket';
import { useRoom } from '@/hooks/useRoom';
import { useMessages } from '@/hooks/useMessages';
import { useTyping } from '@/hooks/useTyping';

interface ChatRoomProps {
  roomId: string;
  currentUserId: string;
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
  className?: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  roomId,
  currentUserId,
  showSidebar = false,
  onToggleSidebar,
  className,
}) => {
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const { socket, isConnected, error: socketError, isReconnecting } = useSocket();
  const { room, members, isLoading: roomLoading, error: roomError } = useRoom(roomId);
  const {
    messages,
    isLoading: messagesLoading,
    error: messagesError,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useMessages(roomId);
  const { typingUsers, startTyping, stopTyping } = useTyping(roomId, currentUserId);

  const [replyTo, setReplyTo] = React.useState<{
    id: string;
    content: string;
    senderName: string;
  } | null>(null);

  // Focus input on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Create users lookup object
  const usersMap = React.useMemo(() => {
    const map: Record<string, { id: string; name: string; avatar?: string }> = {};
    members.forEach((member) => {
      map[member.id] = member;
    });
    return map;
  }, [members]);

  // Handle send message
  const handleSend = React.useCallback(
    async (content: string, attachments?: File[]) => {
      try {
        await sendMessage(content, replyTo?.id, attachments);
        setReplyTo(null);
        stopTyping();
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [sendMessage, replyTo, stopTyping]
  );

  // Handle edit message
  const handleEdit = React.useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        // Could implement inline editing or modal here
        console.log('Edit message:', message);
      }
    },
    [messages]
  );

  // Handle delete message
  const handleDelete = React.useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage(messageId);
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    },
    [deleteMessage]
  );

  // Handle reply to message
  const handleReply = React.useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        const sender = usersMap[message.senderId];
        setReplyTo({
          id: message.id,
          content: message.content,
          senderName: sender?.name ?? 'Unknown',
        });
        inputRef.current?.focus();
      }
    },
    [messages, usersMap]
  );

  // Handle reaction
  const handleReact = React.useCallback(
    (messageId: string, emoji: string) => {
      // Implement reaction logic
      console.log('React to message:', messageId, emoji);
    },
    []
  );

  // Loading state
  if (roomLoading) {
    return (
      <div
        data-testid="chat-room-loading"
        className={cn('flex items-center justify-center h-full', className)}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-muted-foreground">Loading chat room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (roomError) {
    return (
      <div
        data-testid="chat-room-error"
        className={cn(
          'flex items-center justify-center h-full',
          className
        )}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">Failed to load room</h3>
            <p className="text-sm text-muted-foreground">{roomError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="chat-room"
      className={cn(
        'flex flex-col h-full bg-background',
        className
      )}
      role="main"
      aria-label="Chat room"
    >
      {/* Room Header */}
      <RoomHeader
        room={room!}
        memberCount={members.length}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        onToggleSidebar={onToggleSidebar}
        showSidebarToggle={showSidebar}
      />

      {/* Connection Status */}
      {isConnected ? (
        <div
          data-testid="connection-status-connected"
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          Connected to chat
        </div>
      ) : isReconnecting ? (
        <div
          data-testid="connection-status-reconnecting"
          className="flex items-center justify-center py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm"
          role="status"
          aria-live="polite"
        >
          <svg
            className="animate-spin h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Reconnecting...
        </div>
      ) : (
        <div
          data-testid="connection-status-disconnected"
          className="flex items-center justify-center py-2 bg-destructive/10 text-destructive text-sm"
          role="status"
          aria-live="polite"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
            />
          </svg>
          Disconnected
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          users={usersMap}
          isLoading={messagesLoading}
          onEditMessage={handleEdit}
          onDeleteMessage={handleDelete}
          onReplyMessage={handleReply}
          onReact={handleReact}
        />
      </div>

      {/* Screen Reader Status for New Messages */}
      <div role="status" aria-live="polite" className="sr-only">
        {messages.length > 0 &&
          `${messages.length} messages in chat`}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <TypingIndicator typingUsers={typingUsers} className="px-4 py-2" />
      )}

      {/* Message Input */}
      <div className="border-t">
        <MessageInput
          ref={inputRef}
          onSend={handleSend}
          onTyping={startTyping}
          onStopTyping={stopTyping}
          disabled={!isConnected}
          disabledMessage={!isConnected ? 'You must be connected to send messages' : undefined}
          placeholder="Type a message..."
          replyTo={replyTo ?? undefined}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      {/* Mobile Sidebar Toggle */}
      {showSidebar && (
        <button
          data-testid="sidebar-toggle"
          className="md:hidden fixed bottom-24 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-lg"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

ChatRoom.displayName = 'ChatRoom';
