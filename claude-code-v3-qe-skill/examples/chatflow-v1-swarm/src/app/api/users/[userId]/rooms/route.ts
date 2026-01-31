/**
 * User Rooms API Routes
 *
 * GET /api/users/[userId]/rooms - Get rooms user is a member of
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { paginatedResponse, handleError } from '@/lib/api/response';
import { ForbiddenError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await requireAuth(request);
    const { userId } = await params;

    // Users can only view their own rooms
    if (currentUser.id !== userId) {
      throw new ForbiddenError('You can only view your own rooms');
    }

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.roomMember.count({
      where: {
        userId,
        leftAt: null,
        room: {
          archivedAt: null,
        },
      },
    });

    // Get rooms through membership
    const memberships = await prisma.roomMember.findMany({
      where: {
        userId,
        leftAt: null,
        room: {
          archivedAt: null,
        },
      },
      skip,
      take: limit,
      orderBy: {
        room: {
          lastMessageAt: 'desc',
        },
      },
      include: {
        room: {
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
              take: 5,
            },
            _count: {
              select: { members: true, messages: true },
            },
          },
        },
      },
    });

    const rooms = memberships.map((membership) => ({
      id: membership.room.id,
      name: membership.room.name,
      description: membership.room.description,
      type: membership.room.type,
      avatarUrl: membership.room.avatarUrl,
      isPrivate: membership.room.isPrivate,
      memberCount: membership.room._count.members,
      messageCount: membership.room._count.messages,
      lastMessageAt: membership.room.lastMessageAt?.toISOString(),
      createdAt: membership.room.createdAt.toISOString(),
      // User's membership info
      myRole: membership.role,
      myNickname: membership.nickname,
      lastReadAt: membership.lastReadAt.toISOString(),
      joinedAt: membership.joinedAt.toISOString(),
      notificationLevel: membership.notificationLevel,
      // Preview of members
      members: membership.room.members.map((m) => ({
        userId: m.userId,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      })),
    }));

    return paginatedResponse(rooms, page, limit, total);
  } catch (error) {
    return handleError(error);
  }
}
