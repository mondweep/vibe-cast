import { buildPrompt, defaultPrompts, toneRoles } from "@/lib/prompts";
import { Genre, Pass } from "@/lib/types";

describe("buildPrompt", () => {
  const sampleText = "This is a test sentence that needs refinement.";

  describe("conciseness pass", () => {
    it("includes genre context and conciseness rules in system prompt", () => {
      const { system, user } = buildPrompt("conciseness", "essay", sampleText);

      expect(system).toContain("essay or opinion piece");
      expect(system).toContain('Replace "in order to" with "to"');
      expect(user).toContain(sampleText);
    });

    it("includes the text in user prompt", () => {
      const { user } = buildPrompt("conciseness", "technical", sampleText);
      expect(user).toContain(sampleText);
    });
  });

  describe("clarity pass", () => {
    it("includes few-shot examples in system prompt", () => {
      const { system } = buildPrompt("clarity", "essay", sampleText);

      expect(system).toContain("EXAMPLE 1:");
      expect(system).toContain("EXAMPLE 2:");
      expect(system).toContain("Nested relative clauses");
    });
  });

  describe("structure pass", () => {
    it("includes chain-of-thought instructions", () => {
      const { system } = buildPrompt("structure", "journalism", sampleText);

      expect(system).toContain("Step 1:");
      expect(system).toContain("Step 2:");
      expect(system).toContain("Step 3:");
      expect(system).toContain("chain-of-thought");
    });
  });

  describe("tone pass", () => {
    it("substitutes role, audience, and tone parameters", () => {
      const { system, user } = buildPrompt("tone", "academic", sampleText, {
        audience: "PhD students",
        tone: "authoritative",
      });

      expect(system).toContain(toneRoles["authoritative"]);
      expect(user).toContain("PhD students");
      expect(user).toContain("authoritative");
    });

    it("uses default role when tone preset not found", () => {
      const { system } = buildPrompt("tone", "essay", sampleText, {
        audience: "everyone",
        tone: "custom-tone-value",
      });

      // Falls back to the custom value itself
      expect(system).toContain("custom-tone-value");
    });
  });

  describe("iterate pass", () => {
    it("includes conversation history", () => {
      const conversation = [
        { role: "user" as const, content: "Make it shorter" },
        { role: "assistant" as const, content: "Here is a shorter version" },
      ];

      const { user } = buildPrompt("iterate", "business", sampleText, {
        conversation,
        feedback: "Now make it more formal",
      });

      expect(user).toContain("Make it shorter");
      expect(user).toContain("Here is a shorter version");
    });

    it("shows no prior conversation placeholder when empty", () => {
      const { user } = buildPrompt("iterate", "essay", sampleText, {});

      expect(user).toContain("(No prior conversation)");
    });
  });

  describe("genre contexts", () => {
    const genres: Genre[] = [
      "essay",
      "technical",
      "journalism",
      "academic",
      "business",
    ];
    const passes: Pass[] = ["conciseness", "clarity", "structure"];

    genres.forEach((genre) => {
      passes.forEach((pass) => {
        it(`includes ${genre} context for ${pass} pass`, () => {
          const { system } = buildPrompt(pass, genre, sampleText);
          // Each genre context should be prepended
          expect(system.length).toBeGreaterThan(
            defaultPrompts[pass].systemPrompt.length
          );
        });
      });
    });
  });

  describe("custom prompt override", () => {
    it("uses custom prompt instead of default system prompt", () => {
      const customPrompt = "You are a custom editor. Do custom things.";
      const { system } = buildPrompt("clarity", "essay", sampleText, {
        customPrompt,
      });

      expect(system).toContain(customPrompt);
      expect(system).not.toContain("EXAMPLE 1:"); // Default not present
    });
  });
});

describe("defaultPrompts", () => {
  it("has a template for every pass type", () => {
    const passes: Pass[] = [
      "conciseness",
      "clarity",
      "structure",
      "tone",
      "iterate",
    ];
    passes.forEach((pass) => {
      expect(defaultPrompts[pass]).toBeDefined();
      expect(defaultPrompts[pass].systemPrompt).toBeTruthy();
      expect(defaultPrompts[pass].userPromptTemplate).toBeTruthy();
      expect(defaultPrompts[pass].pass).toBe(pass);
    });
  });

  it("clarity template includes few-shot examples", () => {
    expect(defaultPrompts.clarity.fewShotExamples).toBeDefined();
    expect(defaultPrompts.clarity.fewShotExamples!.length).toBeGreaterThan(0);
  });
});

describe("toneRoles", () => {
  it("has predefined role presets", () => {
    expect(toneRoles["general-audience"]).toBeTruthy();
    expect(toneRoles["authoritative"]).toBeTruthy();
    expect(toneRoles["conversational"]).toBeTruthy();
    expect(toneRoles["executive"]).toBeTruthy();
    expect(toneRoles["instructional"]).toBeTruthy();
  });
});
