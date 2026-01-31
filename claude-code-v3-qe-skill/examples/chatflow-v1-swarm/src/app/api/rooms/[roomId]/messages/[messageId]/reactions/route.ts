/**
 * Message Reactions API Routes
 *
 * POST /api/rooms/[roomId]/messages/[messageId]/reactions - Add reaction
 * DELETE /api/rooms/[roomId]/messages/[messageId]/reactions - Remove reaction
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  createdResponse,
  noContentResponse,
  handleError,
} from '@/lib/api/response';
import { NotFoundError, ForbiddenError, ConflictError } from '@/lib/api/errors';
import { AddReactionSchema } from '@/lib/validations/message';

interface RouteParams {
  params: Promise<{ roomId: string; messageId: string }>;
}

async function getMessageWithMembership(roomId: string, messageId: string, userId: string) {
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
    },
  });

  if (!message || message.roomId !== roomId) {
    throw new NotFoundError('Message');
  }

  if (message.deletedAt) {
    throw new NotFoundError('Message');
  }

  const membership = message.room.members[0];

  return { message, membership };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId, messageId } = await params;

    const { message, membership } = await getMessageWithMembership(roomId, messageId, user.id);

    // Check if user is a member
    if (!membership && message.room.isPrivate) {
      throw new ForbiddenError('You must be a member to add reactions');
    }

    const body = await request.json();
    const validatedData = AddReactionSchema.parse(body);

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.id,
          emoji: validatedData.emoji,
        },
      },
    });

    if (existingReaction) {
      throw new ConflictError('You have already reacted with this emoji');
    }

    // Create reaction
    const reaction = await prisma.reaction.create({
      data: {
        emoji: validatedData.emoji,
        messageId,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const response = {
      id: reaction.id,
      emoji: reaction.emoji,
      messageId: reaction.messageId,
      userId: reaction.userId,
      user: reaction.user,
      createdAt: reaction.createdAt.toISOString(),
    };

    return createdResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId, messageId } = await params;

    // Get emoji from query params
    const { searchParams } = new URL(request.url);
    const emoji = searchParams.get('emoji');

    if (!emoji) {
      const { message, membership } = await getMessageWithMembership(roomId, messageId, user.id);

      // If no emoji specified, delete all reactions by this user on this message
      await prisma.reaction.deleteMany({
        where: {
          messageId,
          userId: user.id,
        },
      });

      return noContentResponse();
    }

    // Delete specific reaction
    const reaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.id,
          emoji: decodeURIComponent(emoji),
        },
      },
    });

    if (!reaction) {
      throw new NotFoundError('Reaction');
    }

    await prisma.reaction.delete({
      where: { id: reaction.id },
    });

    return noContentResponse();
  } catch (error) {
    return handleError(error);
  }
}
