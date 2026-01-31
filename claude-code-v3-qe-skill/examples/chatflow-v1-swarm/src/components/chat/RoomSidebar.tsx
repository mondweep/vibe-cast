/**
 * RoomSidebar Component
 *
 * Sidebar showing list of chat rooms with search and filtering.
 * Includes room creation and favorites.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleTooltip } from '@/components/ui/tooltip';

interface Room {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'channel';
  avatarUrl?: string;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: Date;
  };
  unreadCount?: number;
  isFavorite?: boolean;
  isMuted?: boolean;
}

interface RoomSidebarProps {
  rooms: Room[];
  selectedRoomId?: string;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom?: () => void;
  onToggleFavorite?: (roomId: string) => void;
  onToggleMute?: (roomId: string) => void;
  isCollapsed?: boolean;
  className?: string;
}

export const RoomSidebar: React.FC<RoomSidebarProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  onCreateRoom,
  onToggleFavorite,
  onToggleMute,
  isCollapsed = false,
  className,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'direct' | 'group' | 'channel'>('all');

  // Filter rooms based on search and type filter
  const filteredRooms = React.useMemo(() => {
    let result = rooms;

    // Apply type filter
    if (filter !== 'all') {
      result = result.filter((room) => room.type === filter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((room) =>
        room.name.toLowerCase().includes(query)
      );
    }

    // Sort: favorites first, then by last message time
    return result.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt).getTime() -
               new Date(a.lastMessage.createdAt).getTime();
      }
      return 0;
    });
  }, [rooms, searchQuery, filter]);

  // Separate favorites
  const favoriteRooms = filteredRooms.filter((r) => r.isFavorite);
  const otherRooms = filteredRooms.filter((r) => !r.isFavorite);

  // Format last message time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString();
  };

  if (isCollapsed) {
    return (
      <div className={cn('w-16 border-r bg-background flex flex-col', className)}>
        <div className="p-2">
          <SimpleTooltip content="Create new room" side="right">
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={onCreateRoom}
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </Button>
          </SimpleTooltip>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {filteredRooms.map((room) => (
              <SimpleTooltip key={room.id} content={room.name} side="right">
                <button
                  className={cn(
                    'relative p-2 rounded-lg transition-colors',
                    selectedRoomId === room.id
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  )}
                  onClick={() => onSelectRoom(room.id)}
                >
                  <Avatar size="sm">
                    {room.avatarUrl && <AvatarImage src={room.avatarUrl} alt={room.name} />}
                    <AvatarFallback className="text-xs">
                      {room.type === 'channel' ? '#' : room.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {room.unreadCount && room.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                      {room.unreadCount > 9 ? '9+' : room.unreadCount}
                    </span>
                  )}
                </button>
              </SimpleTooltip>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className={cn('w-72 border-r bg-background flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          {onCreateRoom && (
            <SimpleTooltip content="Create new room">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onCreateRoom}
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </Button>
            </SimpleTooltip>
          )}
        </div>

        {/* Search */}
        <Input
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={
            <svg
              className="h-4 w-4 text-muted-foreground"
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
          }
        />

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3">
          {(['all', 'direct', 'group', 'channel'] as const).map((type) => (
            <button
              key={type}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors capitalize',
                filter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              onClick={() => setFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Room List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Favorites Section */}
          {favoriteRooms.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground font-medium uppercase">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Favorites
              </div>
              {favoriteRooms.map((room) => (
                <RoomItem
                  key={room.id}
                  room={room}
                  isSelected={selectedRoomId === room.id}
                  onSelect={() => onSelectRoom(room.id)}
                  onToggleFavorite={onToggleFavorite}
                  onToggleMute={onToggleMute}
                  formatTime={formatTime}
                />
              ))}
            </div>
          )}

          {/* Other Rooms */}
          {otherRooms.length > 0 && (
            <div>
              {favoriteRooms.length > 0 && (
                <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase">
                  All Messages
                </div>
              )}
              {otherRooms.map((room) => (
                <RoomItem
                  key={room.id}
                  room={room}
                  isSelected={selectedRoomId === room.id}
                  onSelect={() => onSelectRoom(room.id)}
                  onToggleFavorite={onToggleFavorite}
                  onToggleMute={onToggleMute}
                  formatTime={formatTime}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredRooms.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No rooms found</p>
              {searchQuery && (
                <button
                  className="text-primary text-sm mt-2 hover:underline"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Individual Room Item
interface RoomItemProps {
  room: Room;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite?: (roomId: string) => void;
  onToggleMute?: (roomId: string) => void;
  formatTime: (date: Date) => string;
}

const RoomItem: React.FC<RoomItemProps> = ({
  room,
  isSelected,
  onSelect,
  onToggleFavorite,
  onToggleMute,
  formatTime,
}) => {
  const [showActions, setShowActions] = React.useState(false);

  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left',
        isSelected ? 'bg-accent' : 'hover:bg-accent/50'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar size="md">
          {room.avatarUrl && <AvatarImage src={room.avatarUrl} alt={room.name} />}
          <AvatarFallback>
            {room.type === 'channel' ? '#' : room.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'font-medium truncate',
            room.unreadCount && room.unreadCount > 0 && 'text-foreground'
          )}>
            {room.name}
          </span>
          {room.lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(room.lastMessage.createdAt)}
            </span>
          )}
        </div>
        {room.lastMessage && (
          <p className={cn(
            'text-sm truncate',
            room.unreadCount && room.unreadCount > 0
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}>
            {room.lastMessage.senderName}: {room.lastMessage.content}
          </p>
        )}
      </div>

      {/* Badges & Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {showActions ? (
          <>
            {onToggleFavorite && (
              <button
                className="p-1 hover:bg-background rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(room.id);
                }}
              >
                <svg
                  className={cn(
                    'h-4 w-4',
                    room.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                  )}
                  viewBox="0 0 20 20"
                  fill={room.isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            )}
          </>
        ) : (
          <>
            {room.isMuted && (
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            )}
            {room.unreadCount && room.unreadCount > 0 && (
              <span className="h-5 min-w-[20px] px-1 rounded-full bg-primary text-[11px] text-primary-foreground flex items-center justify-center">
                {room.unreadCount > 99 ? '99+' : room.unreadCount}
              </span>
            )}
          </>
        )}
      </div>
    </button>
  );
};

RoomSidebar.displayName = 'RoomSidebar';
