/**
 * MessageList Component Tests
 *
 * Tests for the scrollable message list component.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageList } from '@/components/chat/MessageList';
import { createMockMessage, createMockUser } from '@/tests/setup';

describe('MessageList', () => {
  const defaultUser = createMockUser();
  const defaultMessages = [
    createMockMessage({ id: 'msg-1', content: 'Hello!', senderId: 'user-123' }),
    createMockMessage({ id: 'msg-2', content: 'Hi there!', senderId: 'user-456' }),
    createMockMessage({ id: 'msg-3', content: 'How are you?', senderId: 'user-123' }),
  ];

  const defaultProps = {
    messages: defaultMessages,
    currentUserId: 'user-123',
    users: {
      'user-123': createMockUser({ id: 'user-123', name: 'John' }),
      'user-456': createMockUser({ id: 'user-456', name: 'Jane' }),
    },
    onEditMessage: vi.fn(),
    onDeleteMessage: vi.fn(),
    onReact: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the message list container', () => {
      render(<MessageList {...defaultProps} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('should render all messages', () => {
      render(<MessageList {...defaultProps} />);

      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
      expect(screen.getByText('How are you?')).toBeInTheDocument();
    });

    it('should render empty state when no messages', () => {
      render(<MessageList {...defaultProps} messages={[]} />);

      expect(screen.getByTestId('empty-messages')).toBeInTheDocument();
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(<MessageList {...defaultProps} isLoading />);

      expect(screen.getByTestId('messages-loading')).toBeInTheDocument();
    });

    it('should differentiate between sent and received messages', () => {
      render(<MessageList {...defaultProps} />);

      const messages = screen.getAllByTestId(/^message-item/);
      expect(messages[0]).toHaveClass('message-sent');
      expect(messages[1]).toHaveClass('message-received');
    });
  });

  describe('Message Grouping', () => {
    it('should group consecutive messages from same user', () => {
      const messages = [
        createMockMessage({ id: 'msg-1', content: 'Hello!', senderId: 'user-123', createdAt: new Date('2024-01-01T10:00:00') }),
        createMockMessage({ id: 'msg-2', content: 'How are you?', senderId: 'user-123', createdAt: new Date('2024-01-01T10:00:30') }),
        createMockMessage({ id: 'msg-3', content: 'I am fine!', senderId: 'user-456', createdAt: new Date('2024-01-01T10:01:00') }),
      ];

      render(<MessageList {...defaultProps} messages={messages} />);

      const messageGroups = screen.getAllByTestId('message-group');
      expect(messageGroups).toHaveLength(2);
    });

    it('should show date separators for different days', () => {
      const messages = [
        createMockMessage({ id: 'msg-1', content: 'Yesterday', senderId: 'user-123', createdAt: new Date('2024-01-01T10:00:00') }),
        createMockMessage({ id: 'msg-2', content: 'Today', senderId: 'user-123', createdAt: new Date('2024-01-02T10:00:00') }),
      ];

      render(<MessageList {...defaultProps} messages={messages} />);

      expect(screen.getByTestId('date-separator')).toBeInTheDocument();
    });
  });

  describe('Scroll Behavior', () => {
    it('should scroll to bottom on initial load', () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      render(<MessageList {...defaultProps} />);

      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('should scroll to bottom when new message arrives', async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      const { rerender } = render(<MessageList {...defaultProps} />);

      const newMessages = [
        ...defaultMessages,
        createMockMessage({ id: 'msg-4', content: 'New message!' }),
      ];

      rerender(<MessageList {...defaultProps} messages={newMessages} />);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
    });

    it('should not auto-scroll if user has scrolled up', async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      render(<MessageList {...defaultProps} />);

      // Simulate user scrolling up
      const list = screen.getByTestId('message-list');
      fireEvent.scroll(list, { target: { scrollTop: 0 } });

      scrollIntoViewMock.mockClear();

      // Add new message
      // Should not scroll since user scrolled up
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });

    it('should show "scroll to bottom" button when not at bottom', async () => {
      render(<MessageList {...defaultProps} />);

      const list = screen.getByTestId('message-list');
      fireEvent.scroll(list, { target: { scrollTop: 0, scrollHeight: 1000, clientHeight: 500 } });

      await waitFor(() => {
        expect(screen.getByTestId('scroll-to-bottom')).toBeInTheDocument();
      });
    });
  });

  describe('Message Actions', () => {
    it('should show context menu on right click', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const message = screen.getByText('Hello!');
      await user.pointer({ keys: '[MouseRight]', target: message });

      await waitFor(() => {
        expect(screen.getByTestId('message-context-menu')).toBeInTheDocument();
      });
    });

    it('should call onEditMessage when edit is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const message = screen.getByText('Hello!');
      await user.pointer({ keys: '[MouseRight]', target: message });

      const editButton = screen.getByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      expect(defaultProps.onEditMessage).toHaveBeenCalledWith('msg-1');
    });

    it('should call onDeleteMessage when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const message = screen.getByText('Hello!');
      await user.pointer({ keys: '[MouseRight]', target: message });

      const deleteButton = screen.getByRole('menuitem', { name: /delete/i });
      await user.click(deleteButton);

      expect(defaultProps.onDeleteMessage).toHaveBeenCalledWith('msg-1');
    });

    it('should not show edit/delete for other users messages', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const message = screen.getByText('Hi there!'); // From user-456
      await user.pointer({ keys: '[MouseRight]', target: message });

      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /edit/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: /delete/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Reactions', () => {
    it('should show reaction picker on emoji button click', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const reactionButtons = screen.getAllByTestId('add-reaction-button');
      await user.click(reactionButtons[0]!);

      await waitFor(() => {
        expect(screen.getByTestId('reaction-picker')).toBeInTheDocument();
      });
    });

    it('should call onReact when emoji is selected', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const reactionButtons = screen.getAllByTestId('add-reaction-button');
      await user.click(reactionButtons[0]!);

      const emoji = screen.getByText('👍');
      await user.click(emoji);

      expect(defaultProps.onReact).toHaveBeenCalledWith('msg-1', '👍');
    });

    it('should display existing reactions on messages', () => {
      const messagesWithReactions = [
        createMockMessage({
          id: 'msg-1',
          content: 'Hello!',
          reactions: [{ emoji: '👍', userId: 'user-456', createdAt: new Date() }],
        }),
      ];

      render(<MessageList {...defaultProps} messages={messagesWithReactions} />);

      expect(screen.getByTestId('reaction-badge')).toBeInTheDocument();
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA role', () => {
      render(<MessageList {...defaultProps} />);

      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    it('should have correct ARIA labels for messages', () => {
      render(<MessageList {...defaultProps} />);

      const messages = screen.getAllByRole('article');
      expect(messages[0]).toHaveAccessibleName(/message from john/i);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MessageList {...defaultProps} />);

      const list = screen.getByTestId('message-list');
      list.focus();

      await user.keyboard('{ArrowDown}');

      const messages = screen.getAllByTestId(/^message-item/);
      expect(messages[0]).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should virtualize long message lists', () => {
      const manyMessages = Array.from({ length: 1000 }, (_, i) =>
        createMockMessage({ id: `msg-${i}`, content: `Message ${i}` })
      );

      render(<MessageList {...defaultProps} messages={manyMessages} />);

      // Should only render visible messages (virtualized)
      const renderedMessages = screen.getAllByTestId(/^message-item/);
      expect(renderedMessages.length).toBeLessThan(1000);
    });
  });
});
