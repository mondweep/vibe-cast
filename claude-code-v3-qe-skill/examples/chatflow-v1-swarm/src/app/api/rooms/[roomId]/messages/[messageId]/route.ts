/**
 * Single Message API Routes
 *
 * GET /api/rooms/[roomId]/messages/[messageId] - Get message details
 * PATCH /api/rooms/[roomId]/messages/[messageId] - Update message
 * DELETE /api/rooms/[roomId]/messages/[messageId] - Delete message
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  successResponse,
  noContentResponse,
  handleError,
} from '@/lib/api/response';
import { NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { UpdateMessageSchema } from '@/lib/validations/message';

interface RouteParams {
  params: Promise<{ roomId: string; messageId: string }>;
}

async function getMessageWithPermissions(roomId: string, messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      room: {
        include: {
          members: {
            where: { userId, leftAt: null },
          },
        },
      },
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

  if (!message || message.roomId !== roomId) {
    throw new NotFoundError('Message');
  }

  const membership = message.room.members[0];

  return { message, membership };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId, messageId } = await params;

    const { message, membership } = await getMessageWithPermissions(roomId, messageId, user.id);

    // Check if user is a member or room is public
    if (!membership && message.room.isPrivate) {
      throw new ForbiddenError('You are not a member of this room');
    }

    const response = {
      id: message.id,
      content: message.deletedAt ? '[deleted]' : message.content,
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
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId, messageId } = await params;

    const { message, membership } = await getMessageWithPermissions(roomId, messageId, user.id);

    // Only the message author can edit
    if (message.senderId !== user.id) {
      throw new ForbiddenError('You can only edit your own messages');
    }

    // Cannot edit deleted messages
    if (message.deletedAt) {
      throw new ForbiddenError('Cannot edit deleted messages');
    }

    const body = await request.json();
    const validatedData = UpdateMessageSchema.parse(body);

    // Store edit history in metadata
    const currentMetadata = (message.metadata as Record<string, unknown>) ?? {};
    const existingHistory = currentMetadata['editHistory'] as Array<{ content: string; editedAt: string }> | undefined;
    const editHistory = existingHistory ? [...existingHistory] : [];
    editHistory.push({
      content: message.content,
      editedAt: new Date().toISOString(),
    });

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: validatedData.content,
        editedAt: new Date(),
        metadata: {
          ...currentMetadata,
          editHistory,
        },
      },
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
      },
    });

    const response = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      type: updatedMessage.type,
      metadata: updatedMessage.metadata,
      roomId: updatedMessage.roomId,
      senderId: updatedMessage.senderId,
      sender: updatedMessage.sender,
      threadId: updatedMessage.threadId,
      replyToId: updatedMessage.replyToId,
      replyCount: message._count.replies,
      reactions: groupReactions(updatedMessage.reactions),
      isEdited: true,
      isDeleted: false,
      createdAt: updatedMessage.createdAt.toISOString(),
      editedAt: updatedMessage.editedAt?.toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId, messageId } = await params;

    const { message, membership } = await getMessageWithPermissions(roomId, messageId, user.id);

    // Check if user can delete (author, or moderator/admin/owner)
    const canDelete =
      message.senderId === user.id ||
      (membership && ['OWNER', 'ADMIN', 'MODERATOR'].includes(membership.role));

    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete this message');
    }

    // Already deleted
    if (message.deletedAt) {
      return noContentResponse();
    }

    // Soft delete
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return noContentResponse();
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
