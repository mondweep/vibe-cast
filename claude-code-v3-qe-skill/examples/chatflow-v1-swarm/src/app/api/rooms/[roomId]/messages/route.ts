/**
 * Room Messages API Routes
 *
 * GET /api/rooms/[roomId]/messages - List messages (paginated)
 * POST /api/rooms/[roomId]/messages - Create a new message
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
  handleError,
} from '@/lib/api/response';
import { NotFoundError, ForbiddenError, RateLimitError } from '@/lib/api/errors';
import { CreateMessageSchema, MessageQuerySchema } from '@/lib/validations/message';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

async function getRoomWithMembership(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId, archivedAt: null },
    include: {
      members: {
        where: { userId, leftAt: null },
      },
    },
  });

  if (!room) {
    throw new NotFoundError('Room');
  }

  const membership = room.members[0];
  return { room, membership };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId } = await params;

    const { room, membership } = await getRoomWithMembership(roomId, user.id);

    // Check if user is a member or room is public
    if (!membership && room.isPrivate) {
      throw new ForbiddenError('You are not a member of this room');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = MessageQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      before: searchParams.get('before') || undefined,
      after: searchParams.get('after') || undefined,
      threadId: searchParams.get('threadId') || undefined,
    });

    const { page, limit, before, after, threadId } = query;
    const skip = (page - 1) * limit;

    // Build where clause using Prisma's type-safe approach
    type WhereClause = {
      roomId: string;
      deletedAt: null;
      createdAt?: { lt?: Date; gt?: Date };
      threadId?: string | null;
    };

    const where: WhereClause = {
      roomId,
      deletedAt: null,
    };

    if (before || after) {
      where.createdAt = {};
      if (before) {
        where.createdAt.lt = new Date(before);
      }
      if (after) {
        where.createdAt.gt = new Date(after);
      }
    }

    if (threadId) {
      where.threadId = threadId;
    } else {
      // Only show top-level messages (not thread replies)
      where.threadId = null;
    }

    // Get total count
    const total = await prisma.message.count({ where });

    // Get messages
    const messages = await prisma.message.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            sender: {
              select: {
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    const transformedMessages = messages.map((message) => ({
      id: message.id,
      content: message.content,
      type: message.type,
      metadata: message.metadata,
      roomId: message.roomId,
      senderId: message.senderId,
      sender: message.sender,
      threadId: message.threadId,
      replyToId: message.replyToId,
      replyTo: message.replyTo,
      replyCount: message._count.replies,
      reactions: groupReactions(message.reactions),
      isEdited: message.editedAt !== null,
      isDeleted: message.deletedAt !== null,
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt?.toISOString(),
    }));

    return paginatedResponse(transformedMessages.reverse(), page, limit, total);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId } = await params;

    const { room, membership } = await getRoomWithMembership(roomId, user.id);

    // Check if user is a member
    if (!membership) {
      throw new ForbiddenError('You must be a member to send messages');
    }

    // Check if user is muted
    if (membership.mutedUntil && membership.mutedUntil > new Date()) {
      throw new ForbiddenError('You are muted in this room');
    }

    // Check slow mode
    if (room.slowModeSeconds > 0) {
      const lastMessage = await prisma.message.findFirst({
        where: {
          roomId,
          senderId: user.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (lastMessage) {
        const timeSinceLastMessage = Date.now() - lastMessage.createdAt.getTime();
        const slowModeMs = room.slowModeSeconds * 1000;

        if (timeSinceLastMessage < slowModeMs) {
          const waitTime = Math.ceil((slowModeMs - timeSinceLastMessage) / 1000);
          throw new RateLimitError(`Slow mode enabled. Please wait ${waitTime} seconds`);
        }
      }
    }

    const body = await request.json();
    const validatedData = CreateMessageSchema.parse(body);

    // If replying to a message, verify it exists in this room
    if (validatedData.replyToId) {
      const replyToMessage = await prisma.message.findUnique({
        where: { id: validatedData.replyToId },
      });
      if (!replyToMessage || replyToMessage.roomId !== roomId) {
        throw new NotFoundError('Reply-to message');
      }
    }

    // If adding to thread, verify thread exists in this room
    if (validatedData.threadId) {
      const threadParent = await prisma.message.findUnique({
        where: { id: validatedData.threadId },
      });
      if (!threadParent || threadParent.roomId !== roomId) {
        throw new NotFoundError('Thread parent message');
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: validatedData.content,
        type: validatedData.type ?? 'TEXT',
        roomId,
        senderId: user.id,
        threadId: validatedData.threadId ?? null,
        replyToId: validatedData.replyToId ?? null,
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update room's last message timestamp
    await prisma.room.update({
      where: { id: roomId },
      data: {
        lastMessageAt: message.createdAt,
        messageCount: { increment: 1 },
      },
    });

    // If thread reply, increment parent's reply count
    if (validatedData.threadId) {
      await prisma.message.update({
        where: { id: validatedData.threadId },
        data: { replyCount: { increment: 1 } },
      });
    }

    // Update member's last read
    await prisma.roomMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    });

    const responseData = {
      id: message.id,
      content: message.content,
      type: message.type,
      metadata: message.metadata,
      roomId: message.roomId,
      senderId: message.senderId,
      sender: {
        id: message.sender.id,
        displayName: message.sender.displayName,
        avatarUrl: message.sender.avatarUrl,
      },
      threadId: message.threadId,
      replyToId: message.replyToId,
      replyCount: 0,
      reactions: [] as Array<{ emoji: string; count: number; users: Array<{ id: string; displayName: string }> }>,
      isEdited: false,
      isDeleted: false,
      createdAt: message.createdAt.toISOString(),
    };

    return createdResponse(responseData);
  } catch (error) {
    return handleError(error);
  }
}

// Helper to group reactions by emoji
function groupReactions(reactions: Array<{
  emoji: string;
  userId: string;
  user: { id: string; displayName: string };
}>) {
  const grouped = new Map<string, { emoji: string; count: number; users: Array<{ id: string; displayName: string }> }>();

  for (const reaction of reactions) {
    const existing = grouped.get(reaction.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(reaction.user);
    } else {
      grouped.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        users: [reaction.user],
      });
    }
  }

  return Array.from(grouped.values());
}
