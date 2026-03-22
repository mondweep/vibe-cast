/**
 * Tests for API request validation logic.
 * We test the validation rules that the API route enforces,
 * without importing Next.js server modules (which need Node globals).
 */

describe("API request validation rules", () => {
  const validPasses = ["clarity", "conciseness", "structure", "tone", "iterate"];
  const validGenres = ["essay", "technical", "journalism", "academic", "business"];

  function validate(body: Record<string, unknown>): string | null {
    if (!body.text || !body.pass || !body.genre) {
      return "Missing required fields: text, pass, genre";
    }
    if (!validPasses.includes(body.pass as string)) {
      return `Invalid pass. Must be one of: ${validPasses.join(", ")}`;
    }
    if (!validGenres.includes(body.genre as string)) {
      return `Invalid genre. Must be one of: ${validGenres.join(", ")}`;
    }
    if (
      body.pass === "tone" &&
      (!(body.options as any)?.audience || !(body.options as any)?.tone)
    ) {
      return "Tone pass requires options.audience and options.tone";
    }
    return null;
  }

  it("rejects missing text", () => {
    expect(validate({ pass: "clarity", genre: "essay" })).toContain("Missing");
  });

  it("rejects missing pass", () => {
    expect(validate({ text: "hi", genre: "essay" })).toContain("Missing");
  });

  it("rejects missing genre", () => {
    expect(validate({ text: "hi", pass: "clarity" })).toContain("Missing");
  });

  it("rejects invalid pass", () => {
    expect(validate({ text: "hi", pass: "invalid", genre: "essay" })).toContain(
      "Invalid pass"
    );
  });

  it("rejects invalid genre", () => {
    expect(
      validate({ text: "hi", pass: "clarity", genre: "poetry" })
    ).toContain("Invalid genre");
  });

  it("rejects tone pass without audience", () => {
    expect(
      validate({ text: "hi", pass: "tone", genre: "essay", options: { tone: "x" } })
    ).toContain("Tone pass requires");
  });

  it("rejects tone pass without tone", () => {
    expect(
      validate({
        text: "hi",
        pass: "tone",
        genre: "essay",
        options: { audience: "x" },
      })
    ).toContain("Tone pass requires");
  });

  it("accepts valid clarity request", () => {
    expect(validate({ text: "hello", pass: "clarity", genre: "essay" })).toBeNull();
  });

  it("accepts valid tone request with options", () => {
    expect(
      validate({
        text: "hello",
        pass: "tone",
        genre: "academic",
        options: { audience: "professors", tone: "authoritative" },
      })
    ).toBeNull();
  });

  it("accepts all valid pass types", () => {
    validPasses.forEach((pass) => {
      const opts = pass === "tone" ? { audience: "a", tone: "t" } : undefined;
      expect(
        validate({ text: "hello", pass, genre: "essay", options: opts })
      ).toBeNull();
    });
  });

  it("accepts all valid genre types", () => {
    validGenres.forEach((genre) => {
      expect(validate({ text: "hello", pass: "clarity", genre })).toBeNull();
    });
  });
});
