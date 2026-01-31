/**
 * UserPresence Component
 *
 * Displays a user's online/offline status with various styles and options.
 * Supports tooltips, last seen time, and custom status messages.
 */

'use client';

import * as React from 'react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { SimpleTooltip } from '@/components/ui/tooltip';

type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';
type PresenceSize = 'sm' | 'md' | 'lg';
type PresencePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface UserPresenceProps {
  status: PresenceStatus;
  userId: string;
  userName: string;
  lastSeen?: Date;
  customStatus?: string;
  showText?: boolean;
  showLastSeen?: boolean;
  showTooltip?: boolean;
  pulse?: boolean;
  size?: PresenceSize;
  position?: PresencePosition;
  className?: string;
}

const statusColors: Record<PresenceStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-400',
};

const statusLabels: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

const sizeClasses: Record<PresenceSize, string> = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const positionClasses: Record<PresencePosition, string> = {
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
};

export const UserPresence: React.FC<UserPresenceProps> = ({
  status,
  userId,
  userName,
  lastSeen,
  customStatus,
  showText = false,
  showLastSeen = false,
  showTooltip = false,
  pulse = false,
  size = 'md',
  position = 'bottom-right',
  className,
}) => {
  // Format last seen time
  const lastSeenText = React.useMemo(() => {
    if (!lastSeen) return null;
    return formatRelativeTime(lastSeen);
  }, [lastSeen]);

  // Build tooltip content
  const tooltipContent = React.useMemo(() => {
    const lines: string[] = [];
    lines.push(`${userName} - ${customStatus ?? statusLabels[status]}`);
    if (status === 'offline' && lastSeenText) {
      lines.push(`Last seen ${lastSeenText}`);
    }
    return lines.join('\n');
  }, [userName, status, customStatus, lastSeenText]);

  const content = (
    <div
      data-testid="user-presence"
      className={cn(
        'absolute inline-flex items-center gap-1.5',
        positionClasses[position],
        showTooltip && 'cursor-pointer',
        className
      )}
      role="status"
      aria-label={`${userName} is ${statusLabels[status].toLowerCase()}`}
      tabIndex={showTooltip ? 0 : undefined}
    >
      {/* Status Dot */}
      <span
        data-testid="presence-dot"
        className={cn(
          'rounded-full ring-2 ring-background',
          sizeClasses[size],
          statusColors[status],
          pulse && status !== 'offline' && 'animate-pulse'
        )}
      />

      {/* Status Text */}
      {showText && (
        <span className="text-xs text-muted-foreground">
          {customStatus ?? statusLabels[status]}
        </span>
      )}

      {/* Last Seen */}
      {showLastSeen && status === 'offline' && lastSeenText && (
        <span data-testid="last-seen" className="text-xs text-muted-foreground">
          Last seen {lastSeenText}
        </span>
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <SimpleTooltip content={tooltipContent}>
        {content}
      </SimpleTooltip>
    );
  }

  return content;
};

UserPresence.displayName = 'UserPresence';

// List of presence indicators for multiple users
interface UserPresenceListProps {
  users: Array<{
    id: string;
    name: string;
    status: PresenceStatus;
    avatar?: string;
    lastSeen?: Date;
  }>;
  showCount?: boolean;
  maxVisible?: number;
  className?: string;
}

export const UserPresenceList: React.FC<UserPresenceListProps> = ({
  users,
  showCount = true,
  maxVisible = 5,
  className,
}) => {
  const onlineUsers = users.filter((u) => u.status !== 'offline');
  const offlineUsers = users.filter((u) => u.status === 'offline');

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showCount && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {onlineUsers.length} online
          </span>
          <span>-</span>
          <span>{offlineUsers.length} offline</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {users.slice(0, maxVisible).map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 py-1"
          >
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <UserPresence
                status={user.status}
                userId={user.id}
                userName={user.name}
                size="sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {statusLabels[user.status]}
              </p>
            </div>
          </div>
        ))}

        {users.length > maxVisible && (
          <p className="text-xs text-muted-foreground pl-10">
            +{users.length - maxVisible} more
          </p>
        )}
      </div>
    </div>
  );
};

UserPresenceList.displayName = 'UserPresenceList';
