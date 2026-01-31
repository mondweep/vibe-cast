/**
 * UserPresence Component Tests
 *
 * Tests for the user presence indicator component.
 * Following TDD: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserPresence } from '@/components/chat/UserPresence';

describe('UserPresence', () => {
  const defaultProps = {
    status: 'online' as const,
    userId: 'user-123',
    userName: 'John Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the presence indicator', () => {
      render(<UserPresence {...defaultProps} />);

      expect(screen.getByTestId('user-presence')).toBeInTheDocument();
    });

    it('should render status dot', () => {
      render(<UserPresence {...defaultProps} />);

      expect(screen.getByTestId('presence-dot')).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('should show green for online status', () => {
      render(<UserPresence {...defaultProps} status="online" />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).toHaveClass('bg-green-500');
    });

    it('should show yellow for away status', () => {
      render(<UserPresence {...defaultProps} status="away" />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).toHaveClass('bg-yellow-500');
    });

    it('should show red for dnd (do not disturb) status', () => {
      render(<UserPresence {...defaultProps} status="dnd" />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).toHaveClass('bg-red-500');
    });

    it('should show gray for offline status', () => {
      render(<UserPresence {...defaultProps} status="offline" />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).toHaveClass('bg-gray-400');
    });
  });

  describe('Status Text', () => {
    it('should show "Online" for online status', () => {
      render(<UserPresence {...defaultProps} status="online" showText />);

      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should show "Away" for away status', () => {
      render(<UserPresence {...defaultProps} status="away" showText />);

      expect(screen.getByText('Away')).toBeInTheDocument();
    });

    it('should show "Do Not Disturb" for dnd status', () => {
      render(<UserPresence {...defaultProps} status="dnd" showText />);

      expect(screen.getByText('Do Not Disturb')).toBeInTheDocument();
    });

    it('should show "Offline" for offline status', () => {
      render(<UserPresence {...defaultProps} status="offline" showText />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should not show text by default', () => {
      render(<UserPresence {...defaultProps} />);

      expect(screen.queryByText('Online')).not.toBeInTheDocument();
    });
  });

  describe('Last Seen', () => {
    it('should show last seen for offline users', () => {
      const lastSeen = new Date(Date.now() - 3600000); // 1 hour ago
      render(<UserPresence {...defaultProps} status="offline" lastSeen={lastSeen} showLastSeen />);

      expect(screen.getByTestId('last-seen')).toBeInTheDocument();
      expect(screen.getByText(/last seen/i)).toBeInTheDocument();
    });

    it('should show "last seen recently" for recent activity', () => {
      const lastSeen = new Date(Date.now() - 60000); // 1 minute ago
      render(<UserPresence {...defaultProps} status="offline" lastSeen={lastSeen} showLastSeen />);

      expect(screen.getByText(/last seen a minute ago/i)).toBeInTheDocument();
    });

    it('should show "last seen X hours ago"', () => {
      const lastSeen = new Date(Date.now() - 3600000 * 3); // 3 hours ago
      render(<UserPresence {...defaultProps} status="offline" lastSeen={lastSeen} showLastSeen />);

      expect(screen.getByText(/last seen 3 hours ago/i)).toBeInTheDocument();
    });

    it('should show "last seen yesterday"', () => {
      const lastSeen = new Date(Date.now() - 86400000); // 1 day ago
      render(<UserPresence {...defaultProps} status="offline" lastSeen={lastSeen} showLastSeen />);

      expect(screen.getByText(/last seen yesterday/i)).toBeInTheDocument();
    });

    it('should not show last seen for online users', () => {
      const lastSeen = new Date();
      render(<UserPresence {...defaultProps} status="online" lastSeen={lastSeen} showLastSeen />);

      expect(screen.queryByTestId('last-seen')).not.toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip on hover', async () => {
      const user = userEvent.setup();
      render(<UserPresence {...defaultProps} showTooltip />);

      const indicator = screen.getByTestId('user-presence');
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should show status in tooltip', async () => {
      const user = userEvent.setup();
      render(<UserPresence {...defaultProps} showTooltip />);

      const indicator = screen.getByTestId('user-presence');
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.getByText(/john doe.*online/i)).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      const user = userEvent.setup();
      render(<UserPresence {...defaultProps} showTooltip />);

      const indicator = screen.getByTestId('user-presence');
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      await user.unhover(indicator);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pulse Animation', () => {
    it('should pulse for online status', () => {
      render(<UserPresence {...defaultProps} status="online" pulse />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).toHaveClass('animate-pulse');
    });

    it('should not pulse for offline status', () => {
      render(<UserPresence {...defaultProps} status="offline" pulse />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).not.toHaveClass('animate-pulse');
    });

    it('should not pulse when pulse prop is false', () => {
      render(<UserPresence {...defaultProps} status="online" pulse={false} />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).not.toHaveClass('animate-pulse');
    });
  });

  describe('Size Variants', () => {
    it('should render small size', () => {
      render(<UserPresence {...defaultProps} size="sm" />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).toHaveClass('h-2', 'w-2');
    });

    it('should render medium size (default)', () => {
      render(<UserPresence {...defaultProps} />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).toHaveClass('h-3', 'w-3');
    });

    it('should render large size', () => {
      render(<UserPresence {...defaultProps} size="lg" />);

      const dot = screen.getByTestId('presence-dot');
      expect(dot).toHaveClass('h-4', 'w-4');
    });
  });

  describe('Badge Position', () => {
    it('should position badge at bottom-right by default', () => {
      render(<UserPresence {...defaultProps} />);

      const indicator = screen.getByTestId('user-presence');
      expect(indicator).toHaveClass('bottom-0', 'right-0');
    });

    it('should position badge at top-right when specified', () => {
      render(<UserPresence {...defaultProps} position="top-right" />);

      const indicator = screen.getByTestId('user-presence');
      expect(indicator).toHaveClass('top-0', 'right-0');
    });

    it('should position badge at bottom-left when specified', () => {
      render(<UserPresence {...defaultProps} position="bottom-left" />);

      const indicator = screen.getByTestId('user-presence');
      expect(indicator).toHaveClass('bottom-0', 'left-0');
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<UserPresence {...defaultProps} />);

      const indicator = screen.getByTestId('user-presence');
      expect(indicator).toHaveAttribute('role', 'status');
      expect(indicator).toHaveAttribute('aria-label', 'John Doe is online');
    });

    it('should update ARIA label based on status', () => {
      render(<UserPresence {...defaultProps} status="away" />);

      const indicator = screen.getByTestId('user-presence');
      expect(indicator).toHaveAttribute('aria-label', 'John Doe is away');
    });

    it('should be keyboard focusable when interactive', () => {
      render(<UserPresence {...defaultProps} showTooltip />);

      const indicator = screen.getByTestId('user-presence');
      expect(indicator).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Custom Status Message', () => {
    it('should show custom status message', () => {
      render(<UserPresence {...defaultProps} customStatus="In a meeting" showText />);

      expect(screen.getByText('In a meeting')).toBeInTheDocument();
    });

    it('should show custom status in tooltip', async () => {
      const user = userEvent.setup();
      render(<UserPresence {...defaultProps} customStatus="In a meeting" showTooltip />);

      const indicator = screen.getByTestId('user-presence');
      await user.hover(indicator);

      await waitFor(() => {
        expect(screen.getByText(/in a meeting/i)).toBeInTheDocument();
      });
    });
  });
});
