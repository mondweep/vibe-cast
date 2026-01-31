/**
 * Tooltip Component
 *
 * Accessible tooltip with arrow and animations.
 * Built on Radix UI Tooltip primitive.
 */

'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const TooltipArrow = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    className={cn('fill-popover', className)}
    {...props}
  />
));
TooltipArrow.displayName = TooltipPrimitive.Arrow.displayName;

// Simple tooltip wrapper for common use cases
interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  skipDelayDuration?: number;
  asChild?: boolean;
  className?: string;
}

const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  skipDelayDuration = 300,
  asChild = true,
  className,
}) => {
  return (
    <TooltipProvider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
      <Tooltip>
        <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Keyboard shortcut tooltip
interface ShortcutTooltipProps {
  label: string;
  shortcut: string[];
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

const ShortcutTooltip: React.FC<ShortcutTooltipProps> = ({
  label,
  shortcut,
  children,
  side = 'top',
}) => {
  return (
    <SimpleTooltip
      content={
        <div className="flex items-center gap-2">
          <span>{label}</span>
          <div className="flex items-center gap-0.5">
            {shortcut.map((key, index) => (
              <React.Fragment key={key}>
                <kbd className="rounded border bg-muted px-1 py-0.5 text-xs font-mono">
                  {key}
                </kbd>
                {index < shortcut.length - 1 && <span className="text-muted-foreground">+</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      }
      side={side}
    >
      {children}
    </SimpleTooltip>
  );
};

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
  TooltipProvider,
  SimpleTooltip,
  ShortcutTooltip,
};
