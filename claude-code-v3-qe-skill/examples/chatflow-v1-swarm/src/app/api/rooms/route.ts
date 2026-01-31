/**
 * Room API Routes
 *
 * GET /api/rooms - List rooms for authenticated user
 * POST /api/rooms - Create a new room
 */

import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  createdResponse,
  paginatedResponse,
  handleError,
} from '@/lib/api/response';
import { CreateRoomSchema, RoomQuerySchema } from '@/lib/validations/room';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = RoomQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
    });

    const { page, limit, type, search } = query;
    const skip = (page - 1) * limit;

    // Build where clause with Prisma types
    const where: Prisma.RoomWhereInput = {
      members: {
        some: {
          userId: user.id,
          leftAt: null,
        },
      },
      archivedAt: null,
    };

    if (type) {
      where.type = type;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Get total count
    const total = await prisma.room.count({ where });

    // Get rooms with members
    const rooms = await prisma.room.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastMessageAt: 'desc' },
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
          select: { members: true },
        },
      },
    });

    // Transform rooms for response
    const transformedRooms = rooms.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      type: room.type,
      avatarUrl: room.avatarUrl,
      isPrivate: room.isPrivate,
      memberCount: room['_count'].members,
      lastMessageAt: room.lastMessageAt?.toISOString(),
      messageCount: room.messageCount,
      createdAt: room.createdAt.toISOString(),
      members: room.members.map((m: { userId: string; role: string; user: { displayName: string; avatarUrl: string | null } }) => ({
        userId: m.userId,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      })),
    }));

    return paginatedResponse(transformedRooms, page, limit, total);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const validatedData = CreateRoomSchema.parse(body);

    // Create room with creator as owner
    const roomData = {
      name: validatedData.name,
      description: validatedData.description ?? null,
      type: validatedData.type ?? 'GROUP',
      avatarUrl: validatedData.avatarUrl ?? null,
      isPrivate: validatedData.settings?.isPrivate ?? false,
      allowInvites: validatedData.settings?.allowInvites ?? true,
      slowModeSeconds: validatedData.settings?.slowModeSeconds ?? 0,
      messageRetentionDays: validatedData.settings?.messageRetentionDays ?? null,
      createdById: user.id,
      members: {
        create: [
          {
            userId: user.id,
            role: 'OWNER' as const,
          },
          // Add any additional members specified
          ...(validatedData.memberIds?.map((memberId) => ({
            userId: memberId,
            role: 'MEMBER' as const,
          })) ?? []),
        ],
      },
    };

    const room = await prisma.room.create({
      data: roomData,
      include: {
        members: {
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
      memberCount: room.members.length,
      members: room.members.map((m) => ({
        userId: m.userId,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      })),
      createdAt: room.createdAt.toISOString(),
    };

    return createdResponse(response);
  } catch (error) {
    return handleError(error);
  }
}
