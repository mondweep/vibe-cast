/**
 * UI Components
 *
 * Export all shared UI components for easy importing.
 */

export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

export { Input, Textarea } from './input';
export type { InputProps, TextareaProps } from './input';

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarWithPresence,
  AvatarGroup,
} from './avatar';

export {
  ScrollArea,
  ScrollBar,
  useScrollPosition,
  useScrollToBottom,
} from './scroll-area';

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipArrow,
  TooltipProvider,
  SimpleTooltip,
  ShortcutTooltip,
} from './tooltip';
