'use client';

/**
 * UserAvatar Component
 *
 * Displays the user's avatar or initials fallback.
 */

import { useSession } from 'next-auth/react';

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserAvatar() {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || !session?.user) {
    return null;
  }

  const { name, image } = session.user;

  if (image) {
    return (
      <img
        src={image}
        alt={name || 'User avatar'}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
      aria-label={name || 'User avatar'}
    >
      {getInitials(name)}
    </div>
  );
}
