import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "@/app/page";

// Mock fetch globally
global.fetch = jest.fn();

describe("Home page", () => {
  it("renders the app title", () => {
    render(<Home />);
    expect(screen.getByText("Prose Refinery")).toBeInTheDocument();
    expect(
      screen.getByText("Refine non-fiction writing — one pass at a time")
    ).toBeInTheDocument();
  });

  it("renders all four navigation tabs", () => {
    render(<Home />);
    // "Refine" appears as both a tab and footer button, so use getAllByText
    const refineElements = screen.getAllByText("Refine");
    expect(refineElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Prompt Playground")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("switches to Verified view when Verified tab is clicked", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Verified"));
    expect(
      screen.getByText("Test Verification Report")
    ).toBeInTheDocument();
    // Genre/pass controls should be hidden
    expect(screen.queryByText("Genre:")).not.toBeInTheDocument();
  });

  it("renders footer credits", () => {
    render(<Home />);
    expect(screen.getByText("Mondweep Chakravorty")).toBeInTheDocument();
    expect(screen.getByText("View on GitHub")).toBeInTheDocument();
  });

  it("shows Refine view by default", () => {
    render(<Home />);
    expect(
      screen.getByPlaceholderText("Paste your non-fiction draft here...")
    ).toBeInTheDocument();
  });

  it("shows genre and pass selectors by default", () => {
    render(<Home />);
    expect(screen.getByText("Genre:")).toBeInTheDocument();
    expect(screen.getByText("Pass:")).toBeInTheDocument();
    expect(screen.getByText("Essay / Opinion")).toBeInTheDocument();
    expect(screen.getByText(/Conciseness/)).toBeInTheDocument();
  });

  it("switches to About view when About tab is clicked", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("About"));
    expect(
      screen.getByText("What is Prose Refinery?")
    ).toBeInTheDocument();
    // Genre/pass controls should be hidden
    expect(screen.queryByText("Genre:")).not.toBeInTheDocument();
  });

  it("switches to Prompt Playground view", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Prompt Playground"));
    expect(screen.getByText(/Prompt Playground —/)).toBeInTheDocument();
  });

  it("switches back to Refine view from About", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("About"));
    expect(screen.getByText("What is Prose Refinery?")).toBeInTheDocument();

    // There are multiple elements with "Refine" text; use the navigation button
    const refineBtn = screen.getAllByText("Refine").find(
      (el) => el.tagName === "BUTTON"
    )!;
    fireEvent.click(refineBtn);
    expect(
      screen.getByPlaceholderText("Paste your non-fiction draft here...")
    ).toBeInTheDocument();
  });

  it("changes genre when a genre button is clicked", () => {
    render(<Home />);
    const techBtn = screen.getByText("Technical / Docs");
    fireEvent.click(techBtn);
    expect(techBtn.className).toContain("bg-stone-800");
  });

  it("changes pass when a pass button is clicked", () => {
    render(<Home />);
    const clarityBtn = screen.getByText("Clarity");
    fireEvent.click(clarityBtn);
    expect(clarityBtn.closest("button")!.className).toContain("bg-amber-600");
  });

  it("shows tone options when Tone pass is selected", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Tone"));
    expect(screen.getByText("Target Audience")).toBeInTheDocument();
    expect(screen.getByText("Target Tone")).toBeInTheDocument();
  });

  it("hides tone options when non-Tone pass is selected", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Tone"));
    expect(screen.getByText("Target Audience")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clarity"));
    expect(screen.queryByText("Target Audience")).not.toBeInTheDocument();
  });

  it("tracks word count in text area", () => {
    render(<Home />);
    const textarea = screen.getByPlaceholderText(
      "Paste your non-fiction draft here..."
    );
    fireEvent.change(textarea, {
      target: { value: "Hello world this is a test" },
    });
    expect(screen.getByText("6 words")).toBeInTheDocument();
  });

  it("disables Refine button when text is empty", () => {
    render(<Home />);
    // Find the Refine button in the footer (not the tab)
    const refineButtons = screen.getAllByText("Refine");
    const footerBtn = refineButtons.find(
      (el) => el.tagName === "BUTTON" && el.className.includes("bg-amber")
    );
    expect(footerBtn).toBeDisabled();
  });

  it("enables Refine button when text is entered", () => {
    render(<Home />);
    const textarea = screen.getByPlaceholderText(
      "Paste your non-fiction draft here..."
    );
    fireEvent.change(textarea, { target: { value: "Some text here" } });

    const refineButtons = screen.getAllByText("Refine");
    const footerBtn = refineButtons.find(
      (el) => el.tagName === "BUTTON" && el.className.includes("bg-amber")
    );
    expect(footerBtn).not.toBeDisabled();
  });

  it("shows iterative chat when Iterate pass is selected", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Iterate"));
    expect(
      screen.getByPlaceholderText(
        "Describe how you'd like to refine this passage..."
      )
    ).toBeInTheDocument();
  });
});
