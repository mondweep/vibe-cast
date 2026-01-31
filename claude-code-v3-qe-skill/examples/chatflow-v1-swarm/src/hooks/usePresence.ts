/**
 * usePresence Hook
 *
 * Manages user presence (online/away/offline) with heartbeat
 * and real-time status updates.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

interface UserPresence {
  userId: string;
  userName: string;
  avatar?: string;
  status: PresenceStatus;
  customStatus?: string;
  lastSeen?: Date;
  device?: string;
}

interface UsePresenceOptions {
  heartbeatIntervalMs?: number;
  awayTimeoutMs?: number;
  enableAutoAway?: boolean;
}

interface UsePresenceReturn {
  currentStatus: PresenceStatus;
  customStatus: string | null;
  onlineUsers: UserPresence[];
  setStatus: (status: PresenceStatus) => void;
  setCustomStatus: (status: string | null) => void;
  getUserPresence: (userId: string) => UserPresence | undefined;
  isUserOnline: (userId: string) => boolean;
}

export function usePresence(
  roomId: string,
  currentUserId: string,
  options: UsePresenceOptions = {}
): UsePresenceReturn {
  const {
    heartbeatIntervalMs = 30000, // 30 seconds
    awayTimeoutMs = 300000, // 5 minutes
    enableAutoAway = true,
  } = options;

  const { isConnected, on, emit } = useSocket();
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus>('online');
  const [customStatus, setCustomStatusState] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);

  // Refs for interval/timeout management
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const awayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Reset away timer on activity
  const resetAwayTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // If currently away due to inactivity, set back to online
    if (currentStatus === 'away' && enableAutoAway) {
      setCurrentStatus('online');
      emit('presence:update', { roomId, status: 'online' });
    }

    // Reset away timeout
    if (awayTimeoutRef.current) {
      clearTimeout(awayTimeoutRef.current);
    }

    if (enableAutoAway && currentStatus === 'online') {
      awayTimeoutRef.current = setTimeout(() => {
        setCurrentStatus('away');
        emit('presence:update', { roomId, status: 'away' });
      }, awayTimeoutMs);
    }
  }, [currentStatus, enableAutoAway, awayTimeoutMs, emit, roomId]);

  // Activity listeners for auto-away
  useEffect(() => {
    if (!enableAutoAway) return;

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetAwayTimer, { passive: true });
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetAwayTimer);
      });
    };
  }, [enableAutoAway, resetAwayTimer]);

  // Initialize presence and start heartbeat
  useEffect(() => {
    if (!isConnected || !roomId) return;

    // Announce presence
    emit('presence:join', {
      roomId,
      status: currentStatus,
      customStatus,
    });

    // Start heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      emit('presence:heartbeat', { roomId, status: currentStatus });
    }, heartbeatIntervalMs);

    // Start away timer
    if (enableAutoAway) {
      awayTimeoutRef.current = setTimeout(() => {
        setCurrentStatus('away');
        emit('presence:update', { roomId, status: 'away' });
      }, awayTimeoutMs);
    }

    return () => {
      // Announce leaving
      emit('presence:leave', { roomId });

      // Clear intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current);
      }
    };
  }, [isConnected, roomId, currentStatus, customStatus, emit, heartbeatIntervalMs, awayTimeoutMs, enableAutoAway]);

  // Socket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // User joined
    const unsubJoined = on<UserPresence>('presence:joined', (presence) => {
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.userId === presence.userId)) {
          return prev.map((u) =>
            u.userId === presence.userId ? presence : u
          );
        }
        return [...prev, presence];
      });
    });

    // User left
    const unsubLeft = on<{ userId: string }>('presence:left', ({ userId }) => {
      setOnlineUsers((prev) =>
        prev.map((u) =>
          u.userId === userId
            ? { ...u, status: 'offline' as const, lastSeen: new Date() }
            : u
        )
      );
    });

    // Status updated
    const unsubUpdated = on<{
      userId: string;
      status: PresenceStatus;
      customStatus?: string;
    }>('presence:updated', ({ userId, status, customStatus: cs }) => {
      setOnlineUsers((prev) =>
        prev.map((u) =>
          u.userId === userId
            ? { ...u, status, customStatus: cs, lastSeen: status === 'offline' ? new Date() : u.lastSeen }
            : u
        )
      );
    });

    // Initial presence list
    const unsubList = on<{ users: UserPresence[] }>(
      'presence:list',
      ({ users }) => {
        setOnlineUsers(users);
      }
    );

    return () => {
      unsubJoined();
      unsubLeft();
      unsubUpdated();
      unsubList();
    };
  }, [isConnected, on]);

  // Handle visibility change (tab hidden = away)
  useEffect(() => {
    if (!enableAutoAway) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't override manual DND status
        if (currentStatus !== 'dnd') {
          setCurrentStatus('away');
          emit('presence:update', { roomId, status: 'away' });
        }
      } else {
        // Don't override manual statuses
        if (currentStatus === 'away') {
          setCurrentStatus('online');
          emit('presence:update', { roomId, status: 'online' });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableAutoAway, currentStatus, emit, roomId]);

  // Set status manually
  const setStatus = useCallback(
    (status: PresenceStatus) => {
      setCurrentStatus(status);
      emit('presence:update', { roomId, status });

      // Clear away timeout if setting to DND
      if (status === 'dnd' && awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current);
      }
    },
    [emit, roomId]
  );

  // Set custom status
  const setCustomStatus = useCallback(
    (status: string | null) => {
      setCustomStatusState(status);
      emit('presence:update', { roomId, customStatus: status });
    },
    [emit, roomId]
  );

  // Get user presence
  const getUserPresence = useCallback(
    (userId: string): UserPresence | undefined => {
      return onlineUsers.find((u) => u.userId === userId);
    },
    [onlineUsers]
  );

  // Check if user is online
  const isUserOnline = useCallback(
    (userId: string): boolean => {
      const presence = onlineUsers.find((u) => u.userId === userId);
      return presence?.status !== 'offline';
    },
    [onlineUsers]
  );

  return {
    currentStatus,
    customStatus,
    onlineUsers,
    setStatus,
    setCustomStatus,
    getUserPresence,
    isUserOnline,
  };
}

// Simplified hook for just tracking presence of a single user
export function useUserPresence(userId: string): UserPresence | null {
  const { isConnected, on } = useSocket();
  const [presence, setPresence] = useState<UserPresence | null>(null);

  useEffect(() => {
    if (!isConnected || !userId) return;

    // Listen for this user's presence updates
    const unsubUpdated = on<UserPresence>('presence:updated', (data) => {
      if (data.userId === userId) {
        setPresence(data);
      }
    });

    const unsubJoined = on<UserPresence>('presence:joined', (data) => {
      if (data.userId === userId) {
        setPresence(data);
      }
    });

    const unsubLeft = on<{ userId: string }>('presence:left', ({ userId: leftUserId }) => {
      if (leftUserId === userId) {
        setPresence((prev) =>
          prev ? { ...prev, status: 'offline', lastSeen: new Date() } : null
        );
      }
    });

    return () => {
      unsubUpdated();
      unsubJoined();
      unsubLeft();
    };
  }, [isConnected, userId, on]);

  return presence;
}

// Hook for presence in a specific room
export function useRoomPresence(roomId: string): {
  users: UserPresence[];
  onlineCount: number;
  awayCount: number;
} {
  const { isConnected, on, emit } = useSocket();
  const [users, setUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    if (!isConnected || !roomId) return;

    // Request current presence list
    emit('presence:request_list', { roomId });

    // Subscribe to presence events
    const unsubList = on<{ users: UserPresence[] }>('presence:list', ({ users: userList }) => {
      setUsers(userList);
    });

    const unsubJoined = on<UserPresence>('presence:joined', (presence) => {
      setUsers((prev) => {
        if (prev.some((u) => u.userId === presence.userId)) {
          return prev.map((u) => (u.userId === presence.userId ? presence : u));
        }
        return [...prev, presence];
      });
    });

    const unsubLeft = on<{ userId: string }>('presence:left', ({ userId }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId
            ? { ...u, status: 'offline' as const, lastSeen: new Date() }
            : u
        )
      );
    });

    const unsubUpdated = on<{
      userId: string;
      status: PresenceStatus;
      customStatus?: string;
    }>('presence:updated', ({ userId, status, customStatus }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId
            ? { ...u, status, customStatus, lastSeen: status === 'offline' ? new Date() : u.lastSeen }
            : u
        )
      );
    });

    return () => {
      unsubList();
      unsubJoined();
      unsubLeft();
      unsubUpdated();
    };
  }, [isConnected, roomId, on, emit]);

  const onlineCount = users.filter((u) => u.status === 'online').length;
  const awayCount = users.filter((u) => u.status === 'away').length;

  return { users, onlineCount, awayCount };
}
