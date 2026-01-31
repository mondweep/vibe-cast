/**
 * MessageInput Component
 *
 * Message input with emoji picker, attachments, and send button.
 * Supports multiline input, character limits, and reply previews.
 */

'use client';

import * as React from 'react';
import { cn, debounce } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { SimpleTooltip } from '@/components/ui/tooltip';

interface ReplyTo {
  id: string;
  content: string;
  senderName: string;
}

interface MessageInputProps {
  onSend: (content: string, attachments?: File[]) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  placeholder?: string;
  maxLength?: number;
  maxHeight?: number;
  replyTo?: ReplyTo;
  onCancelReply?: () => void;
  className?: string;
}

export const MessageInput = React.forwardRef<HTMLTextAreaElement, MessageInputProps>(
  (
    {
      onSend,
      onTyping,
      onStopTyping,
      disabled = false,
      disabledMessage,
      placeholder = 'Type a message...',
      maxLength = 2000,
      maxHeight = 200,
      replyTo,
      onCancelReply,
      className,
    },
    ref
  ) => {
    const [value, setValue] = React.useState('');
    const [attachments, setAttachments] = React.useState<File[]>([]);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const stopTypingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced stop typing
    const debouncedStopTyping = React.useMemo(
      () => debounce(() => onStopTyping?.(), 2000),
      [onStopTyping]
    );

    // Handle input change
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;

        // Enforce max length
        if (maxLength && newValue.length > maxLength) {
          return;
        }

        setValue(newValue);

        // Trigger typing indicator
        if (newValue.length > 0) {
          onTyping?.();

          // Clear existing timeout
          if (stopTypingTimeoutRef.current) {
            clearTimeout(stopTypingTimeoutRef.current);
          }

          // Set new timeout for stop typing
          stopTypingTimeoutRef.current = setTimeout(() => {
            onStopTyping?.();
          }, 2000);
        }
      },
      [maxLength, onTyping, onStopTyping]
    );

    // Handle key press
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      },
      [value, attachments]
    );

    // Handle send
    const handleSend = React.useCallback(() => {
      const trimmedValue = value.trim();

      if (!trimmedValue && attachments.length === 0) {
        return;
      }

      if (disabled) {
        return;
      }

      onSend(trimmedValue, attachments.length > 0 ? attachments : undefined);
      setValue('');
      setAttachments([]);

      // Clear typing timeout
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
    }, [value, attachments, disabled, onSend]);

    // Handle file selection
    const handleFileSelect = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        setAttachments((prev) => [...prev, ...files]);
        e.target.value = ''; // Reset input
      },
      []
    );

    // Remove attachment
    const handleRemoveAttachment = React.useCallback((index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Handle emoji selection
    const handleEmojiSelect = React.useCallback(
      (emoji: string) => {
        setValue((prev) => prev + emoji);
        setIsEmojiPickerOpen(false);
      },
      []
    );

    // Show character count near limit
    const showCharCount = maxLength && value.length > maxLength * 0.8;
    const isAtLimit = maxLength && value.length >= maxLength;

    return (
      <div
        data-testid="message-input"
        className={cn('flex flex-col gap-2 p-4', className)}
      >
        {/* Reply Preview */}
        {replyTo && (
          <div
            data-testid="reply-preview"
            className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md text-sm"
          >
            <div className="flex-1 min-w-0">
              <span className="text-muted-foreground">Replying to </span>
              <span className="font-medium">{replyTo.senderName}</span>
              <p className="truncate text-muted-foreground">{replyTo.content}</p>
            </div>
            <button
              data-testid="cancel-reply"
              className="p-1 hover:bg-background rounded-full transition-colors"
              onClick={onCancelReply}
              aria-label="Cancel reply"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div
            data-testid="attachment-preview"
            className="flex flex-wrap gap-2"
          >
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  <svg
                    className="h-6 w-6 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button
                  data-testid="remove-attachment"
                  className="absolute -top-1 -right-1 p-0.5 bg-background border rounded-full shadow"
                  onClick={() => handleRemoveAttachment(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Disabled Message */}
        {disabled && disabledMessage && (
          <p className="text-sm text-muted-foreground text-center">
            {disabledMessage}
          </p>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2">
          {/* Emoji Picker Button */}
          <SimpleTooltip content="Emoji">
            <Button
              data-testid="emoji-picker-button"
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              aria-label="Open emoji picker"
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
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </Button>
          </SimpleTooltip>

          {/* Attachment Button */}
          <SimpleTooltip content="Attach file">
            <Button
              data-testid="attachment-button"
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
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
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </Button>
          </SimpleTooltip>

          {/* Hidden File Input */}
          <input
            data-testid="file-input"
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <Textarea
              ref={ref}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              autoResize
              maxHeight={maxHeight}
              className="min-h-[40px] max-h-[200px] py-2 pr-12 resize-none"
              aria-label="Message input"
            />

            {/* Character Count */}
            {showCharCount && (
              <span
                data-testid="character-count"
                className={cn(
                  'absolute bottom-2 right-2 text-xs',
                  isAtLimit ? 'text-warning text-destructive' : 'text-muted-foreground'
                )}
                aria-live="polite"
              >
                {value.length}/{maxLength}
              </span>
            )}
          </div>

          {/* Send Button */}
          <SimpleTooltip content="Send message">
            <Button
              type="button"
              size="icon"
              disabled={disabled || (!value.trim() && attachments.length === 0)}
              onClick={handleSend}
              aria-label="Send message"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </Button>
          </SimpleTooltip>
        </div>

        {/* Emoji Picker */}
        {isEmojiPickerOpen && (
          <div data-testid="emoji-picker" className="absolute bottom-full left-4 mb-2">
            <div className="bg-popover border rounded-lg shadow-lg p-3">
              <div className="grid grid-cols-8 gap-1">
                {[
                  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
                  '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
                  '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝',
                  '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
                  '👍', '👎', '👏', '🙌', '🤝', '🙏', '❤️', '🔥',
                ].map((emoji) => (
                  <button
                    key={emoji}
                    className="text-xl p-1 hover:bg-muted rounded transition-colors"
                    onClick={() => handleEmojiSelect(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

MessageInput.displayName = 'MessageInput';
