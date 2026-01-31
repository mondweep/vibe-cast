/**
 * useMessages Hook
 *
 * Manages chat messages with optimistic updates, pagination,
 * and real-time synchronization.
 */

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSocket } from './useSocket';
import { generateId } from '@/lib/utils';

interface Reaction {
  emoji: string;
  userId: string;
  createdAt: Date;
}

interface Message {
  id: string;
  content: string;
  roomId: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'video' | 'audio' | 'system';
  replyToId?: string;
  reactions: Reaction[];
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Optimistic update flags
  isPending?: boolean;
  isFailed?: boolean;
}

interface UseMessagesOptions {
  limit?: number;
  autoLoad?: boolean;
}

interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  sendMessage: (content: string, replyToId?: string, attachments?: File[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMessages(
  roomId: string,
  options: UseMessagesOptions = {}
): UseMessagesReturn {
  const { limit = 50, autoLoad = true } = options;

  const { socket, isConnected, on, emit } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const pendingMessagesRef = useRef<Map<string, Message>>(new Map());

  // Fetch messages
  const fetchMessages = useCallback(
    async (cursor?: string) => {
      if (!roomId) return;

      try {
        const isInitial = !cursor;
        if (isInitial) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const params = new URLSearchParams({
          limit: String(limit),
          ...(cursor && { cursor }),
        });

        const response = await fetch(`/api/rooms/${roomId}/messages?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data = await response.json();
        const fetchedMessages: Message[] = data.messages.map((m: unknown) => ({
          ...(m as Message),
          createdAt: new Date((m as Message).createdAt),
          updatedAt: new Date((m as Message).updatedAt),
        }));

        setMessages((prev) => {
          if (isInitial) {
            return fetchedMessages;
          }
          // Prepend older messages
          return [...fetchedMessages, ...prev];
        });

        setHasMore(data.hasMore);
        cursorRef.current = data.nextCursor;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [roomId, limit]
  );

  // Auto load on mount
  useEffect(() => {
    if (autoLoad && roomId) {
      fetchMessages();
    }
  }, [roomId, autoLoad, fetchMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // New message received
    const unsubNewMessage = on<Message>('message:new', (message) => {
      if (message.roomId !== roomId) return;

      setMessages((prev) => {
        // Check if this is a confirmation of our pending message
        const pendingKey = Array.from(pendingMessagesRef.current.entries()).find(
          ([_, m]) => m.senderId === message.senderId && m.content === message.content
        )?.[0];

        if (pendingKey) {
          pendingMessagesRef.current.delete(pendingKey);
          return prev.map((m) =>
            m.id === pendingKey
              ? { ...message, createdAt: new Date(message.createdAt), updatedAt: new Date(message.updatedAt) }
              : m
          );
        }

        // Check if message already exists
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }

        return [...prev, { ...message, createdAt: new Date(message.createdAt), updatedAt: new Date(message.updatedAt) }];
      });
    });

    // Message updated
    const unsubMessageUpdated = on<Message>('message:updated', (message) => {
      if (message.roomId !== roomId) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...message, createdAt: new Date(message.createdAt), updatedAt: new Date(message.updatedAt) }
            : m
        )
      );
    });

    // Message deleted
    const unsubMessageDeleted = on<{ messageId: string; roomId: string }>(
      'message:deleted',
      ({ messageId, roomId: eventRoomId }) => {
        if (eventRoomId !== roomId) return;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, content: '' }
              : m
          )
        );
      }
    );

    // Reaction added
    const unsubReactionAdded = on<{
      messageId: string;
      roomId: string;
      reaction: Reaction;
    }>('message:reaction_added', ({ messageId, roomId: eventRoomId, reaction }) => {
      if (eventRoomId !== roomId) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, reactions: [...m.reactions, reaction] }
            : m
        )
      );
    });

    // Reaction removed
    const unsubReactionRemoved = on<{
      messageId: string;
      roomId: string;
      userId: string;
      emoji: string;
    }>('message:reaction_removed', ({ messageId, roomId: eventRoomId, userId, emoji }) => {
      if (eventRoomId !== roomId) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: m.reactions.filter(
                  (r) => !(r.userId === userId && r.emoji === emoji)
                ),
              }
            : m
        )
      );
    });

    return () => {
      unsubNewMessage();
      unsubMessageUpdated();
      unsubMessageDeleted();
      unsubReactionAdded();
      unsubReactionRemoved();
    };
  }, [isConnected, roomId, on]);

  // Send message with optimistic update
  const sendMessage = useCallback(
    async (content: string, replyToId?: string, attachments?: File[]) => {
      if (!roomId || !content.trim()) return;

      // Create optimistic message
      const tempId = generateId('temp');
      const optimisticMessage: Message = {
        id: tempId,
        content: content.trim(),
        roomId,
        senderId: 'current-user', // Will be replaced by actual user ID
        type: 'text',
        replyToId,
        reactions: [],
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPending: true,
      };

      // Add to pending and local state
      pendingMessagesRef.current.set(tempId, optimisticMessage);
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        // Upload attachments if any
        let attachmentUrls: string[] = [];
        if (attachments && attachments.length > 0) {
          const formData = new FormData();
          attachments.forEach((file) => formData.append('files', file));

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            attachmentUrls = uploadData.urls;
          }
        }

        // Send via API
        const response = await fetch(`/api/rooms/${roomId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            replyToId,
            attachments: attachmentUrls,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        // Message will be updated via socket event
      } catch (err) {
        // Mark message as failed
        pendingMessagesRef.current.delete(tempId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, isPending: false, isFailed: true } : m
          )
        );
        throw err instanceof Error ? err : new Error('Failed to send message');
      }
    },
    [roomId]
  );

  // Edit message
  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!roomId || !content.trim()) return;

      try {
        const response = await fetch(`/api/rooms/${roomId}/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        });

        if (!response.ok) {
          throw new Error('Failed to edit message');
        }

        // Optimistic update
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: content.trim(), isEdited: true, updatedAt: new Date() }
              : m
          )
        );
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to edit message');
      }
    },
    [roomId]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!roomId) return;

      try {
        const response = await fetch(`/api/rooms/${roomId}/messages/${messageId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete message');
        }

        // Optimistic update
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, content: '' }
              : m
          )
        );
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to delete message');
      }
    },
    [roomId]
  );

  // Add reaction
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!roomId) return;

      emit('message:react', { messageId, roomId, emoji });
    },
    [roomId, emit]
  );

  // Remove reaction
  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!roomId) return;

      emit('message:unreact', { messageId, roomId, emoji });
    },
    [roomId, emit]
  );

  // Load more messages
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursorRef.current) return;
    await fetchMessages(cursorRef.current);
  }, [hasMore, isLoadingMore, fetchMessages]);

  // Refresh messages
  const refresh = useCallback(async () => {
    cursorRef.current = null;
    await fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    loadMore,
    refresh,
  };
}
