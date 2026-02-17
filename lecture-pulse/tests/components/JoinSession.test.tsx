import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import JoinSession from "../../src/components/student/JoinSession";

// Mock generateNickname to return a deterministic value for testing
vi.mock("../../src/lib/nicknames", () => ({
  generateNickname: () => "Swift Falcon",
}));

describe("JoinSession", () => {
  beforeEach(() => {
    // Clear URL search params between tests
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "" },
    });
  });

  it("renders without crashing", () => {
    const { container } = render(<JoinSession onJoin={vi.fn()} />);
    expect(container).toBeDefined();
  });

  it("renders an input field for room code", () => {
    render(<JoinSession onJoin={vi.fn()} />);
    const input = screen.getByPlaceholderText("ABCD");
    expect(input).toBeDefined();
  });

  it("renders a Join Session button", () => {
    render(<JoinSession onJoin={vi.fn()} />);
    const button = screen.getByRole("button", { name: /join session/i });
    expect(button).toBeDefined();
  });

  it("button is disabled when room code is less than 4 characters", () => {
    render(<JoinSession onJoin={vi.fn()} />);
    const button = screen.getByRole("button", { name: /join session/i });
    expect(button).toHaveProperty("disabled", true);
  });

  it("button is enabled when room code is exactly 4 characters", () => {
    render(<JoinSession onJoin={vi.fn()} />);
    const input = screen.getByPlaceholderText("ABCD");
    fireEvent.change(input, { target: { value: "TEST" } });
    const button = screen.getByRole("button", { name: /join session/i });
    expect(button).toHaveProperty("disabled", false);
  });

  it("auto-fills room code from URL params (?room=XYZW)", () => {
    // Set URL search params before rendering
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "?room=XYZW" },
    });
    render(<JoinSession onJoin={vi.fn()} />);

    const input = screen.getByPlaceholderText("ABCD") as HTMLInputElement;
    expect(input.value).toBe("XYZW");
  });

  it("calls onJoin with the room code and generated nickname when clicking Join", () => {
    const onJoin = vi.fn();
    render(<JoinSession onJoin={onJoin} />);

    const input = screen.getByPlaceholderText("ABCD");
    fireEvent.change(input, { target: { value: "ABCD" } });

    const button = screen.getByRole("button", { name: /join session/i });
    fireEvent.click(button);

    expect(onJoin).toHaveBeenCalledOnce();
    expect(onJoin).toHaveBeenCalledWith("ABCD", "Swift Falcon");
  });

  it("uppercases the room code input", () => {
    render(<JoinSession onJoin={vi.fn()} />);
    const input = screen.getByPlaceholderText("ABCD") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abcd" } });
    expect(input.value).toBe("ABCD");
  });

  it("shows error when trying to join with less than 4 characters", () => {
    render(<JoinSession onJoin={vi.fn()} />);
    const input = screen.getByPlaceholderText("ABCD");
    fireEvent.change(input, { target: { value: "AB" } });

    // Manually trigger Enter key to attempt join
    fireEvent.keyDown(input, { key: "Enter" });

    // Error should appear
    expect(screen.getByText(/room code must be exactly 4 characters/i)).toBeDefined();
  });
});
