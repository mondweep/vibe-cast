import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PostureScore from "../../src/components/student/PostureScore";

describe("PostureScore", () => {
  it("renders without crashing", () => {
    const { container } = render(<PostureScore score={75} classification="good" />);
    expect(container).toBeDefined();
  });

  it("displays the score number", () => {
    render(<PostureScore score={75} classification="good" />);
    expect(screen.getByText("75")).toBeDefined();
  });

  it("displays the score out of 100", () => {
    render(<PostureScore score={75} classification="good" />);
    expect(screen.getByText("/ 100")).toBeDefined();
  });

  it("shows 'Good posture' label for good classification", () => {
    render(<PostureScore score={85} classification="good" />);
    expect(screen.getByText("Good posture")).toBeDefined();
  });

  it("shows 'Fair posture' label for fair classification", () => {
    render(<PostureScore score={55} classification="fair" />);
    expect(screen.getByText("Fair posture")).toBeDefined();
  });

  it("shows 'Poor posture' label for poor classification", () => {
    render(<PostureScore score={20} classification="poor" />);
    expect(screen.getByText("Poor posture")).toBeDefined();
  });

  it("applies text-accent-green class for good classification", () => {
    render(<PostureScore score={85} classification="good" />);
    const label = screen.getByText("Good posture");
    expect(label.className).toContain("text-accent-green");
  });

  it("applies text-accent-amber class for fair classification", () => {
    render(<PostureScore score={55} classification="fair" />);
    const label = screen.getByText("Fair posture");
    expect(label.className).toContain("text-accent-amber");
  });

  it("applies text-accent-red class for poor classification", () => {
    render(<PostureScore score={20} classification="poor" />);
    const label = screen.getByText("Poor posture");
    expect(label.className).toContain("text-accent-red");
  });

  it("renders different score values correctly", () => {
    const { rerender } = render(<PostureScore score={0} classification="poor" />);
    expect(screen.getByText("0")).toBeDefined();

    rerender(<PostureScore score={100} classification="good" />);
    expect(screen.getByText("100")).toBeDefined();

    rerender(<PostureScore score={42} classification="fair" />);
    expect(screen.getByText("42")).toBeDefined();
  });
});
