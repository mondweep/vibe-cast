/**
 * User Presence API Routes
 *
 * GET /api/users/[userId]/presence - Get user presence status
 * PATCH /api/users/[userId]/presence - Update user presence
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/api/response';
import { NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { UpdatePresenceSchema } from '@/lib/validations/user';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// In a real app, this would be stored in Redis for fast access
// For now, we'll simulate with a simple in-memory store
const presenceStore = new Map<string, {
  status: string;
  customStatus?: string | null;
  lastUpdated: Date;
}>();

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth(request);
    const { userId } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        lastSeenAt: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Get presence from store (or default to offline)
    const presence = presenceStore.get(userId);

    const response = {
      userId: user.id,
      status: presence?.status || 'offline',
      customStatus: presence?.customStatus || null,
      lastSeenAt: user.lastSeenAt.toISOString(),
      isActive: user.isActive,
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await requireAuth(request);
    const { userId } = await params;

    // Users can only update their own presence
    if (currentUser.id !== userId) {
      throw new ForbiddenError('You can only update your own presence');
    }

    const body = await request.json();
    const validatedData = UpdatePresenceSchema.parse(body);

    // Update presence in store
    presenceStore.set(userId, {
      status: validatedData.status,
      customStatus: validatedData.customStatus ?? null,
      lastUpdated: new Date(),
    });

    // Update lastSeenAt in database if going offline
    if (validatedData.status === 'offline') {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });
    }

    // Get updated user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        lastSeenAt: true,
        isActive: true,
      },
    });

    const response = {
      userId,
      status: validatedData.status,
      customStatus: validatedData.customStatus ?? null,
      lastSeenAt: user?.lastSeenAt.toISOString() || new Date().toISOString(),
      isActive: user?.isActive ?? true,
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}
