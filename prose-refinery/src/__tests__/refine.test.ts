import { refineText } from "@/lib/refine";
import { RefineRequest } from "@/lib/types";

// Mock ONLY the external service (Anthropic API) — Forge mocking policy
const mockCreate = jest.fn();
const mockClient = {
  messages: {
    create: mockCreate,
  },
} as any;

describe("refineText", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns suggestions for conciseness pass", async () => {
    const apiResponse = {
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              original: "in order to achieve",
              revised: "to achieve",
              explanation: 'Rule 1: Replace "in order to" with "to"',
              position: { start: 0, end: 19 },
            },
          ]),
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    };
    mockCreate.mockResolvedValue(apiResponse);

    const request: RefineRequest = {
      text: "in order to achieve the goal",
      pass: "conciseness",
      genre: "essay",
    };

    const result = await refineText(request, mockClient);

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].revised).toBe("to achieve");
    expect(result.meta.tokensUsed).toBe(150);
    expect(result.meta.promptUsed).toContain("SYSTEM:");
    expect(result.meta.promptUsed).toContain("USER:");
  });

  it("returns structure analysis for structure pass", async () => {
    const structureResponse = {
      outline: [
        {
          paragraph: 1,
          summary: "Introduces the main argument",
          role: "introduction",
          connectionToNext: "Sets up the evidence",
          issues: [],
        },
      ],
      overallFlow: "Logical progression",
      gaps: ["Missing counterargument"],
      suggestedReordering: [],
      reasoning: "Step 1: The first paragraph introduces...",
    };

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(structureResponse) }],
      usage: { input_tokens: 200, output_tokens: 100 },
    });

    const request: RefineRequest = {
      text: "The first paragraph. The second paragraph.",
      pass: "structure",
      genre: "essay",
    };

    const result = await refineText(request, mockClient);

    expect(result.structure).toBeDefined();
    expect(result.structure!.outline).toHaveLength(1);
    expect(result.structure!.reasoning).toContain("Step 1");
    expect(result.suggestions).toHaveLength(0);
  });

  it("handles markdown code fences in API response", async () => {
    const wrappedResponse = '```json\n[{"original":"test","revised":"tested","explanation":"past tense","position":{"start":0,"end":4}}]\n```';

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: wrappedResponse }],
      usage: { input_tokens: 50, output_tokens: 30 },
    });

    const request: RefineRequest = {
      text: "test text",
      pass: "clarity",
      genre: "technical",
    };

    const result = await refineText(request, mockClient);
    expect(result.suggestions).toHaveLength(1);
  });

  it("passes tone options to the API", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
      usage: { input_tokens: 100, output_tokens: 10 },
    });

    const request: RefineRequest = {
      text: "Some text to adjust tone.",
      pass: "tone",
      genre: "academic",
      options: {
        audience: "Graduate students",
        tone: "authoritative",
      },
    };

    await refineText(request, mockClient);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("peer-reviewed journal");
    expect(callArgs.messages[0].content).toContain("Graduate students");
  });

  it("includes conversation history for iterate pass", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            suggestions: [
              {
                original: "some text",
                revised: "better text",
                explanation: "improved",
                position: { start: 0, end: 9 },
              },
            ],
          }),
        },
      ],
      usage: { input_tokens: 150, output_tokens: 80 },
    });

    const request: RefineRequest = {
      text: "some text to refine",
      pass: "iterate",
      genre: "essay",
      options: {
        conversation: [
          { role: "user", content: "Make it shorter" },
          { role: "assistant", content: "Here is shorter version" },
        ],
      },
    };

    await refineText(request, mockClient);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("Make it shorter");
  });

  it("calculates word count delta correctly", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              original: "in order to achieve the stated goal",
              revised: "to achieve the goal",
              explanation: "conciseness",
              position: { start: 0, end: 34 },
            },
          ]),
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const request: RefineRequest = {
      text: "in order to achieve the stated goal of this project",
      pass: "conciseness",
      genre: "business",
    };

    const result = await refineText(request, mockClient);

    expect(result.meta.wordCountOriginal).toBe(10);
    // Original had 7 words in suggestion, revised has 4 → delta = -3 → 10 - 3 = 7
    expect(result.meta.wordCountRevised).toBe(7);
  });

  it("uses custom prompt when provided", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
      usage: { input_tokens: 50, output_tokens: 10 },
    });

    const request: RefineRequest = {
      text: "test",
      pass: "clarity",
      genre: "essay",
      customPrompt: "You are a pirate editor. Arr!",
    };

    await refineText(request, mockClient);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain("pirate editor");
  });
});
