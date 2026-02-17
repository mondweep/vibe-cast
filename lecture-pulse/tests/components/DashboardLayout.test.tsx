import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the useDashboardSocket hook to avoid real WebSocket connections
vi.mock("../../src/hooks/useDashboardSocket", () => ({
  useDashboardSocket: () => ({
    isConnected: false,
    dashboardState: null,
    roomCode: null,
    sessionActive: false,
    error: null,
    createSession: vi.fn(),
    endSession: vi.fn(),
    triggerStretch: vi.fn(),
  }),
}));

// Mock recharts components that rely on DOM measurements
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}));

// Mock qrcode.react
vi.mock("qrcode.react", () => ({
  QRCodeSVG: () => <svg data-testid="qr-code" />,
  default: () => <svg data-testid="qr-code" />,
}));

import DashboardLayout from "../../src/components/dashboard/DashboardLayout";

describe("DashboardLayout", () => {
  it("renders without crashing (smoke test)", () => {
    const { container } = render(<DashboardLayout />);
    expect(container).toBeDefined();
  });

  it("shows 'Create a session to get started' when no session is active", () => {
    render(<DashboardLayout />);
    expect(screen.getByText(/create a session to get started/i)).toBeDefined();
  });

  it("shows connection status indicator", () => {
    render(<DashboardLayout />);
    // When not connected, should show "Connecting..."
    expect(screen.getByText(/connecting/i)).toBeDefined();
  });
});
