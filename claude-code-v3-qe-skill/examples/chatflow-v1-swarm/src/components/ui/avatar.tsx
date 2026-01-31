/**
 * Avatar Component
 *
 * User avatar with fallback and presence indicator support.
 * Built on Radix UI Avatar primitive.
 */

'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  }
>(({ className, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Helper component for avatar with presence
interface AvatarWithPresenceProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'dnd' | 'offline';
  className?: string;
}

const AvatarWithPresence = React.forwardRef<HTMLSpanElement, AvatarWithPresenceProps>(
  ({ src, alt, fallback, size = 'md', status, className }, ref) => {
    const statusColors = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      dnd: 'bg-red-500',
      offline: 'bg-gray-400',
    };

    const statusSizes = {
      xs: 'h-1.5 w-1.5 ring-1',
      sm: 'h-2 w-2 ring-1',
      md: 'h-2.5 w-2.5 ring-2',
      lg: 'h-3 w-3 ring-2',
      xl: 'h-4 w-4 ring-2',
    };

    // Generate initials from fallback or alt
    const initials = React.useMemo(() => {
      const text = fallback ?? alt ?? '?';
      return text
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }, [fallback, alt]);

    return (
      <span ref={ref} className={cn('relative inline-block', className)}>
        <Avatar size={size}>
          {src && <AvatarImage src={src} alt={alt ?? ''} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 block rounded-full ring-background',
              statusColors[status],
              statusSizes[size]
            )}
            aria-hidden="true"
          />
        )}
      </span>
    );
  }
);
AvatarWithPresence.displayName = 'AvatarWithPresence';

// Avatar group for stacked avatars
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 4,
  size = 'md',
  className,
}) => {
  const childArray = React.Children.toArray(children);
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  const overlapClasses = {
    xs: '-space-x-1.5',
    sm: '-space-x-2',
    md: '-space-x-2.5',
    lg: '-space-x-3',
    xl: '-space-x-4',
  };

  return (
    <div
      className={cn('flex items-center', overlapClasses[size], className)}
      role="group"
      aria-label={`Avatar group with ${childArray.length} members`}
    >
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-background rounded-full"
          style={{ zIndex: visibleChildren.length - index }}
        >
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <Avatar size={size} className="ring-2 ring-background">
          <AvatarFallback className="text-xs bg-muted">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export { Avatar, AvatarImage, AvatarFallback, AvatarWithPresence, AvatarGroup };
