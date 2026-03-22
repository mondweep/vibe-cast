import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GenreSelector } from "@/components/GenreSelector";
import { PassSelector } from "@/components/PassSelector";
import { ToneOptions } from "@/components/ToneOptions";
import { SuggestionCard } from "@/components/SuggestionCard";
import { StructureView } from "@/components/StructureView";
import { PromptInspector } from "@/components/PromptInspector";
import { AboutView } from "@/components/AboutView";
import { Suggestion, StructureAnalysis } from "@/lib/types";

// ─── GenreSelector ───────────────────────────────────────────────────────────
describe("GenreSelector", () => {
  const genres = [
    "Essay / Opinion",
    "Technical / Docs",
    "Journalism",
    "Academic",
    "Business / Memo",
  ];

  it("renders all five genre buttons", () => {
    render(<GenreSelector value="essay" onChange={() => {}} />);
    genres.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("highlights the active genre", () => {
    render(<GenreSelector value="technical" onChange={() => {}} />);
    const btn = screen.getByText("Technical / Docs");
    expect(btn.className).toContain("bg-stone-800");
    expect(btn.className).toContain("text-white");
  });

  it("applies inactive style to non-selected genres", () => {
    render(<GenreSelector value="essay" onChange={() => {}} />);
    const btn = screen.getByText("Journalism");
    expect(btn.className).toContain("bg-stone-200");
  });

  it("calls onChange when a genre is clicked", () => {
    const onChange = jest.fn();
    render(<GenreSelector value="essay" onChange={onChange} />);
    fireEvent.click(screen.getByText("Academic"));
    expect(onChange).toHaveBeenCalledWith("academic");
  });

  it("calls onChange with correct value for each genre", () => {
    const onChange = jest.fn();
    render(<GenreSelector value="essay" onChange={onChange} />);

    fireEvent.click(screen.getByText("Business / Memo"));
    expect(onChange).toHaveBeenCalledWith("business");

    fireEvent.click(screen.getByText("Journalism"));
    expect(onChange).toHaveBeenCalledWith("journalism");

    fireEvent.click(screen.getByText("Technical / Docs"));
    expect(onChange).toHaveBeenCalledWith("technical");
  });
});

// ─── PassSelector ────────────────────────────────────────────────────────────
describe("PassSelector", () => {
  const passes = [
    { label: "Conciseness", pattern: "(System Rules)" },
    { label: "Clarity", pattern: "(Few-Shot)" },
    { label: "Tone", pattern: "(Role Prompting)" },
    { label: "Structure", pattern: "(Chain-of-Thought)" },
    { label: "Iterate", pattern: "(Multi-Turn)" },
  ];

  it("renders all five pass buttons with patterns", () => {
    render(<PassSelector value="conciseness" onChange={() => {}} />);
    passes.forEach(({ label, pattern }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(pattern)).toBeInTheDocument();
    });
  });

  it("highlights the active pass with amber", () => {
    render(<PassSelector value="clarity" onChange={() => {}} />);
    const btn = screen.getByText("Clarity").closest("button")!;
    expect(btn.className).toContain("bg-amber-600");
  });

  it("applies inactive style to non-selected passes", () => {
    render(<PassSelector value="clarity" onChange={() => {}} />);
    const btn = screen.getByText("Conciseness").closest("button")!;
    expect(btn.className).toContain("bg-stone-200");
  });

  it("calls onChange when a pass is clicked", () => {
    const onChange = jest.fn();
    render(<PassSelector value="conciseness" onChange={onChange} />);
    fireEvent.click(screen.getByText("Tone"));
    expect(onChange).toHaveBeenCalledWith("tone");
  });

  it("calls onChange with correct values", () => {
    const onChange = jest.fn();
    render(<PassSelector value="conciseness" onChange={onChange} />);

    fireEvent.click(screen.getByText("Structure"));
    expect(onChange).toHaveBeenCalledWith("structure");

    fireEvent.click(screen.getByText("Iterate"));
    expect(onChange).toHaveBeenCalledWith("iterate");
  });
});

// ─── ToneOptions ─────────────────────────────────────────────────────────────
describe("ToneOptions", () => {
  const defaultProps = {
    audience: "General audience",
    tone: "general-audience",
    onAudienceChange: jest.fn(),
    onToneChange: jest.fn(),
  };

  it("renders audience and tone labels", () => {
    render(<ToneOptions {...defaultProps} />);
    expect(screen.getByText("Target Audience")).toBeInTheDocument();
    expect(screen.getByText("Target Tone")).toBeInTheDocument();
  });

  it("renders all audience presets", () => {
    render(<ToneOptions {...defaultProps} />);
    const audienceSelect = screen.getByDisplayValue("General audience");
    expect(audienceSelect).toBeInTheDocument();

    const audiences = [
      "General audience",
      "Technical practitioners",
      "C-suite executives",
      "Academic peers",
      "Students / beginners",
    ];
    audiences.forEach((a) => {
      expect(screen.getByText(a)).toBeInTheDocument();
    });
  });

  it("renders all tone presets", () => {
    render(<ToneOptions {...defaultProps} />);
    const tones = [
      "Accessible",
      "Authoritative",
      "Conversational",
      "Executive",
      "Instructional",
    ];
    tones.forEach((t) => {
      expect(screen.getByText(t)).toBeInTheDocument();
    });
  });

  it("calls onAudienceChange when audience is changed", () => {
    const onAudienceChange = jest.fn();
    render(<ToneOptions {...defaultProps} onAudienceChange={onAudienceChange} />);
    fireEvent.change(screen.getByDisplayValue("General audience"), {
      target: { value: "C-suite executives" },
    });
    expect(onAudienceChange).toHaveBeenCalledWith("C-suite executives");
  });

  it("calls onToneChange when tone is changed", () => {
    const onToneChange = jest.fn();
    render(<ToneOptions {...defaultProps} onToneChange={onToneChange} />);
    fireEvent.change(screen.getByDisplayValue("Accessible"), {
      target: { value: "executive" },
    });
    expect(onToneChange).toHaveBeenCalledWith("executive");
  });
});

// ─── SuggestionCard ──────────────────────────────────────────────────────────
describe("SuggestionCard", () => {
  const suggestion: Suggestion = {
    original: "in order to achieve",
    revised: "to achieve",
    explanation: 'Rule 1: Replace "in order to" with "to"',
    position: { start: 0, end: 19 },
  };

  it("renders original, revised, and explanation", () => {
    render(
      <SuggestionCard
        suggestion={suggestion}
        index={0}
        accepted={false}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText("in order to achieve")).toBeInTheDocument();
    expect(screen.getByText("to achieve")).toBeInTheDocument();
    expect(
      screen.getByText('Rule 1: Replace "in order to" with "to"')
    ).toBeInTheDocument();
  });

  it("shows index number", () => {
    render(
      <SuggestionCard
        suggestion={suggestion}
        index={2}
        accepted={false}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("shows Accept button when not accepted", () => {
    render(
      <SuggestionCard
        suggestion={suggestion}
        index={0}
        accepted={false}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText("Accept")).toBeInTheDocument();
  });

  it("shows Accepted button when accepted", () => {
    render(
      <SuggestionCard
        suggestion={suggestion}
        index={0}
        accepted={true}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("applies green styling when accepted", () => {
    const { container } = render(
      <SuggestionCard
        suggestion={suggestion}
        index={0}
        accepted={true}
        onToggle={() => {}}
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-green-300");
    expect(card.className).toContain("bg-green-50");
  });

  it("calls onToggle when Accept button is clicked", () => {
    const onToggle = jest.fn();
    render(
      <SuggestionCard
        suggestion={suggestion}
        index={0}
        accepted={false}
        onToggle={onToggle}
      />
    );
    fireEvent.click(screen.getByText("Accept"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

// ─── StructureView ───────────────────────────────────────────────────────────
describe("StructureView", () => {
  const analysis: StructureAnalysis = {
    outline: [
      {
        paragraph: 1,
        summary: "Introduces the main argument",
        role: "introduction",
        connectionToNext: "Sets up the evidence",
        issues: ["Weak hook"],
      },
      {
        paragraph: 2,
        summary: "Presents supporting evidence",
        role: "evidence",
        connectionToNext: "",
        issues: [],
      },
    ],
    overallFlow: "Good logical progression",
    gaps: ["Missing counterargument"],
    suggestedReordering: ["Move paragraph 3 before paragraph 2"],
    reasoning: "Step 1: The first paragraph introduces the topic...",
  };

  it("renders chain-of-thought reasoning", () => {
    render(<StructureView analysis={analysis} />);
    expect(
      screen.getByText("Chain-of-Thought Reasoning")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Step 1: The first paragraph introduces the topic...")
    ).toBeInTheDocument();
  });

  it("renders paragraph outline", () => {
    render(<StructureView analysis={analysis} />);
    expect(screen.getByText("Structural Outline")).toBeInTheDocument();
    expect(
      screen.getByText("Introduces the main argument")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Presents supporting evidence")
    ).toBeInTheDocument();
  });

  it("renders paragraph roles", () => {
    render(<StructureView analysis={analysis} />);
    expect(screen.getByText("introduction")).toBeInTheDocument();
    expect(screen.getByText("evidence")).toBeInTheDocument();
  });

  it("renders transitions", () => {
    render(<StructureView analysis={analysis} />);
    expect(
      screen.getByText("Transition: Sets up the evidence")
    ).toBeInTheDocument();
  });

  it("renders issues", () => {
    render(<StructureView analysis={analysis} />);
    expect(screen.getByText("Weak hook")).toBeInTheDocument();
  });

  it("renders overall flow", () => {
    render(<StructureView analysis={analysis} />);
    expect(screen.getByText("Overall Flow")).toBeInTheDocument();
    expect(
      screen.getByText("Good logical progression")
    ).toBeInTheDocument();
  });

  it("renders gaps", () => {
    render(<StructureView analysis={analysis} />);
    expect(screen.getByText("Gaps Identified")).toBeInTheDocument();
    expect(screen.getByText("Missing counterargument")).toBeInTheDocument();
  });

  it("renders suggested reordering", () => {
    render(<StructureView analysis={analysis} />);
    expect(screen.getByText("Suggested Reordering")).toBeInTheDocument();
    expect(
      screen.getByText("Move paragraph 3 before paragraph 2")
    ).toBeInTheDocument();
  });

  it("hides gaps section when empty", () => {
    const noGaps = { ...analysis, gaps: [] };
    render(<StructureView analysis={noGaps} />);
    expect(screen.queryByText("Gaps Identified")).not.toBeInTheDocument();
  });

  it("hides reordering section when empty", () => {
    const noReorder = { ...analysis, suggestedReordering: [] };
    render(<StructureView analysis={noReorder} />);
    expect(
      screen.queryByText("Suggested Reordering")
    ).not.toBeInTheDocument();
  });
});

// ─── PromptInspector ─────────────────────────────────────────────────────────
describe("PromptInspector", () => {
  it("renders toggle button", () => {
    render(<PromptInspector promptUsed="SYSTEM: You are..." />);
    expect(
      screen.getByText(/Prompt Inspector/)
    ).toBeInTheDocument();
  });

  it("does not show prompt content initially", () => {
    render(<PromptInspector promptUsed="SYSTEM: You are a test editor" />);
    expect(
      screen.queryByText("SYSTEM: You are a test editor")
    ).not.toBeInTheDocument();
  });

  it("shows prompt content after clicking toggle", () => {
    render(<PromptInspector promptUsed="SYSTEM: You are a test editor" />);
    fireEvent.click(screen.getByText(/Prompt Inspector/));
    expect(
      screen.getByText("SYSTEM: You are a test editor")
    ).toBeInTheDocument();
  });

  it("hides prompt content after clicking toggle twice", () => {
    render(<PromptInspector promptUsed="SYSTEM: You are a test editor" />);
    const btn = screen.getByText(/Prompt Inspector/);
    fireEvent.click(btn);
    expect(
      screen.getByText("SYSTEM: You are a test editor")
    ).toBeInTheDocument();
    fireEvent.click(btn);
    expect(
      screen.queryByText("SYSTEM: You are a test editor")
    ).not.toBeInTheDocument();
  });

  it("renders nothing when promptUsed is empty", () => {
    const { container } = render(<PromptInspector promptUsed="" />);
    expect(container.innerHTML).toBe("");
  });
});

// ─── AboutView ───────────────────────────────────────────────────────────────
describe("AboutView", () => {
  it("renders the main heading", () => {
    render(<AboutView />);
    expect(
      screen.getByText("What is Prose Refinery?")
    ).toBeInTheDocument();
  });

  it("renders all section headings", () => {
    render(<AboutView />);
    expect(screen.getByText("Genres")).toBeInTheDocument();
    expect(screen.getByText("Editing Passes")).toBeInTheDocument();
    expect(screen.getByText("How to Use")).toBeInTheDocument();
    expect(screen.getByText("Prompt Playground")).toBeInTheDocument();
  });

  it("lists all genre descriptions", () => {
    render(<AboutView />);
    expect(screen.getByText("Essay / Opinion")).toBeInTheDocument();
    expect(screen.getByText("Technical / Docs")).toBeInTheDocument();
    expect(screen.getByText("Journalism")).toBeInTheDocument();
    expect(screen.getByText("Academic")).toBeInTheDocument();
    expect(screen.getByText("Business / Memo")).toBeInTheDocument();
  });

  it("lists all editing passes", () => {
    render(<AboutView />);
    expect(screen.getByText("Conciseness")).toBeInTheDocument();
    expect(screen.getByText("Clarity")).toBeInTheDocument();
    expect(screen.getByText("Tone")).toBeInTheDocument();
    expect(screen.getByText("Structure")).toBeInTheDocument();
    expect(screen.getByText("Iterate")).toBeInTheDocument();
  });

  it("shows pass technique labels", () => {
    render(<AboutView />);
    expect(screen.getByText("(System Rules)")).toBeInTheDocument();
    expect(screen.getByText("(Few-Shot)")).toBeInTheDocument();
    expect(screen.getByText("(Role Prompting)")).toBeInTheDocument();
    expect(screen.getByText("(Chain-of-Thought)")).toBeInTheDocument();
    expect(screen.getByText("(Multi-Turn)")).toBeInTheDocument();
  });

  it("renders step-by-step usage instructions", () => {
    render(<AboutView />);
    expect(
      screen.getByText(/Choose a genre/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Pick a pass/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Apply Selected/)
    ).toBeInTheDocument();
  });
});
