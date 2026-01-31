/**
 * UserProfile Entity
 *
 * Contains user profile information separate from authentication.
 */

export interface UserProfile {
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  timezone: string;
}

export function createUserProfile(params: {
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  timezone?: string;
}): UserProfile {
  if (!params.displayName || params.displayName.trim().length === 0) {
    throw new Error('Display name cannot be empty');
  }

  if (params.displayName.length > 50) {
    throw new Error('Display name cannot exceed 50 characters');
  }

  if (params.bio && params.bio.length > 500) {
    throw new Error('Bio cannot exceed 500 characters');
  }

  return {
    displayName: params.displayName.trim(),
    avatarUrl: params.avatarUrl,
    bio: params.bio,
    timezone: params.timezone ?? 'UTC',
  };
}

export function validateTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
