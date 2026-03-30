import { describe, it, expect, beforeEach } from "vitest";
import { resolve } from "node:path";
import { SocialEngine, PERSONALITY } from "../social-engine.js";
import { PromptRegistry } from "../prompt-registry.js";
import { MockLLMClient } from "../llm-client.js";
import type { AgentMention, MoodVector, WeatherInput } from "../types.js";

const PROMPTS_DIR = resolve(__dirname, "..", "..", "docs", "prompts");

/** Helper to create a default MoodVector */
function makeMood(overrides: Partial<MoodVector> = {}): MoodVector {
  return {
    genre: "lo-fi",
    energy: 0.3,
    valence: -0.1,
    tempo_bpm_range: [68, 82],
    descriptors: ["reflective", "melancholic", "gentle"],
    color_palette: ["#4a6fa5", "#7b9ec7"],
    ...overrides,
  };
}

/** Helper to create a default WeatherInput */
function makeWeather(overrides: Partial<WeatherInput> = {}): WeatherInput {
  return {
    condition: "rain",
    temperature_c: 14,
    humidity_pct: 80,
    wind_speed_kmh: 10,
    time_of_day: "evening",
    timestamp: "2026-03-30T20:00:00Z",
    ...overrides,
  };
}

/** Helper to create a default AgentMention */
function makeMention(overrides: Partial<AgentMention> = {}): AgentMention {
  return {
    from_agent: "TestAgent",
    from_agent_id: "abc-123",
    content: "Hey Zephyr, what do you think about the rain tonight?",
    context: "zone_chat",
    timestamp: "2026-03-30T20:05:00Z",
    ...overrides,
  };
}

describe("SocialEngine", () => {
  let registry: PromptRegistry;
  let mockLLM: MockLLMClient;
  let engine: SocialEngine;

  beforeEach(() => {
    registry = new PromptRegistry(PROMPTS_DIR);
    mockLLM = new MockLLMClient();
    engine = new SocialEngine(registry, mockLLM);
  });

  describe("successful response generation", () => {
    it("generates a non-empty response for a zone_chat mention", async () => {
      // Response generation call, then eval call returning high score
      mockLLM.setResponses(
        "The rain is composing its own lo-fi symphony tonight, gentle and unhurried.",
        "0.85",
      );

      const result = await engine.generateResponse(
        makeMention({ context: "zone_chat" }),
        makeMood(),
        makeWeather(),
      );

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("generates a non-empty response for a feed_reply mention", async () => {
      mockLLM.setResponses(
        "Every raindrop carries a melody if you listen closely enough.",
        "0.9",
      );

      const result = await engine.generateResponse(
        makeMention({ context: "feed_reply" }),
        makeMood(),
        makeWeather(),
      );

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("prompt loading and injection", () => {
    it("loads the SOC prompt from the registry", async () => {
      mockLLM.setResponses("A response.", "0.8");

      await engine.generateResponse(makeMention(), makeMood(), makeWeather());

      // The system message should contain content from the SOC system prompt
      const systemMessage = mockLLM.calls[0].messages[0];
      expect(systemMessage.role).toBe("system");
      expect(systemMessage.content).toContain("Zephyr Drift");
    });

    it("includes personality constants in the prompt", async () => {
      mockLLM.setResponses("A musical response.", "0.8");

      await engine.generateResponse(makeMention(), makeMood(), makeWeather());

      const systemMessage = mockLLM.calls[0].messages[0];
      expect(systemMessage.content).toContain(PERSONALITY.name);
      expect(systemMessage.content).toContain("Musical");
      expect(systemMessage.content).toContain("Maina");
      expect(systemMessage.content).toContain("Hermonia Vex");
    });

    it("includes mention content in the user message", async () => {
      const mentionContent = "What songs does the storm inspire?";
      mockLLM.setResponses("Thunder is nature's drum solo.", "0.75");

      await engine.generateResponse(
        makeMention({ content: mentionContent }),
        makeMood(),
        makeWeather(),
      );

      const userMessage = mockLLM.calls[0].messages[1];
      expect(userMessage.role).toBe("user");
      expect(userMessage.content).toContain(mentionContent);
    });

    it("includes mood descriptors in the user message", async () => {
      const mood = makeMood({
        descriptors: ["ethereal", "mysterious", "hushed"],
        genre: "ambient",
        energy: 0.2,
      });
      mockLLM.setResponses("The fog whispers.", "0.8");

      await engine.generateResponse(makeMention(), mood, makeWeather());

      const userMessage = mockLLM.calls[0].messages[1];
      expect(userMessage.content).toContain("ethereal");
      expect(userMessage.content).toContain("mysterious");
      expect(userMessage.content).toContain("ambient");
    });

    it("includes weather data in the user message", async () => {
      const weather = makeWeather({
        condition: "sunny",
        temperature_c: 28,
        humidity_pct: 45,
      });
      mockLLM.setResponses("Sunshine melodies!", "0.85");

      await engine.generateResponse(makeMention(), makeMood(), weather);

      const userMessage = mockLLM.calls[0].messages[1];
      expect(userMessage.content).toContain("sunny");
      expect(userMessage.content).toContain("28");
    });
  });

  describe("alignment evaluation and retry logic", () => {
    it("returns the response immediately when alignment >= 0.6 (no retry)", async () => {
      const goodResponse = "The rain paints soft chords on every rooftop.";
      mockLLM.setResponses(goodResponse, "0.8");

      const result = await engine.generateResponse(
        makeMention(),
        makeMood(),
        makeWeather(),
      );

      expect(result).toBe(goodResponse);
      // 1 generation call + 1 eval call = 2 total LLM calls
      expect(mockLLM.calls).toHaveLength(2);
    });

    it("retries when alignment < 0.6 and returns the higher-scoring response", async () => {
      const lowResponse = "Hello there.";
      const highResponse =
        "The rain drums a gentle rhythm, a lo-fi lullaby for the evening.";

      // Attempt 1: generation -> low eval score
      // Attempt 2: generation -> high eval score
      mockLLM.setResponses(
        lowResponse,   // gen 1
        "0.4",         // eval 1 (below threshold)
        highResponse,  // gen 2
        "0.8",         // eval 2 (above threshold)
      );

      const result = await engine.generateResponse(
        makeMention(),
        makeMood(),
        makeWeather(),
      );

      expect(result).toBe(highResponse);
      // 2 generation calls + 2 eval calls = 4 total
      expect(mockLLM.calls).toHaveLength(4);
    });

    it("performs max 2 retries (3 total attempts) and returns best scoring", async () => {
      const resp1 = "Response one.";
      const resp2 = "Response two, slightly better.";
      const resp3 = "Response three.";

      // All scores below threshold; resp2 has the highest score
      mockLLM.setResponses(
        resp1, "0.3",   // attempt 1: score 0.3
        resp2, "0.5",   // attempt 2: score 0.5 (best)
        resp3, "0.2",   // attempt 3: score 0.2
      );

      const result = await engine.generateResponse(
        makeMention(),
        makeMood(),
        makeWeather(),
      );

      // Should return the highest-scoring variant (resp2, score 0.5)
      expect(result).toBe(resp2);
      // 3 generation calls + 3 eval calls = 6 total
      expect(mockLLM.calls).toHaveLength(6);
    });

    it("selects the highest-scoring variant across all attempts", async () => {
      const resp1 = "Attempt one.";
      const resp2 = "Attempt two is best.";
      const resp3 = "Attempt three.";

      mockLLM.setResponses(
        resp1, "0.4",   // attempt 1
        resp2, "0.55",  // attempt 2 (highest)
        resp3, "0.3",   // attempt 3
      );

      const result = await engine.generateResponse(
        makeMention(),
        makeMood(),
        makeWeather(),
      );

      expect(result).toBe(resp2);
    });

    it("stops retrying once a response meets the threshold", async () => {
      const resp1 = "Low quality.";
      const resp2 = "This one is good enough.";

      mockLLM.setResponses(
        resp1, "0.3",  // attempt 1: below threshold
        resp2, "0.7",  // attempt 2: above threshold, stop retrying
      );

      const result = await engine.generateResponse(
        makeMention(),
        makeMood(),
        makeWeather(),
      );

      expect(result).toBe(resp2);
      // Only 2 generation + 2 eval = 4 calls (no third attempt)
      expect(mockLLM.calls).toHaveLength(4);
    });
  });

  describe("personality constants", () => {
    it("personality constants include Zephyr Drift name", () => {
      expect(PERSONALITY.name).toBe("Zephyr Drift");
    });

    it("personality constants include musical trait", () => {
      expect(PERSONALITY.coreTrait).toContain("Musical");
    });

    it("personality constants include sibling names", () => {
      expect(PERSONALITY.siblings).toContain("Maina");
      expect(PERSONALITY.siblings).toContain("Hermonia Vex");
    });
  });

  describe("eval score parsing", () => {
    it("handles non-numeric eval response gracefully (treats as 0.0)", async () => {
      mockLLM.setResponses(
        "A response.",
        "not a number",  // eval returns garbage
        "A better response.",
        "0.8",           // retry succeeds
      );

      const result = await engine.generateResponse(
        makeMention(),
        makeMood(),
        makeWeather(),
      );

      // The second response should be chosen since first scored 0.0
      expect(result).toBe("A better response.");
    });
  });
});
