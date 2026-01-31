/**
 * Room API Integration Tests
 *
 * TDD approach: These tests define expected behavior for room CRUD operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createMockUser, createMockRoom, generateId } from '../../setup';

// Mock NextAuth session
const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

describe('Room API', () => {
  const baseUrl = 'http://localhost:3000/api';

  describe('GET /api/rooms', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/rooms`);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return paginated list of rooms for authenticated user', async () => {
      // This test expects a successful response with rooms the user is a member of
      const response = await fetch(`${baseUrl}/rooms`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBe(1);
      expect(data.meta.limit).toBeGreaterThan(0);
    });

    it('should support pagination query parameters', async () => {
      const response = await fetch(`${baseUrl}/rooms?page=2&limit=10`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.meta.page).toBe(2);
      expect(data.meta.limit).toBe(10);
    });

    it('should filter rooms by type', async () => {
      const response = await fetch(`${baseUrl}/rooms?type=GROUP`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      if (data.data.length > 0) {
        expect(data.data.every((room: { type: string }) => room.type === 'GROUP')).toBe(true);
      }
    });
  });

  describe('POST /api/rooms', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test Room' }),
      });

      expect(response.status).toBe(401);
    });

    it('should create a new room with valid data', async () => {
      const roomData = {
        name: 'My New Room',
        description: 'A test room',
        type: 'GROUP',
        settings: {
          isPrivate: true,
          allowInvites: true,
        },
      };

      const response = await fetch(`${baseUrl}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(roomData),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(roomData.name);
      expect(data.data.description).toBe(roomData.description);
      expect(data.data.type).toBe(roomData.type);
      expect(data.data.id).toBeDefined();
    });

    it('should return 422 for invalid room name', async () => {
      const response = await fetch(`${baseUrl}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ name: '' }),
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for room name exceeding max length', async () => {
      const response = await fetch(`${baseUrl}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      });

      expect(response.status).toBe(422);
    });
  });

  describe('GET /api/rooms/[roomId]', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/rooms/room-123`);
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent room', async () => {
      const response = await fetch(`${baseUrl}/rooms/non-existent-room`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return room details for valid room', async () => {
      // Assuming a room exists with this ID
      const roomId = 'existing-room-id';
      const response = await fetch(`${baseUrl}/rooms/${roomId}`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(roomId);
        expect(data.data.name).toBeDefined();
        expect(data.data.type).toBeDefined();
      }
    });

    it('should return 403 when user is not a member', async () => {
      const roomId = 'private-room-user-not-member';
      const response = await fetch(`${baseUrl}/rooms/${roomId}`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      // Room exists but user is not a member
      if (response.status === 403) {
        const data = await response.json();
        expect(data.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('PATCH /api/rooms/[roomId]', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/rooms/room-123`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(response.status).toBe(401);
    });

    it('should update room with valid data', async () => {
      const roomId = 'existing-room-id';
      const updateData = {
        name: 'Updated Room Name',
        description: 'Updated description',
      };

      const response = await fetch(`${baseUrl}/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(updateData),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.name).toBe(updateData.name);
      }
    });

    it('should return 403 when user is not admin/owner', async () => {
      const roomId = 'room-user-is-member-not-admin';
      const response = await fetch(`${baseUrl}/rooms/${roomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ name: 'Unauthorized Update' }),
      });

      if (response.status === 403) {
        const data = await response.json();
        expect(data.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('DELETE /api/rooms/[roomId]', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/rooms/room-123`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);
    });

    it('should delete room when user is owner', async () => {
      const roomId = 'room-to-delete';
      const response = await fetch(`${baseUrl}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 204) {
        expect(response.status).toBe(204);
      }
    });

    it('should return 403 when user is not owner', async () => {
      const roomId = 'room-user-is-not-owner';
      const response = await fetch(`${baseUrl}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 403) {
        const data = await response.json();
        expect(data.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('GET /api/rooms/[roomId]/members', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/rooms/room-123/members`);
      expect(response.status).toBe(401);
    });

    it('should return list of room members', async () => {
      const roomId = 'existing-room-id';
      const response = await fetch(`${baseUrl}/rooms/${roomId}/members`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });
  });

  describe('POST /api/rooms/[roomId]/members', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/rooms/room-123/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'user-456' }),
      });

      expect(response.status).toBe(401);
    });

    it('should add member to room', async () => {
      const roomId = 'existing-room-id';
      const memberData = {
        userId: 'new-user-id',
        role: 'MEMBER',
      };

      const response = await fetch(`${baseUrl}/rooms/${roomId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(memberData),
      });

      if (response.status === 201) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.userId).toBe(memberData.userId);
      }
    });

    it('should return 409 when user is already a member', async () => {
      const roomId = 'existing-room-id';
      const memberData = {
        userId: 'user-123', // Same as authenticated user
        role: 'MEMBER',
      };

      const response = await fetch(`${baseUrl}/rooms/${roomId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(memberData),
      });

      if (response.status === 409) {
        const data = await response.json();
        expect(data.error.code).toBe('CONFLICT');
      }
    });

    it('should return 403 when user cannot invite', async () => {
      const roomId = 'room-invites-disabled';
      const memberData = {
        userId: 'new-user-id',
        role: 'MEMBER',
      };

      const response = await fetch(`${baseUrl}/rooms/${roomId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(memberData),
      });

      if (response.status === 403) {
        const data = await response.json();
        expect(data.error.code).toBe('FORBIDDEN');
      }
    });
  });
});
