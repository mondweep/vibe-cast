/**
 * TypingIndicator Component Tests
 *
 * Tests for the typing indicator component.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

describe('TypingIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when no users are typing', () => {
      render(<TypingIndicator typingUsers={[]} />);

      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
    });

    it('should render when users are typing', () => {
      render(<TypingIndicator typingUsers={[{ id: 'user-1', name: 'Alice' }]} />);

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });

    it('should show animated dots', () => {
      render(<TypingIndicator typingUsers={[{ id: 'user-1', name: 'Alice' }]} />);

      expect(screen.getByTestId('typing-dots')).toBeInTheDocument();
      const dots = screen.getAllByTestId('typing-dot');
      expect(dots).toHaveLength(3);
    });
  });

  describe('Single User Typing', () => {
    it('should show "Name is typing..." for one user', () => {
      render(<TypingIndicator typingUsers={[{ id: 'user-1', name: 'Alice' }]} />);

      expect(screen.getByText('Alice is typing...')).toBeInTheDocument();
    });

    it('should show avatar for single user', () => {
      render(
        <TypingIndicator
          typingUsers={[{ id: 'user-1', name: 'Alice', avatar: 'https://example.com/alice.jpg' }]}
        />
      );

      const avatar = screen.getByTestId('typing-user-avatar');
      expect(avatar).toHaveAttribute('src', 'https://example.com/alice.jpg');
    });

    it('should show initials when no avatar', () => {
      render(<TypingIndicator typingUsers={[{ id: 'user-1', name: 'Alice Smith' }]} />);

      expect(screen.getByText('AS')).toBeInTheDocument();
    });
  });

  describe('Multiple Users Typing', () => {
    it('should show "Name and Name are typing..." for two users', () => {
      render(
        <TypingIndicator
          typingUsers={[
            { id: 'user-1', name: 'Alice' },
            { id: 'user-2', name: 'Bob' },
          ]}
        />
      );

      expect(screen.getByText('Alice and Bob are typing...')).toBeInTheDocument();
    });

    it('should show "Name, Name, and Name are typing..." for three users', () => {
      render(
        <TypingIndicator
          typingUsers={[
            { id: 'user-1', name: 'Alice' },
            { id: 'user-2', name: 'Bob' },
            { id: 'user-3', name: 'Charlie' },
          ]}
        />
      );

      expect(screen.getByText('Alice, Bob, and Charlie are typing...')).toBeInTheDocument();
    });

    it('should show "Several people are typing..." for more than three users', () => {
      render(
        <TypingIndicator
          typingUsers={[
            { id: 'user-1', name: 'Alice' },
            { id: 'user-2', name: 'Bob' },
            { id: 'user-3', name: 'Charlie' },
            { id: 'user-4', name: 'Diana' },
          ]}
        />
      );

      expect(screen.getByText('Several people are typing...')).toBeInTheDocument();
    });

    it('should show stacked avatars for multiple users', () => {
      render(
        <TypingIndicator
          typingUsers={[
            { id: 'user-1', name: 'Alice', avatar: 'https://example.com/alice.jpg' },
            { id: 'user-2', name: 'Bob', avatar: 'https://example.com/bob.jpg' },
          ]}
        />
      );

      const avatars = screen.getAllByTestId('typing-user-avatar');
      expect(avatars).toHaveLength(2);
    });

    it('should limit avatar stack to 3 users', () => {
      render(
        <TypingIndicator
          typingUsers={[
            { id: 'user-1', name: 'Alice', avatar: 'https://example.com/alice.jpg' },
            { id: 'user-2', name: 'Bob', avatar: 'https://example.com/bob.jpg' },
            { id: 'user-3', name: 'Charlie', avatar: 'https://example.com/charlie.jpg' },
            { id: 'user-4', name: 'Diana', avatar: 'https://example.com/diana.jpg' },
            { id: 'user-5', name: 'Eve', avatar: 'https://example.com/eve.jpg' },
          ]}
        />
      );

      const avatars = screen.getAllByTestId('typing-user-avatar');
      expect(avatars).toHaveLength(3);
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should have animation class on dots', () => {
      render(<TypingIndicator typingUsers={[{ id: 'user-1', name: 'Alice' }]} />);

      const dots = screen.getAllByTestId('typing-dot');
      dots.forEach((dot, index) => {
        expect(dot).toHaveClass('animate-bounce');
        expect(dot).toHaveStyle({ animationDelay: `${index * 100}ms` });
      });
    });

    it('should fade in when appearing', () => {
      render(<TypingIndicator typingUsers={[{ id: 'user-1', name: 'Alice' }]} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('animate-fade-in');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<TypingIndicator typingUsers={[{ id: 'user-1', name: 'Alice' }]} />);

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveAttribute('role', 'status');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });

    it('should have screen reader text', () => {
      render(<TypingIndicator typingUsers={[{ id: 'user-1', name: 'Alice' }]} />);

      const srText = screen.getByTestId('typing-sr-text');
      expect(srText).toHaveClass('sr-only');
      expect(srText).toHaveTextContent('Alice is typing');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(
        <TypingIndicator
          typingUsers={[{ id: 'user-1', name: 'Alice' }]}
          className="custom-class"
        />
      );

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('custom-class');
    });

    it('should have compact variant', () => {
      render(
        <TypingIndicator
          typingUsers={[{ id: 'user-1', name: 'Alice' }]}
          variant="compact"
        />
      );

      const indicator = screen.getByTestId('typing-indicator');
      expect(indicator).toHaveClass('typing-indicator-compact');
    });
  });
});
