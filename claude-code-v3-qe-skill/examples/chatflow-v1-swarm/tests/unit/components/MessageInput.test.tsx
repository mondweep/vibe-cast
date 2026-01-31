/**
 * MessageInput Component Tests
 *
 * Tests for the message input component with send button.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '@/components/chat/MessageInput';

describe('MessageInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onTyping: vi.fn(),
    onStopTyping: vi.fn(),
    disabled: false,
    placeholder: 'Type a message...',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the input container', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });

    it('should render the text input', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render the send button', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should show placeholder text', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('should render emoji picker button', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByTestId('emoji-picker-button')).toBeInTheDocument();
    });

    it('should render attachment button', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByTestId('attachment-button')).toBeInTheDocument();
    });
  });

  describe('Input Behavior', () => {
    it('should update value when typing', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'Hello, world!');

      expect(input.value).toBe('Hello, world!');
    });

    it('should call onTyping when user starts typing', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'H');

      expect(defaultProps.onTyping).toHaveBeenCalled();
    });

    it('should call onStopTyping after delay', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello');

      vi.advanceTimersByTime(2000);

      expect(defaultProps.onStopTyping).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should expand textarea for multiline messages', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox') as HTMLTextAreaElement;
      const longText = 'Line 1\nLine 2\nLine 3\nLine 4';
      await user.type(input, longText);

      // Should have expanded height
      expect(input.style.height).not.toBe('auto');
    });

    it('should limit maximum height', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxHeight={100} />);

      const input = screen.getByRole('textbox') as HTMLTextAreaElement;
      const veryLongText = Array(20).fill('Line').join('\n');
      await user.type(input, veryLongText);

      const height = parseInt(input.style.height);
      expect(height).toBeLessThanOrEqual(100);
    });
  });

  describe('Send Functionality', () => {
    it('should call onSend when Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello, world!');
      await user.keyboard('{Enter}');

      expect(defaultProps.onSend).toHaveBeenCalledWith('Hello, world!');
    });

    it('should call onSend when send button is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello, world!');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(defaultProps.onSend).toHaveBeenCalledWith('Hello, world!');
    });

    it('should clear input after sending', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'Hello, world!');
      await user.keyboard('{Enter}');

      expect(input.value).toBe('');
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.keyboard('{Enter}');

      expect(defaultProps.onSend).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '   ');
      await user.keyboard('{Enter}');

      expect(defaultProps.onSend).not.toHaveBeenCalled();
    });

    it('should allow Shift+Enter for newline', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox') as HTMLTextAreaElement;
      await user.type(input, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(input, 'Line 2');

      expect(input.value).toContain('\n');
      expect(defaultProps.onSend).not.toHaveBeenCalled();
    });

    it('should trim whitespace before sending', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '  Hello  ');
      await user.keyboard('{Enter}');

      expect(defaultProps.onSend).toHaveBeenCalledWith('Hello');
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<MessageInput {...defaultProps} disabled />);

      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should disable send button when disabled', () => {
      render(<MessageInput {...defaultProps} disabled />);

      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    it('should show disabled message', () => {
      render(<MessageInput {...defaultProps} disabled disabledMessage="Chat is closed" />);

      expect(screen.getByText('Chat is closed')).toBeInTheDocument();
    });

    it('should not call onSend when disabled', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} disabled />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello', { skipClick: true });
      await user.keyboard('{Enter}');

      expect(defaultProps.onSend).not.toHaveBeenCalled();
    });
  });

  describe('Emoji Picker', () => {
    it('should open emoji picker when button is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const emojiButton = screen.getByTestId('emoji-picker-button');
      await user.click(emojiButton);

      await waitFor(() => {
        expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
      });
    });

    it('should insert emoji at cursor position', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'Hello');

      const emojiButton = screen.getByTestId('emoji-picker-button');
      await user.click(emojiButton);

      const emoji = screen.getByText('😀');
      await user.click(emoji);

      expect(input.value).toBe('Hello😀');
    });

    it('should close emoji picker after selection', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const emojiButton = screen.getByTestId('emoji-picker-button');
      await user.click(emojiButton);

      const emoji = screen.getByText('😀');
      await user.click(emoji);

      await waitFor(() => {
        expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument();
      });
    });
  });

  describe('Attachments', () => {
    it('should open file picker when attachment button is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const attachButton = screen.getByTestId('attachment-button');

      const clickSpy = vi.spyOn(fileInput, 'click');
      await user.click(attachButton);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should show attachment preview after file selection', async () => {
      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input');
      const file = new File(['test'], 'test.png', { type: 'image/png' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-preview')).toBeInTheDocument();
      });
    });

    it('should remove attachment when X is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const fileInput = screen.getByTestId('file-input');
      const file = new File(['test'], 'test.png', { type: 'image/png' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('attachment-preview')).toBeInTheDocument();
      });

      const removeButton = screen.getByTestId('remove-attachment');
      await user.click(removeButton);

      expect(screen.queryByTestId('attachment-preview')).not.toBeInTheDocument();
    });
  });

  describe('Character Limit', () => {
    it('should show character count when approaching limit', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={100} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'A'.repeat(80));

      expect(screen.getByTestId('character-count')).toBeInTheDocument();
      expect(screen.getByText('80/100')).toBeInTheDocument();
    });

    it('should prevent typing beyond limit', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={10} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'Hello World!'); // 12 characters

      expect(input.value.length).toBeLessThanOrEqual(10);
    });

    it('should show warning style at limit', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={10} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'A'.repeat(10));

      const charCount = screen.getByTestId('character-count');
      expect(charCount).toHaveClass('text-warning');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA labels', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByRole('textbox')).toHaveAccessibleName(/message input/i);
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should announce character count to screen readers', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={100} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'A'.repeat(80));

      const charCount = screen.getByTestId('character-count');
      expect(charCount).toHaveAttribute('aria-live', 'polite');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      input.focus();

      await user.keyboard('{Tab}');
      expect(screen.getByTestId('emoji-picker-button')).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByTestId('attachment-button')).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /send/i })).toHaveFocus();
    });
  });

  describe('Reply Mode', () => {
    it('should show reply preview when replying to a message', () => {
      render(
        <MessageInput
          {...defaultProps}
          replyTo={{
            id: 'msg-123',
            content: 'Original message',
            senderName: 'John',
          }}
        />
      );

      expect(screen.getByTestId('reply-preview')).toBeInTheDocument();
      expect(screen.getByText(/replying to john/i)).toBeInTheDocument();
    });

    it('should cancel reply when X is clicked', async () => {
      const onCancelReply = vi.fn();
      const user = userEvent.setup();

      render(
        <MessageInput
          {...defaultProps}
          replyTo={{
            id: 'msg-123',
            content: 'Original message',
            senderName: 'John',
          }}
          onCancelReply={onCancelReply}
        />
      );

      const cancelButton = screen.getByTestId('cancel-reply');
      await user.click(cancelButton);

      expect(onCancelReply).toHaveBeenCalled();
    });
  });
});
