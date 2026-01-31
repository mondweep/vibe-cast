/**
 * useTyping Hook
 *
 * Manages typing indicators with debouncing and real-time updates.
 * Handles both sending and receiving typing events.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
}

interface UseTypingOptions {
  debounceMs?: number;
  timeoutMs?: number;
}

interface UseTypingReturn {
  typingUsers: TypingUser[];
  isTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
}

export function useTyping(
  roomId: string,
  currentUserId: string,
  options: UseTypingOptions = {}
): UseTypingReturn {
  const { debounceMs = 300, timeoutMs = 3000 } = options;

  const { isConnected, on, emit } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Refs for timeout management
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastTypingEmitRef = useRef<number>(0);

  // Clear user from typing list after timeout
  const clearUserTyping = useCallback((userId: string) => {
    setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
    const timeout = userTimeoutsRef.current.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      userTimeoutsRef.current.delete(userId);
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!isConnected || !roomId) return;

    // User started typing
    const unsubStarted = on<{
      userId: string;
      userName: string;
      userAvatar?: string;
      roomId: string;
    }>('typing:started', ({ userId, userName, userAvatar, roomId: eventRoomId }) => {
      if (eventRoomId !== roomId || userId === currentUserId) return;

      setTypingUsers((prev) => {
        // Already in the list - just refresh timeout
        if (prev.some((u) => u.id === userId)) {
          return prev;
        }
        return [...prev, { id: userId, name: userName, avatar: userAvatar }];
      });

      // Clear existing timeout for this user
      const existingTimeout = userTimeoutsRef.current.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout to remove user from typing list
      const timeout = setTimeout(() => {
        clearUserTyping(userId);
      }, timeoutMs);
      userTimeoutsRef.current.set(userId, timeout);
    });

    // User stopped typing
    const unsubStopped = on<{ userId: string; roomId: string }>(
      'typing:stopped',
      ({ userId, roomId: eventRoomId }) => {
        if (eventRoomId !== roomId || userId === currentUserId) return;
        clearUserTyping(userId);
      }
    );

    return () => {
      unsubStarted();
      unsubStopped();

      // Clear all timeouts on cleanup
      userTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      userTimeoutsRef.current.clear();
    };
  }, [isConnected, roomId, currentUserId, on, clearUserTyping, timeoutMs]);

  // Cleanup on room change
  useEffect(() => {
    return () => {
      setTypingUsers([]);
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId]);

  // Start typing - debounced to prevent spam
  const startTyping = useCallback(() => {
    if (!roomId || !isConnected) return;

    const now = Date.now();

    // Debounce: don't emit if we just emitted recently
    if (now - lastTypingEmitRef.current < debounceMs) {
      // Just reset the timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        emit('typing:stop', { roomId });
        setIsTyping(false);
      }, timeoutMs);
      return;
    }

    // Emit typing started
    if (!isTyping) {
      emit('typing:start', { roomId });
      setIsTyping(true);
      lastTypingEmitRef.current = now;
    }

    // Reset or create timeout to auto-stop
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emit('typing:stop', { roomId });
      setIsTyping(false);
    }, timeoutMs);
  }, [roomId, isConnected, isTyping, emit, debounceMs, timeoutMs]);

  // Stop typing immediately
  const stopTyping = useCallback(() => {
    if (!roomId || !isConnected || !isTyping) return;

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Emit stop
    emit('typing:stop', { roomId });
    setIsTyping(false);
  }, [roomId, isConnected, isTyping, emit]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
  };
}

// Hook for just showing typing indicator without sending events
export function useTypingDisplay(roomId: string): TypingUser[] {
  const { isConnected, on } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const userTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!isConnected || !roomId) return;

    const unsubStarted = on<{
      userId: string;
      userName: string;
      userAvatar?: string;
      roomId: string;
    }>('typing:started', ({ userId, userName, userAvatar, roomId: eventRoomId }) => {
      if (eventRoomId !== roomId) return;

      setTypingUsers((prev) => {
        if (prev.some((u) => u.id === userId)) return prev;
        return [...prev, { id: userId, name: userName, avatar: userAvatar }];
      });

      // Clear existing timeout
      const existingTimeout = userTimeoutsRef.current.get(userId);
      if (existingTimeout) clearTimeout(existingTimeout);

      // Set timeout to remove
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
        userTimeoutsRef.current.delete(userId);
      }, 3000);
      userTimeoutsRef.current.set(userId, timeout);
    });

    const unsubStopped = on<{ userId: string; roomId: string }>(
      'typing:stopped',
      ({ userId, roomId: eventRoomId }) => {
        if (eventRoomId !== roomId) return;
        setTypingUsers((prev) => prev.filter((u) => u.id !== userId));
        const timeout = userTimeoutsRef.current.get(userId);
        if (timeout) {
          clearTimeout(timeout);
          userTimeoutsRef.current.delete(userId);
        }
      }
    );

    return () => {
      unsubStarted();
      unsubStopped();
      userTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      userTimeoutsRef.current.clear();
    };
  }, [isConnected, roomId, on]);

  return typingUsers;
}
