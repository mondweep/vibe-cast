/**
 * User Profile API Routes
 *
 * GET /api/users/[userId] - Get user profile
 * PATCH /api/users/[userId] - Update user profile
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/api/response';
import { NotFoundError, ForbiddenError } from '@/lib/api/errors';
import { UpdateUserProfileSchema } from '@/lib/validations/user';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const currentUser = await requireAuth(request);
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        timezone: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // For non-self requests, hide sensitive data
    const isSelf = currentUser.id === userId;
    const response = {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isActive: user.isActive,
      lastSeenAt: user.lastSeenAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
      // Only expose these fields to the user themselves
      ...(isSelf && {
        email: user.email,
        timezone: user.timezone,
      }),
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

    // Users can only update their own profile
    if (currentUser.id !== userId) {
      throw new ForbiddenError('You can only update your own profile');
    }

    const body = await request.json();
    const validatedData = UpdateUserProfileSchema.parse(body);

    // Build update data with proper typing
    type UserUpdateData = {
      displayName?: string;
      avatarUrl?: string | null;
      bio?: string | null;
      timezone?: string;
    };

    const updateData: UserUpdateData = {};
    if (validatedData['displayName'] !== undefined) {
      updateData.displayName = validatedData['displayName'];
    }
    if (validatedData['avatarUrl'] !== undefined) {
      updateData.avatarUrl = validatedData['avatarUrl'];
    }
    if (validatedData['bio'] !== undefined) {
      updateData.bio = validatedData['bio'];
    }
    if (validatedData['timezone'] !== undefined) {
      updateData.timezone = validatedData['timezone'];
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        timezone: true,
        isActive: true,
        lastSeenAt: true,
        updatedAt: true,
      },
    });

    const response = {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
      bio: updatedUser.bio,
      timezone: updatedUser.timezone,
      isActive: updatedUser.isActive,
      lastSeenAt: updatedUser.lastSeenAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}
