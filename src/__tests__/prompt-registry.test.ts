import { describe, it, expect, beforeAll } from "vitest";
import { PromptRegistry } from "../prompt-registry.js";
import { resolve } from "node:path";

const PROMPTS_DIR = resolve(__dirname, "..", "..", "docs", "prompts");

describe("PromptRegistry", () => {
  let registry: PromptRegistry;

  beforeAll(() => {
    registry = new PromptRegistry(PROMPTS_DIR);
  });

  describe("getPrompt", () => {
    it("loads WTM v1.0 system prompt with mapping rules", () => {
      const prompt = registry.getPrompt("WTM", "v1.0");
      expect(prompt.systemPrompt).toBeTruthy();
      expect(prompt.systemPrompt).toContain("mood engine");
      expect(prompt.systemPrompt).toContain("Rain");
      expect(prompt.systemPrompt).toContain("Sunny");
      expect(prompt.systemPrompt).toContain("Stormy");
      expect(prompt.systemPrompt).toContain("Clear Night");
      expect(prompt.id).toBe("WTM");
      expect(prompt.version).toBe("v1.0");
    });

    it("loads WTM v1.0 user template with expected placeholders", () => {
      const prompt = registry.getPrompt("WTM", "v1.0");
      expect(prompt.userTemplate).toContain("{{condition}}");
      expect(prompt.userTemplate).toContain("{{temperature_c}}");
      expect(prompt.userTemplate).toContain("{{humidity_pct}}");
      expect(prompt.userTemplate).toContain("{{wind_speed_kmh}}");
      expect(prompt.userTemplate).toContain("{{time_of_day}}");
    });

    it("includes few-shot examples for WTM", () => {
      const prompt = registry.getPrompt("WTM", "v1.0");
      expect(prompt.fewShotExamples).toBeDefined();
      expect(prompt.fewShotExamples!.length).toBe(4);

      const conditions = prompt.fewShotExamples!.map(
        (e) => (e.input as Record<string, unknown>).condition
      );
      expect(conditions).toContain("rain");
      expect(conditions).toContain("sunny");
      expect(conditions).toContain("stormy");
      expect(conditions).toContain("clear_night");
    });

    it("loads COMP v1.0 prompt", () => {
      const prompt = registry.getPrompt("COMP", "v1.0");
      expect(prompt.systemPrompt).toBeTruthy();
      expect(prompt.systemPrompt).toContain("composition prompt generator");
      expect(prompt.userTemplate).toContain("{{mood_json}}");
      expect(prompt.userTemplate).toContain("{{weather_json}}");
      expect(prompt.fewShotExamples).toBeUndefined();
    });

    it("loads SOC v1.0 prompt", () => {
      const prompt = registry.getPrompt("SOC", "v1.0");
      expect(prompt.systemPrompt).toBeTruthy();
      expect(prompt.systemPrompt).toContain("Zephyr Drift");
      expect(prompt.systemPrompt).toContain("Maina");
      expect(prompt.systemPrompt).toContain("Hermonia Vex");
      expect(prompt.userTemplate).toContain("{{mention_json}}");
      expect(prompt.userTemplate).toContain("{{mood_json}}");
      expect(prompt.userTemplate).toContain("{{weather_json}}");
    });

    it("loads NARR v1.0 prompt", () => {
      const prompt = registry.getPrompt("NARR", "v1.0");
      expect(prompt.systemPrompt).toBeTruthy();
      expect(prompt.systemPrompt).toContain("poetic narrator");
      expect(prompt.userTemplate).toContain("{{weather_json}}");
      expect(prompt.userTemplate).toContain("{{mood_json}}");
      expect(prompt.userTemplate).toContain("{{track_json}}");
    });

    it("returns active version when version is omitted", () => {
      const prompt = registry.getPrompt("WTM");
      expect(prompt.version).toBe("v1.0");
      expect(prompt.systemPrompt).toBeTruthy();
    });
  });

  describe("listVersions", () => {
    it("lists versions for WTM", () => {
      const versions = registry.listVersions("WTM");
      expect(versions.length).toBeGreaterThanOrEqual(1);
      expect(versions.map((v) => v.version)).toContain("v1.0");
    });

    it("throws for non-existent prompt ID", () => {
      expect(() => registry.listVersions("INVALID")).toThrow(/not found/);
      expect(() => registry.listVersions("INVALID")).toThrow(/INVALID/);
    });
  });

  describe("getActiveVersion", () => {
    it("returns v1.0 for WTM", () => {
      expect(registry.getActiveVersion("WTM")).toBe("v1.0");
    });

    it("returns v1.0 for all prompt types", () => {
      expect(registry.getActiveVersion("COMP")).toBe("v1.0");
      expect(registry.getActiveVersion("SOC")).toBe("v1.0");
      expect(registry.getActiveVersion("NARR")).toBe("v1.0");
    });
  });

  describe("error handling", () => {
    it("throws descriptive error for missing prompt ID", () => {
      expect(() => registry.getPrompt("NONEXISTENT")).toThrow(
        /Prompt ID "NONEXISTENT" not found/
      );
    });

    it("throws descriptive error for missing version", () => {
      expect(() => registry.getPrompt("WTM", "v9.9")).toThrow(
        /Version "v9.9" not found for prompt "WTM"/
      );
    });
  });

  describe("caching", () => {
    it("returns the same object on repeated calls", () => {
      const first = registry.getPrompt("WTM", "v1.0");
      const second = registry.getPrompt("WTM", "v1.0");
      expect(first).toBe(second); // Same reference = cached
    });
  });
});
