/**
 * Room Members API Routes
 *
 * GET /api/rooms/[roomId]/members - List room members
 * POST /api/rooms/[roomId]/members - Add member to room
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
import { NotFoundError, ForbiddenError, ConflictError } from '@/lib/api/errors';
import { AddMemberSchema } from '@/lib/validations/room';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

async function getRoomWithMembership(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        where: { leftAt: null },
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

    // Check if user is a member
    if (!membership && room.isPrivate) {
      throw new ForbiddenError('You are not a member of this room');
    }

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.roomMember.count({
      where: { roomId, leftAt: null },
    });

    // Get members with user details
    const members = await prisma.roomMember.findMany({
      where: { roomId, leftAt: null },
      skip,
      take: limit,
      orderBy: [
        { role: 'asc' }, // Owners first
        { joinedAt: 'asc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            lastSeenAt: true,
          },
        },
      },
    });

    const transformedMembers = members.map((member) => ({
      id: member.id,
      userId: member.userId,
      displayName: member.user.displayName,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      role: member.role,
      nickname: member.nickname,
      notificationLevel: member.notificationLevel,
      lastReadAt: member.lastReadAt.toISOString(),
      lastSeenAt: member.user.lastSeenAt.toISOString(),
      joinedAt: member.joinedAt.toISOString(),
    }));

    return paginatedResponse(transformedMembers, page, limit, total);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { roomId } = await params;

    const { room, membership } = await getRoomWithMembership(roomId, user.id);

    // Check if invites are allowed
    if (!room.allowInvites) {
      throw new ForbiddenError('Invites are disabled for this room');
    }

    // Check if user can invite (must be moderator or higher)
    if (!membership || !['OWNER', 'ADMIN', 'MODERATOR'].includes(membership.role)) {
      throw new ForbiddenError('You do not have permission to add members');
    }

    const body = await request.json();
    const validatedData = AddMemberSchema.parse(body);

    // Check if user is already a member
    const existingMember = room.members.find((m) => m.userId === validatedData.userId);
    if (existingMember) {
      throw new ConflictError('User is already a member of this room');
    }

    // Check if user to add exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });
    if (!userToAdd) {
      throw new NotFoundError('User');
    }

    // Cannot add higher role than own role
    const roleOrder = ['MEMBER', 'MODERATOR', 'ADMIN', 'OWNER'];
    const adderRoleIndex = roleOrder.indexOf(membership.role);
    const newMemberRoleIndex = roleOrder.indexOf(validatedData.role);
    if (newMemberRoleIndex >= adderRoleIndex) {
      throw new ForbiddenError('Cannot assign a role equal to or higher than your own');
    }

    // Add member - use null instead of undefined for optional fields
    const createData: {
      roomId: string;
      userId: string;
      role: typeof validatedData.role;
      nickname?: string | null;
    } = {
      roomId,
      userId: validatedData.userId,
      role: validatedData.role,
    };

    if (validatedData.nickname !== undefined) {
      createData.nickname = validatedData.nickname;
    }

    const newMember = await prisma.roomMember.create({
      data: createData,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
    });

    const response = {
      id: newMember.id,
      userId: newMember.userId,
      displayName: newMember.user.displayName,
      email: newMember.user.email,
      avatarUrl: newMember.user.avatarUrl,
      role: newMember.role,
      nickname: newMember.nickname,
      joinedAt: newMember.joinedAt.toISOString(),
    };

    return createdResponse(response);
  } catch (error) {
    return handleError(error);
  }
}
