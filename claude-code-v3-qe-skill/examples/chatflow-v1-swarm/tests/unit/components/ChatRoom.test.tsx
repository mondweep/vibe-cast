/**
 * ChatRoom Component Tests
 *
 * Tests for the main chat room container component.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { createMockRoom, createMockUser, createMockMessage, createMockSocket } from '@/tests/setup';

// Mock the socket hook
vi.mock('@/hooks/useSocket', () => ({
  useSocket: vi.fn(() => ({
    socket: createMockSocket(),
    isConnected: true,
    error: null,
  })),
}));

// Mock the messages hook
vi.mock('@/hooks/useMessages', () => ({
  useMessages: vi.fn(() => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
  })),
}));

// Mock the room hook
vi.mock('@/hooks/useRoom', () => ({
  useRoom: vi.fn(() => ({
    room: createMockRoom(),
    members: [createMockUser()],
    isLoading: false,
    error: null,
  })),
}));

// Mock the typing hook
vi.mock('@/hooks/useTyping', () => ({
  useTyping: vi.fn(() => ({
    typingUsers: [],
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
  })),
}));

describe('ChatRoom', () => {
  const defaultProps = {
    roomId: 'room-123',
    currentUserId: 'user-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the chat room container', () => {
      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('chat-room')).toBeInTheDocument();
    });

    it('should render the room header', () => {
      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('room-header')).toBeInTheDocument();
    });

    it('should render the message list', () => {
      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('should render the message input', () => {
      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });

    it('should render loading state while fetching room', async () => {
      const { useRoom } = await import('@/hooks/useRoom');
      vi.mocked(useRoom).mockReturnValue({
        room: null,
        members: [],
        isLoading: true,
        error: null,
      });

      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('chat-room-loading')).toBeInTheDocument();
    });

    it('should render error state when room fetch fails', async () => {
      const { useRoom } = await import('@/hooks/useRoom');
      vi.mocked(useRoom).mockReturnValue({
        room: null,
        members: [],
        isLoading: false,
        error: new Error('Failed to load room'),
      });

      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('chat-room-error')).toBeInTheDocument();
      expect(screen.getByText(/failed to load room/i)).toBeInTheDocument();
    });
  });

  describe('Connection Status', () => {
    it('should show connected indicator when socket is connected', async () => {
      const { useSocket } = await import('@/hooks/useSocket');
      vi.mocked(useSocket).mockReturnValue({
        socket: createMockSocket(),
        isConnected: true,
        error: null,
      });

      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('connection-status-connected')).toBeInTheDocument();
    });

    it('should show disconnected indicator when socket is disconnected', async () => {
      const { useSocket } = await import('@/hooks/useSocket');
      vi.mocked(useSocket).mockReturnValue({
        socket: null,
        isConnected: false,
        error: null,
      });

      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('connection-status-disconnected')).toBeInTheDocument();
    });

    it('should show reconnecting state', async () => {
      const { useSocket } = await import('@/hooks/useSocket');
      vi.mocked(useSocket).mockReturnValue({
        socket: createMockSocket(),
        isConnected: false,
        error: null,
        isReconnecting: true,
      });

      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('connection-status-reconnecting')).toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    it('should send message when form is submitted', async () => {
      const sendMessage = vi.fn();
      const { useMessages } = await import('@/hooks/useMessages');
      vi.mocked(useMessages).mockReturnValue({
        messages: [],
        isLoading: false,
        error: null,
        sendMessage,
        editMessage: vi.fn(),
        deleteMessage: vi.fn(),
      });

      const user = userEvent.setup();
      render(<ChatRoom {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Hello, world!');
      await user.keyboard('{Enter}');

      expect(sendMessage).toHaveBeenCalledWith('Hello, world!');
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();
      render(<ChatRoom {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a message/i) as HTMLInputElement;
      await user.type(input, 'Hello, world!');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should not send empty messages', async () => {
      const sendMessage = vi.fn();
      const { useMessages } = await import('@/hooks/useMessages');
      vi.mocked(useMessages).mockReturnValue({
        messages: [],
        isLoading: false,
        error: null,
        sendMessage,
        editMessage: vi.fn(),
        deleteMessage: vi.fn(),
      });

      const user = userEvent.setup();
      render(<ChatRoom {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a message/i);
      await user.keyboard('{Enter}');

      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Typing Indicator', () => {
    it('should show typing indicator when users are typing', async () => {
      const { useTyping } = await import('@/hooks/useTyping');
      vi.mocked(useTyping).mockReturnValue({
        typingUsers: [{ id: 'user-456', name: 'Alice' }],
        startTyping: vi.fn(),
        stopTyping: vi.fn(),
      });

      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
      expect(screen.getByText(/alice is typing/i)).toBeInTheDocument();
    });

    it('should not show typing indicator when no one is typing', async () => {
      const { useTyping } = await import('@/hooks/useTyping');
      vi.mocked(useTyping).mockReturnValue({
        typingUsers: [],
        startTyping: vi.fn(),
        stopTyping: vi.fn(),
      });

      render(<ChatRoom {...defaultProps} />);

      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
    });

    it('should trigger startTyping when user starts typing', async () => {
      const startTyping = vi.fn();
      const { useTyping } = await import('@/hooks/useTyping');
      vi.mocked(useTyping).mockReturnValue({
        typingUsers: [],
        startTyping,
        stopTyping: vi.fn(),
      });

      const user = userEvent.setup();
      render(<ChatRoom {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'H');

      expect(startTyping).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA labels', () => {
      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByRole('main')).toHaveAccessibleName(/chat room/i);
      expect(screen.getByRole('log')).toBeInTheDocument(); // Message list
    });

    it('should focus input on mount', () => {
      render(<ChatRoom {...defaultProps} />);

      const input = screen.getByPlaceholderText(/type a message/i);
      expect(document.activeElement).toBe(input);
    });

    it('should announce new messages to screen readers', async () => {
      const messages = [createMockMessage({ content: 'New message!' })];
      const { useMessages } = await import('@/hooks/useMessages');
      vi.mocked(useMessages).mockReturnValue({
        messages,
        isLoading: false,
        error: null,
        sendMessage: vi.fn(),
        editMessage: vi.fn(),
        deleteMessage: vi.fn(),
      });

      render(<ChatRoom {...defaultProps} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render sidebar toggle on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));

      render(<ChatRoom {...defaultProps} showSidebar />);

      expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument();
    });
  });
});
