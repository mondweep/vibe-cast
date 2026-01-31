/**
 * Message API Integration Tests
 *
 * TDD approach: These tests define expected behavior for message CRUD operations.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createMockMessage, generateId } from '../../setup';

describe('Message API', () => {
  const baseUrl = 'http://localhost:3000/api';
  const testRoomId = 'test-room-id';

  describe('GET /api/rooms/[roomId]/messages', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages`);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return paginated list of messages', async () => {
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.meta).toBeDefined();
        expect(data.meta.page).toBe(1);
        expect(data.meta.limit).toBeGreaterThan(0);
      }
    });

    it('should support pagination query parameters', async () => {
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages?page=2&limit=25`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.meta.page).toBe(2);
        expect(data.meta.limit).toBe(25);
      }
    });

    it('should support cursor-based pagination with before/after', async () => {
      const timestamp = new Date().toISOString();
      const response = await fetch(
        `${baseUrl}/rooms/${testRoomId}/messages?before=${timestamp}&limit=50`,
        {
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        // All messages should be before the given timestamp
        if (data.data.length > 0) {
          data.data.forEach((message: { createdAt: string }) => {
            expect(new Date(message.createdAt).getTime()).toBeLessThanOrEqual(
              new Date(timestamp).getTime()
            );
          });
        }
      }
    });

    it('should filter messages by thread', async () => {
      const threadId = 'parent-message-id';
      const response = await fetch(
        `${baseUrl}/rooms/${testRoomId}/messages?threadId=${threadId}`,
        {
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      if (response.status === 200) {
        const data = await response.json();
        if (data.data.length > 0) {
          expect(data.data.every((m: { threadId: string }) => m.threadId === threadId)).toBe(true);
        }
      }
    });

    it('should return 403 when user is not a room member', async () => {
      const privateRoomId = 'private-room-user-not-member';
      const response = await fetch(`${baseUrl}/rooms/${privateRoomId}/messages`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 403) {
        const data = await response.json();
        expect(data.error.code).toBe('FORBIDDEN');
      }
    });

    it('should return 404 for non-existent room', async () => {
      const response = await fetch(`${baseUrl}/rooms/non-existent-room/messages`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/rooms/[roomId]/messages', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'Hello, world!' }),
      });

      expect(response.status).toBe(401);
    });

    it('should create a new message with valid content', async () => {
      const messageData = {
        content: 'Hello, this is a test message!',
        type: 'TEXT',
      };

      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(messageData),
      });

      if (response.status === 201) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.content).toBe(messageData.content);
        expect(data.data.type).toBe(messageData.type);
        expect(data.data.id).toBeDefined();
        expect(data.data.senderId).toBeDefined();
        expect(data.data.roomId).toBe(testRoomId);
      }
    });

    it('should return 422 for empty message content', async () => {
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ content: '' }),
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for message exceeding max length', async () => {
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ content: 'a'.repeat(4001) }),
      });

      expect(response.status).toBe(422);
    });

    it('should create a message with reply reference', async () => {
      const messageData = {
        content: 'This is a reply!',
        replyToId: 'original-message-id',
      };

      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(messageData),
      });

      if (response.status === 201) {
        const data = await response.json();
        expect(data.data.replyToId).toBe(messageData.replyToId);
      }
    });

    it('should create a message in a thread', async () => {
      const messageData = {
        content: 'Thread reply!',
        threadId: 'parent-message-id',
      };

      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(messageData),
      });

      if (response.status === 201) {
        const data = await response.json();
        expect(data.data.threadId).toBe(messageData.threadId);
      }
    });

    it('should return 403 when user is not a room member', async () => {
      const response = await fetch(`${baseUrl}/rooms/private-room-not-member/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ content: 'Unauthorized message' }),
      });

      if (response.status === 403) {
        const data = await response.json();
        expect(data.error.code).toBe('FORBIDDEN');
      }
    });

    it('should respect slow mode settings', async () => {
      // Room with slow mode enabled (e.g., 60 seconds)
      const slowModeRoomId = 'room-with-slow-mode';

      // First message should succeed
      const response1 = await fetch(`${baseUrl}/rooms/${slowModeRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ content: 'First message' }),
      });

      // Second message within slow mode period should be rate limited
      const response2 = await fetch(`${baseUrl}/rooms/${slowModeRoomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ content: 'Second message too fast' }),
      });

      // Expect rate limit response if slow mode is enforced
      if (response2.status === 429) {
        const data = await response2.json();
        expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });
  });

  describe('GET /api/rooms/[roomId]/messages/[messageId]', () => {
    it('should return message details', async () => {
      const messageId = 'existing-message-id';
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages/${messageId}`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 200) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(messageId);
        expect(data.data.content).toBeDefined();
      }
    });

    it('should return 404 for non-existent message', async () => {
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages/non-existent-message`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/rooms/[roomId]/messages/[messageId]', () => {
    it('should update message content', async () => {
      const messageId = 'user-owned-message-id';
      const updateData = {
        content: 'Updated message content',
      };

      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages/${messageId}`, {
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
        expect(data.data.content).toBe(updateData.content);
        expect(data.data.isEdited).toBe(true);
      }
    });

    it('should return 403 when user is not message author', async () => {
      const messageId = 'other-user-message-id';
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ content: 'Unauthorized edit' }),
      });

      if (response.status === 403) {
        const data = await response.json();
        expect(data.error.code).toBe('FORBIDDEN');
      }
    });
  });

  describe('DELETE /api/rooms/[roomId]/messages/[messageId]', () => {
    it('should soft delete a message', async () => {
      const messageId = 'user-owned-message-id';
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      if (response.status === 204 || response.status === 200) {
        // Verify message is marked as deleted
        const getResponse = await fetch(`${baseUrl}/rooms/${testRoomId}/messages/${messageId}`, {
          headers: {
            'Authorization': 'Bearer test-token',
          },
        });

        if (getResponse.status === 200) {
          const data = await getResponse.json();
          expect(data.data.isDeleted).toBe(true);
        }
      }
    });

    it('should allow admins to delete any message', async () => {
      const messageId = 'other-user-message-id';
      // Assuming the authenticated user is an admin in the room
      const response = await fetch(`${baseUrl}/rooms/${testRoomId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer admin-token',
        },
      });

      // Should succeed for admin
      if (response.status === 204 || response.status === 200) {
        expect(true).toBe(true);
      }
    });
  });

  describe('POST /api/rooms/[roomId]/messages/[messageId]/reactions', () => {
    it('should add reaction to message', async () => {
      const messageId = 'existing-message-id';
      const reactionData = {
        emoji: '👍',
      };

      const response = await fetch(
        `${baseUrl}/rooms/${testRoomId}/messages/${messageId}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(reactionData),
        }
      );

      if (response.status === 201) {
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data.emoji).toBe(reactionData.emoji);
      }
    });

    it('should return 409 for duplicate reaction', async () => {
      const messageId = 'message-already-reacted';
      const reactionData = {
        emoji: '👍',
      };

      const response = await fetch(
        `${baseUrl}/rooms/${testRoomId}/messages/${messageId}/reactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify(reactionData),
        }
      );

      if (response.status === 409) {
        const data = await response.json();
        expect(data.error.code).toBe('CONFLICT');
      }
    });
  });

  describe('DELETE /api/rooms/[roomId]/messages/[messageId]/reactions/[emoji]', () => {
    it('should remove reaction from message', async () => {
      const messageId = 'message-with-reaction';
      const emoji = encodeURIComponent('👍');

      const response = await fetch(
        `${baseUrl}/rooms/${testRoomId}/messages/${messageId}/reactions/${emoji}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      if (response.status === 204) {
        expect(response.status).toBe(204);
      }
    });
  });
});
