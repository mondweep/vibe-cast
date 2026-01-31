/**
 * useRoom Hook
 *
 * Manages room state including members, settings, and real-time updates.
 * Handles joining/leaving rooms and member presence.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

interface RoomMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  status: 'online' | 'away' | 'dnd' | 'offline';
  joinedAt: Date;
  lastSeen?: Date;
}

interface RoomSettings {
  isPrivate: boolean;
  allowInvites: boolean;
  slowModeSeconds: number;
  messageRetentionDays?: number;
}

interface Room {
  id: string;
  name: string;
  description?: string;
  type: 'direct' | 'group' | 'channel';
  avatarUrl?: string;
  settings: RoomSettings;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  messageCount: number;
  isArchived: boolean;
}

interface UseRoomOptions {
  autoJoin?: boolean;
  fetchMembers?: boolean;
}

interface UseRoomReturn {
  room: Room | null;
  members: RoomMember[];
  isLoading: boolean;
  error: Error | null;
  isJoined: boolean;
  join: () => Promise<void>;
  leave: () => Promise<void>;
  updateSettings: (settings: Partial<RoomSettings>) => Promise<void>;
  inviteMember: (userId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberRole: (userId: string, role: RoomMember['role']) => Promise<void>;
}

export function useRoom(
  roomId: string,
  options: UseRoomOptions = {}
): UseRoomReturn {
  const { autoJoin = true, fetchMembers = true } = options;

  const { socket, isConnected, on, emit } = useSocket();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const hasJoinedRef = useRef(false);

  // Fetch room data
  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }

    const fetchRoom = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch room data via API
        const response = await fetch(`/api/rooms/${roomId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch room');
        }

        const data = await response.json();
        setRoom(data.room);

        if (fetchMembers) {
          setMembers(data.members ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, fetchMembers]);

  // Join room on connection
  useEffect(() => {
    if (!isConnected || !roomId || !autoJoin || hasJoinedRef.current) {
      return;
    }

    emit('room:join', { roomId });
    hasJoinedRef.current = true;
    setIsJoined(true);

    return () => {
      if (hasJoinedRef.current) {
        emit('room:leave', { roomId });
        hasJoinedRef.current = false;
        setIsJoined(false);
      }
    };
  }, [isConnected, roomId, autoJoin, emit]);

  // Socket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Room updated
    const unsubRoomUpdated = on<{ room: Room }>('room:updated', ({ room: updatedRoom }) => {
      if (updatedRoom.id === roomId) {
        setRoom(updatedRoom);
      }
    });

    // Member joined
    const unsubMemberJoined = on<{ member: RoomMember; roomId: string }>(
      'room:member_joined',
      ({ member, roomId: eventRoomId }) => {
        if (eventRoomId === roomId) {
          setMembers((prev) => {
            if (prev.some((m) => m.id === member.id)) {
              return prev;
            }
            return [...prev, member];
          });
        }
      }
    );

    // Member left
    const unsubMemberLeft = on<{ userId: string; roomId: string }>(
      'room:member_left',
      ({ userId, roomId: eventRoomId }) => {
        if (eventRoomId === roomId) {
          setMembers((prev) => prev.filter((m) => m.id !== userId));
        }
      }
    );

    // Member status changed
    const unsubStatusChanged = on<{
      userId: string;
      roomId: string;
      status: RoomMember['status'];
    }>('room:member_status', ({ userId, roomId: eventRoomId, status }) => {
      if (eventRoomId === roomId) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === userId ? { ...m, status } : m
          )
        );
      }
    });

    // Member role changed
    const unsubRoleChanged = on<{
      userId: string;
      roomId: string;
      role: RoomMember['role'];
    }>('room:member_role', ({ userId, roomId: eventRoomId, role }) => {
      if (eventRoomId === roomId) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === userId ? { ...m, role } : m
          )
        );
      }
    });

    return () => {
      unsubRoomUpdated();
      unsubMemberJoined();
      unsubMemberLeft();
      unsubStatusChanged();
      unsubRoleChanged();
    };
  }, [isConnected, roomId, on]);

  // Manual join
  const join = useCallback(async () => {
    if (!roomId || isJoined) return;

    try {
      emit('room:join', { roomId });
      hasJoinedRef.current = true;
      setIsJoined(true);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to join room');
    }
  }, [roomId, isJoined, emit]);

  // Manual leave
  const leave = useCallback(async () => {
    if (!roomId || !isJoined) return;

    try {
      emit('room:leave', { roomId });
      hasJoinedRef.current = false;
      setIsJoined(false);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to leave room');
    }
  }, [roomId, isJoined, emit]);

  // Update room settings
  const updateSettings = useCallback(
    async (settings: Partial<RoomSettings>) => {
      if (!roomId) return;

      try {
        const response = await fetch(`/api/rooms/${roomId}/settings`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });

        if (!response.ok) {
          throw new Error('Failed to update settings');
        }

        const data = await response.json();
        setRoom((prev) => (prev ? { ...prev, settings: data.settings } : null));
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update settings');
      }
    },
    [roomId]
  );

  // Invite member
  const inviteMember = useCallback(
    async (userId: string) => {
      if (!roomId) return;

      try {
        const response = await fetch(`/api/rooms/${roomId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          throw new Error('Failed to invite member');
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to invite member');
      }
    },
    [roomId]
  );

  // Remove member
  const removeMember = useCallback(
    async (userId: string) => {
      if (!roomId) return;

      try {
        const response = await fetch(`/api/rooms/${roomId}/members/${userId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove member');
        }

        setMembers((prev) => prev.filter((m) => m.id !== userId));
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to remove member');
      }
    },
    [roomId]
  );

  // Update member role
  const updateMemberRole = useCallback(
    async (userId: string, role: RoomMember['role']) => {
      if (!roomId) return;

      try {
        const response = await fetch(`/api/rooms/${roomId}/members/${userId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });

        if (!response.ok) {
          throw new Error('Failed to update member role');
        }

        setMembers((prev) =>
          prev.map((m) => (m.id === userId ? { ...m, role } : m))
        );
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to update member role');
      }
    },
    [roomId]
  );

  return {
    room,
    members,
    isLoading,
    error,
    isJoined,
    join,
    leave,
    updateSettings,
    inviteMember,
    removeMember,
    updateMemberRole,
  };
}
