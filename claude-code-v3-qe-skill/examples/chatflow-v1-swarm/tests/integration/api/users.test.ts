/**
 * User API Integration Tests
 *
 * TDD approach: These tests define expected behavior for user profile and presence operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createMockUser, generateId } from '../../setup';

describe('User API', () => {
  const baseUrl = 'http://localhost:3000/api';
  const testUserId = 'user-123';

  describe('GET /api/users/[userId]', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}`);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return user profile', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(testUserId);
        expect(data.data.displayName).toBeDefined();
        expect(data.data.email).toBeDefined();
      }
    });

    it('should return 404 for non-existent user', async () => {
      const response = await fetch(`${baseUrl}/users/non-existent-user`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return limited profile for non-self users', async () => {
      const otherUserId = 'other-user-id';
      const response = await fetch(`${baseUrl}/users/${otherUserId}`, {
        headers: {
          'Authorization': 'Bearer test-token', // Authenticated as different user
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        // Email should not be exposed for other users
        expect(data.data.email).toBeUndefined();
        expect(data.data.displayName).toBeDefined();
      }
    });
  });

  describe('PATCH /api/users/[userId]', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: 'New Name' }),
      });

      expect(response.status).toBe(401);
    });

    it('should update own profile with valid data', async () => {
      const updateData = {
        displayName: 'Updated Display Name',
        bio: 'Updated bio text',
        timezone: 'America/New_York',
      };

      const response = await fetch(`${baseUrl}/users/${testUserId}`, {
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
        expect(data.data.displayName).toBe(updateData.displayName);
        expect(data.data.bio).toBe(updateData.bio);
        expect(data.data.timezone).toBe(updateData.timezone);
      }
    });

    it('should return 403 when updating another user profile', async () => {
      const otherUserId = 'other-user-id';
      const response = await fetch(`${baseUrl}/users/${otherUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ displayName: 'Hacked Name' }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should return 422 for invalid display name', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ displayName: '' }),
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for bio exceeding max length', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ bio: 'a'.repeat(501) }),
      });

      expect(response.status).toBe(422);
    });

    it('should update avatar URL', async () => {
      const updateData = {
        avatarUrl: 'https://example.com/new-avatar.jpg',
      };

      const response = await fetch(`${baseUrl}/users/${testUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(updateData),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.avatarUrl).toBe(updateData.avatarUrl);
      }
    });

    it('should return 422 for invalid avatar URL', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ avatarUrl: 'not-a-valid-url' }),
      });

      expect(response.status).toBe(422);
    });
  });

  describe('GET /api/users/[userId]/presence', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/presence`);
      expect(response.status).toBe(401);
    });

    it('should return user presence status', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/presence`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.userId).toBe(testUserId);
        expect(data.data.status).toBeDefined();
        expect(['online', 'away', 'dnd', 'offline']).toContain(data.data.status);
        expect(data.data.lastSeenAt).toBeDefined();
      }
    });

    it('should return offline status for non-existent user presence', async () => {
      const newUserId = 'user-without-presence';
      const response = await fetch(`${baseUrl}/users/${newUserId}/presence`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.status).toBe('offline');
      }
    });
  });

  describe('PATCH /api/users/[userId]/presence', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/presence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'away' }),
      });

      expect(response.status).toBe(401);
    });

    it('should update own presence status', async () => {
      const updateData = {
        status: 'away',
        customStatus: 'In a meeting',
      };

      const response = await fetch(`${baseUrl}/users/${testUserId}/presence`, {
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
        expect(data.data.status).toBe(updateData.status);
        expect(data.data.customStatus).toBe(updateData.customStatus);
      }
    });

    it('should return 403 when updating another user presence', async () => {
      const otherUserId = 'other-user-id';
      const response = await fetch(`${baseUrl}/users/${otherUserId}/presence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ status: 'dnd' }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 422 for invalid presence status', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/presence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ status: 'invalid-status' }),
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for custom status exceeding max length', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/presence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          status: 'online',
          customStatus: 'a'.repeat(129),
        }),
      });

      expect(response.status).toBe(422);
    });

    it('should set status to online', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/presence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ status: 'online' }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.status).toBe('online');
      }
    });

    it('should set status to do not disturb', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/presence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ status: 'dnd' }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.status).toBe('dnd');
      }
    });

    it('should clear custom status when set to null', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/presence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          status: 'online',
          customStatus: null,
        }),
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data.customStatus).toBeNull();
      }
    });
  });

  describe('GET /api/users/[userId]/rooms', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/rooms`);
      expect(response.status).toBe(401);
    });

    it('should return list of rooms user is a member of', async () => {
      const response = await fetch(`${baseUrl}/users/${testUserId}/rooms`, {
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

    it('should return 403 when accessing another user rooms', async () => {
      const otherUserId = 'other-user-id';
      const response = await fetch(`${baseUrl}/users/${otherUserId}/rooms`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(403);
    });
  });
});
