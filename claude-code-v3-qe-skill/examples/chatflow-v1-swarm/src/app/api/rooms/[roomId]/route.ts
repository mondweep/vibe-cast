/**
 * Single Room API Routes
 *
 * GET /api/rooms/[roomId] - Get room details
 * PATCH /api/rooms/[roomId] - Update room
 * DELETE /api/rooms/[roomId] - Delete room
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
import { UpdateRoomSchema } from '@/lib/validations/room';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

async function getRoomWithMembership(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        where: { leftAt: null },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
      _count: {
        select: { members: true, messages: true },
      },
    },
  });

  if (!room) {
    throw new NotFoundError('Room');
  }

  const membership = room.members.find((m) => m.userId === userId);
  return { room, membership };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId } = await params;

    const { room, membership } = await getRoomWithMembership(roomId, user.id);

    // Check if user is a member or if room is public
    if (!membership && room.isPrivate) {
      throw new ForbiddenError('You are not a member of this room');
    }

    const response = {
      id: room.id,
      name: room.name,
      description: room.description,
      type: room.type,
      avatarUrl: room.avatarUrl,
      settings: {
        isPrivate: room.isPrivate,
        allowInvites: room.allowInvites,
        slowModeSeconds: room.slowModeSeconds,
        messageRetentionDays: room.messageRetentionDays,
      },
      createdById: room.createdById,
      memberCount: room._count.members,
      messageCount: room._count.messages,
      lastMessageAt: room.lastMessageAt?.toISOString(),
      members: room.members.map((m) => ({
        userId: m.userId,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
      currentUserRole: membership?.role,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId } = await params;

    const { room, membership } = await getRoomWithMembership(roomId, user.id);

    // Check if user can update room (must be admin or owner)
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenError('You do not have permission to update this room');
    }

    const body = await request.json();
    const validatedData = UpdateRoomSchema.parse(body);

    // Build update data with proper typing
    type RoomUpdateData = {
      name?: string;
      description?: string | null;
      avatarUrl?: string | null;
      isPrivate?: boolean;
      allowInvites?: boolean;
      slowModeSeconds?: number;
      messageRetentionDays?: number | null;
    };

    const updateData: RoomUpdateData = {};
    if (validatedData['name'] !== undefined) updateData.name = validatedData['name'];
    if (validatedData['description'] !== undefined) updateData.description = validatedData['description'];
    if (validatedData['avatarUrl'] !== undefined) updateData.avatarUrl = validatedData['avatarUrl'];
    if (validatedData['settings']) {
      if (validatedData['settings']['isPrivate'] !== undefined) {
        updateData.isPrivate = validatedData['settings']['isPrivate'];
      }
      if (validatedData['settings']['allowInvites'] !== undefined) {
        updateData.allowInvites = validatedData['settings']['allowInvites'];
      }
      if (validatedData['settings']['slowModeSeconds'] !== undefined) {
        updateData.slowModeSeconds = validatedData['settings']['slowModeSeconds'];
      }
      if (validatedData['settings']['messageRetentionDays'] !== undefined) {
        updateData.messageRetentionDays = validatedData['settings']['messageRetentionDays'];
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const response = {
      id: updatedRoom.id,
      name: updatedRoom.name,
      description: updatedRoom.description,
      type: updatedRoom.type,
      avatarUrl: updatedRoom.avatarUrl,
      settings: {
        isPrivate: updatedRoom.isPrivate,
        allowInvites: updatedRoom.allowInvites,
        slowModeSeconds: updatedRoom.slowModeSeconds,
        messageRetentionDays: updatedRoom.messageRetentionDays,
      },
      createdById: updatedRoom.createdById,
      memberCount: updatedRoom.members.length,
      updatedAt: updatedRoom.updatedAt.toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId } = await params;

    const { room, membership } = await getRoomWithMembership(roomId, user.id);

    // Only owner can delete room
    if (!membership || membership.role !== 'OWNER') {
      throw new ForbiddenError('Only the room owner can delete this room');
    }

    // Soft delete by archiving
    await prisma.room.update({
      where: { id: roomId },
      data: { archivedAt: new Date() },
    });

    return noContentResponse();
  } catch (error) {
    return handleError(error);
  }
}
