/**
 * RoomHeader Component
 *
 * Header for the chat room showing room name, members, and status.
 * Includes connection indicator and action buttons.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';

interface Room {
  id: string;
  name: string;
  description?: string;
  type: 'direct' | 'group' | 'channel';
  avatarUrl?: string;
}

interface RoomHeaderProps {
  room: Room;
  memberCount: number;
  isConnected: boolean;
  isReconnecting?: boolean;
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
  onRoomInfo?: () => void;
  onSearch?: () => void;
  onVideoCall?: () => void;
  onVoiceCall?: () => void;
  className?: string;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  room,
  memberCount,
  isConnected,
  isReconnecting = false,
  onToggleSidebar,
  showSidebarToggle = false,
  onRoomInfo,
  onSearch,
  onVideoCall,
  onVoiceCall,
  className,
}) => {
  return (
    <header
      data-testid="room-header"
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b bg-background',
        className
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Toggle */}
        {showSidebarToggle && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
        )}

        {/* Room Avatar */}
        <Avatar size="md" className="flex-shrink-0">
          {room.avatarUrl && <AvatarImage src={room.avatarUrl} alt={room.name} />}
          <AvatarFallback>
            {room.type === 'direct' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            ) : room.type === 'channel' ? (
              <span>#</span>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            )}
          </AvatarFallback>
        </Avatar>

        {/* Room Info */}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate">{room.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {/* Connection Status Dot */}
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected
                  ? 'bg-green-500'
                  : isReconnecting
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-gray-400'
              )}
              aria-hidden="true"
            />

            {/* Member Count */}
            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>

            {/* Room Type */}
            {room.type === 'channel' && (
              <>
                <span className="text-muted-foreground/50">-</span>
                <span>Channel</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        {onSearch && (
          <SimpleTooltip content="Search messages">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSearch}
              aria-label="Search messages"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </Button>
          </SimpleTooltip>
        )}

        {/* Voice Call */}
        {onVoiceCall && (
          <SimpleTooltip content="Start voice call">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onVoiceCall}
              aria-label="Start voice call"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </Button>
          </SimpleTooltip>
        )}

        {/* Video Call */}
        {onVideoCall && (
          <SimpleTooltip content="Start video call">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onVideoCall}
              aria-label="Start video call"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </Button>
          </SimpleTooltip>
        )}

        {/* Room Info */}
        {onRoomInfo && (
          <SimpleTooltip content="Room info">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRoomInfo}
              aria-label="View room info"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </Button>
          </SimpleTooltip>
        )}

        {/* More Options */}
        <SimpleTooltip content="More options">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="More options"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </Button>
        </SimpleTooltip>
      </div>
    </header>
  );
};

RoomHeader.displayName = 'RoomHeader';
