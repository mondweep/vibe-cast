/**
 * ScrollArea Component
 *
 * Scrollable area with custom styled scrollbars.
 * Built on Radix UI ScrollArea primitive.
 */

'use client';

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    scrollHideDelay?: number;
    orientation?: 'vertical' | 'horizontal' | 'both';
  }
>(({ className, children, scrollHideDelay = 600, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    {(orientation === 'vertical' || orientation === 'both') && (
      <ScrollBar orientation="vertical" scrollHideDelay={scrollHideDelay} />
    )}
    {(orientation === 'horizontal' || orientation === 'both') && (
      <ScrollBar orientation="horizontal" scrollHideDelay={scrollHideDelay} />
    )}
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> & {
    scrollHideDelay?: number;
  }
>(({ className, orientation = 'vertical', scrollHideDelay = 600, ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent p-[1px]',
      orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent p-[1px]',
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

// Custom hook for scroll position tracking
export function useScrollPosition(ref: React.RefObject<HTMLElement | null>) {
  const [scrollPosition, setScrollPosition] = React.useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    isAtTop: true,
    isAtBottom: true,
    scrollPercentage: 0,
  });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const isAtTop = scrollTop === 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const scrollPercentage =
        scrollHeight > clientHeight
          ? (scrollTop / (scrollHeight - clientHeight)) * 100
          : 0;

      setScrollPosition({
        scrollTop,
        scrollHeight,
        clientHeight,
        isAtTop,
        isAtBottom,
        scrollPercentage,
      });
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial position

    return () => element.removeEventListener('scroll', handleScroll);
  }, [ref]);

  return scrollPosition;
}

// Scroll to bottom helper
export function useScrollToBottom(ref: React.RefObject<HTMLElement | null>) {
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);
  const lastScrollTop = React.useRef(0);

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const element = ref.current;
      if (element) {
        element.scrollTo({
          top: element.scrollHeight,
          behavior,
        });
      }
    },
    [ref]
  );

  const handleScroll = React.useCallback(() => {
    const element = ref.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    // User scrolled up, disable auto-scroll
    if (scrollTop < lastScrollTop.current && !isNearBottom) {
      setShouldAutoScroll(false);
    }

    // User scrolled to bottom, re-enable auto-scroll
    if (isNearBottom) {
      setShouldAutoScroll(true);
    }

    lastScrollTop.current = scrollTop;
  }, [ref]);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [ref, handleScroll]);

  return {
    scrollToBottom,
    shouldAutoScroll,
    setShouldAutoScroll,
  };
}

export { ScrollArea, ScrollBar };
