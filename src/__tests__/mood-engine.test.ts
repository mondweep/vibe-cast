import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolve } from "node:path";
import { MoodEngine } from "../mood-engine.js";
import { PromptRegistry } from "../prompt-registry.js";
import { MockLLMClient } from "../llm-client.js";
import type { WeatherInput, MoodVector } from "../types.js";

const PROMPTS_DIR = resolve(__dirname, "..", "..", "docs", "prompts");

/** Helper to create a valid MoodVector JSON string */
function makeMoodJSON(overrides: Partial<MoodVector> = {}): string {
  const base: MoodVector = {
    genre: "lo-fi",
    energy: 0.35,
    valence: -0.1,
    tempo_bpm_range: [68, 82],
    descriptors: ["reflective", "melancholic", "gentle"],
    color_palette: ["#4a6fa5", "#7b9ec7", "#a3b8d4"],
    ...overrides,
  };
  return JSON.stringify(base);
}

/** Helper to create a WeatherInput */
function makeWeather(overrides: Partial<WeatherInput> = {}): WeatherInput {
  return {
    condition: "rain",
    temperature_c: 18,
    humidity_pct: 78,
    wind_speed_kmh: 10,
    time_of_day: "afternoon",
    timestamp: "2026-03-30T14:00:00Z",
    ...overrides,
  };
}

describe("MoodEngine", () => {
  let registry: PromptRegistry;
  let mockLLM: MockLLMClient;
  let engine: MoodEngine;

  beforeEach(() => {
    registry = new PromptRegistry(PROMPTS_DIR);
    mockLLM = new MockLLMClient();
    engine = new MoodEngine(registry, mockLLM);
  });

  describe("weather-to-mood mapping", () => {
    it("maps rain to lo-fi/jazz with appropriate ranges", async () => {
      const moodResponse: MoodVector = {
        genre: "lo-fi",
        energy: 0.35,
        valence: -0.1,
        tempo_bpm_range: [68, 82],
        descriptors: ["reflective", "melancholic", "gentle"],
        color_palette: ["#4a6fa5", "#7b9ec7", "#a3b8d4"],
      };
      mockLLM.setResponses(JSON.stringify(moodResponse));

      const result = await engine.mapWeatherToMood(makeWeather());

      expect(["lo-fi", "jazz"]).toContain(result.genre);
      expect(result.energy).toBeGreaterThanOrEqual(0.2);
      expect(result.energy).toBeLessThanOrEqual(0.5);
      expect(result.valence).toBeGreaterThanOrEqual(-0.3);
      expect(result.valence).toBeLessThanOrEqual(0.3);
    });

    it("maps sunny to electronic with upbeat ranges", async () => {
      const moodResponse: MoodVector = {
        genre: "electronic",
        energy: 0.78,
        valence: 0.72,
        tempo_bpm_range: [118, 132],
        descriptors: ["upbeat", "radiant", "energetic"],
        color_palette: ["#f5a623", "#f7d354"],
      };
      mockLLM.setResponses(JSON.stringify(moodResponse));

      const weather = makeWeather({
        condition: "sunny",
        temperature_c: 28,
        humidity_pct: 40,
        time_of_day: "morning",
      });
      const result = await engine.mapWeatherToMood(weather);

      expect(["electronic"]).toContain(result.genre);
      expect(result.energy).toBeGreaterThanOrEqual(0.6);
      expect(result.energy).toBeLessThanOrEqual(0.9);
      expect(result.valence).toBeGreaterThanOrEqual(0.4);
      expect(result.valence).toBeLessThanOrEqual(1.0);
    });

    it("maps stormy to rock/classical with intense ranges", async () => {
      const moodResponse: MoodVector = {
        genre: "rock",
        energy: 0.88,
        valence: -0.45,
        tempo_bpm_range: [135, 155],
        descriptors: ["intense", "turbulent", "dramatic", "raw"],
        color_palette: ["#2c2c3a", "#5a3e7a", "#8b4e9e"],
      };
      mockLLM.setResponses(JSON.stringify(moodResponse));

      const weather = makeWeather({
        condition: "stormy",
        temperature_c: 12,
        humidity_pct: 92,
        wind_speed_kmh: 55,
        time_of_day: "evening",
      });
      const result = await engine.mapWeatherToMood(weather);

      expect(["rock", "classical"]).toContain(result.genre);
      expect(result.energy).toBeGreaterThanOrEqual(0.7);
      expect(result.energy).toBeLessThanOrEqual(1.0);
      // valence: base -0.45, humidity modifier -0.1 = -0.55
      expect(result.valence).toBeGreaterThanOrEqual(-0.8);
      expect(result.valence).toBeLessThanOrEqual(-0.2);
    });

    it("maps cloudy to ambient/folk with mellow ranges", async () => {
      const moodResponse: MoodVector = {
        genre: "ambient",
        energy: 0.3,
        valence: 0.1,
        tempo_bpm_range: [75, 95],
        descriptors: ["calm", "reflective", "soft"],
        color_palette: ["#b0bec5", "#90a4ae"],
      };
      mockLLM.setResponses(JSON.stringify(moodResponse));

      const weather = makeWeather({
        condition: "cloudy",
        temperature_c: 20,
        humidity_pct: 55,
        time_of_day: "afternoon",
      });
      const result = await engine.mapWeatherToMood(weather);

      expect(["ambient", "folk"]).toContain(result.genre);
      expect(result.energy).toBeGreaterThanOrEqual(0.2);
      expect(result.energy).toBeLessThanOrEqual(0.4);
      expect(result.valence).toBeGreaterThanOrEqual(-0.2);
      expect(result.valence).toBeLessThanOrEqual(0.3);
    });

    it("maps snowy to classical/ambient with serene ranges", async () => {
      const moodResponse: MoodVector = {
        genre: "classical",
        energy: 0.25,
        valence: 0.3,
        tempo_bpm_range: [55, 75],
        descriptors: ["serene", "crystalline", "hushed"],
        color_palette: ["#e0e7ee", "#c5d5e4", "#a8c0d8"],
      };
      mockLLM.setResponses(JSON.stringify(moodResponse));

      const weather = makeWeather({
        condition: "snowy",
        temperature_c: -5,
        humidity_pct: 70,
        time_of_day: "morning",
      });
      const result = await engine.mapWeatherToMood(weather);

      expect(["classical", "ambient"]).toContain(result.genre);
      expect(result.energy).toBeGreaterThanOrEqual(0.1);
      expect(result.energy).toBeLessThanOrEqual(0.4);
      expect(result.valence).toBeGreaterThanOrEqual(0.0);
      expect(result.valence).toBeLessThanOrEqual(0.5);
    });

    it("maps foggy to ambient/electronic with mysterious ranges", async () => {
      const moodResponse: MoodVector = {
        genre: "ambient",
        energy: 0.2,
        valence: -0.1,
        tempo_bpm_range: [60, 80],
        descriptors: ["mysterious", "ethereal", "hazy"],
        color_palette: ["#6b7b8d", "#8a9bab"],
      };
      mockLLM.setResponses(JSON.stringify(moodResponse));

      const weather = makeWeather({
        condition: "foggy",
        temperature_c: 10,
        humidity_pct: 90,
        wind_speed_kmh: 3,
        time_of_day: "night",
      });
      const result = await engine.mapWeatherToMood(weather);

      expect(["ambient", "electronic"]).toContain(result.genre);
      expect(result.energy).toBeGreaterThanOrEqual(0.1);
      expect(result.energy).toBeLessThanOrEqual(0.3);
      // valence: base -0.1, humidity modifier -0.1 = -0.2
      expect(result.valence).toBeGreaterThanOrEqual(-0.4);
      expect(result.valence).toBeLessThanOrEqual(0.1);
    });

    it("maps windy to folk/rock with dynamic ranges", async () => {
      const moodResponse: MoodVector = {
        genre: "folk",
        energy: 0.65,
        valence: 0.3,
        tempo_bpm_range: [105, 125],
        descriptors: ["free", "restless", "spirited"],
        color_palette: ["#a3c1ad", "#7ba899"],
      };
      mockLLM.setResponses(JSON.stringify(moodResponse));

      const weather = makeWeather({
        condition: "windy",
        temperature_c: 22,
        humidity_pct: 45,
        time_of_day: "afternoon",
      });
      const result = await engine.mapWeatherToMood(weather);

      expect(["folk", "rock"]).toContain(result.genre);
      expect(result.energy).toBeGreaterThanOrEqual(0.5);
      expect(result.energy).toBeLessThanOrEqual(0.8);
      expect(result.valence).toBeGreaterThanOrEqual(-0.1);
      expect(result.valence).toBeLessThanOrEqual(0.6);
    });

    it("maps clear_night to jazz/lo-fi with nocturnal ranges", async () => {
      const moodResponse: MoodVector = {
        genre: "jazz",
        energy: 0.3,
        valence: 0.35,
        tempo_bpm_range: [72, 88],
        descriptors: ["contemplative", "smooth", "nocturnal"],
        color_palette: ["#1a1a2e", "#16213e", "#0f3460"],
      };
      mockLLM.setResponses(JSON.stringify(moodResponse));

      const weather = makeWeather({
        condition: "clear_night",
        temperature_c: 15,
        humidity_pct: 55,
        time_of_day: "night",
      });
      const result = await engine.mapWeatherToMood(weather);

      expect(["jazz", "lo-fi"]).toContain(result.genre);
      expect(result.energy).toBeGreaterThanOrEqual(0.2);
      expect(result.energy).toBeLessThanOrEqual(0.5);
      expect(result.valence).toBeGreaterThanOrEqual(0.1);
      expect(result.valence).toBeLessThanOrEqual(0.6);
    });
  });

  describe("clamping", () => {
    it("clamps energy above 1.0 to 1.0", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockLLM.setResponses(makeMoodJSON({ energy: 1.5 }));

      const result = await engine.mapWeatherToMood(makeWeather());

      expect(result.energy).toBe(1.0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Energy 1.5 out of range"),
      );
      warnSpy.mockRestore();
    });

    it("clamps valence below -1.0 to -1.0", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockLLM.setResponses(makeMoodJSON({ valence: -2.0 }));

      const result = await engine.mapWeatherToMood(makeWeather());

      expect(result.valence).toBe(-1.0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Valence -2 out of range"),
      );
      warnSpy.mockRestore();
    });

    it("clamps energy below 0.0 to 0.0", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockLLM.setResponses(makeMoodJSON({ energy: -0.1 }));

      const result = await engine.mapWeatherToMood(makeWeather());

      expect(result.energy).toBe(0.0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Energy -0.1 out of range"),
      );
      warnSpy.mockRestore();
    });
  });

  describe("modifiers", () => {
    it("applies temperature modifier: temp > 30C increases energy by 0.1", async () => {
      mockLLM.setResponses(makeMoodJSON({ energy: 0.8 }));

      const weather = makeWeather({
        condition: "sunny",
        temperature_c: 35,
        humidity_pct: 40,
      });
      const result = await engine.mapWeatherToMood(weather);

      expect(result.energy).toBeCloseTo(0.9, 5);
    });

    it("applies humidity modifier: humidity > 80% decreases valence by 0.1", async () => {
      mockLLM.setResponses(makeMoodJSON({ valence: 0.0 }));

      const weather = makeWeather({
        condition: "rain",
        humidity_pct: 90,
      });
      const result = await engine.mapWeatherToMood(weather);

      expect(result.valence).toBeCloseTo(-0.1, 5);
    });

    it("applies both modifiers and clamps", async () => {
      mockLLM.setResponses(makeMoodJSON({ energy: 0.95, valence: -0.95 }));

      const weather = makeWeather({
        condition: "stormy",
        temperature_c: 35,
        humidity_pct: 92,
      });
      const result = await engine.mapWeatherToMood(weather);

      // energy: 0.95 + 0.1 = 1.05, clamped to 1.0
      expect(result.energy).toBe(1.0);
      // valence: -0.95 - 0.1 = -1.05, clamped to -1.0
      expect(result.valence).toBe(-1.0);
    });

    it("does not apply temperature modifier when temp <= 30C", async () => {
      mockLLM.setResponses(makeMoodJSON({ energy: 0.5 }));

      const weather = makeWeather({ temperature_c: 30 });
      const result = await engine.mapWeatherToMood(weather);

      expect(result.energy).toBeCloseTo(0.5, 5);
    });

    it("does not apply humidity modifier when humidity <= 80%", async () => {
      mockLLM.setResponses(makeMoodJSON({ valence: 0.0 }));

      const weather = makeWeather({ humidity_pct: 80 });
      const result = await engine.mapWeatherToMood(weather);

      expect(result.valence).toBeCloseTo(0.0, 5);
    });
  });

  describe("error handling", () => {
    it("throws descriptive error on invalid JSON from LLM", async () => {
      // Both initial and retry return invalid JSON
      mockLLM.setResponses("not valid json", "still not json");

      await expect(engine.mapWeatherToMood(makeWeather())).rejects.toThrow(
        "Failed to parse LLM response as JSON",
      );
    });

    it("retries with temperature=0 on invalid JSON", async () => {
      // First returns invalid, retry returns valid
      mockLLM.setResponses("not json", makeMoodJSON());

      const result = await engine.mapWeatherToMood(makeWeather());

      expect(result.genre).toBe("lo-fi");
      // Verify the retry call used temperature=0
      expect(mockLLM.calls).toHaveLength(2);
      expect(mockLLM.calls[1].options?.temperature).toBe(0);
    });

    it("throws error on missing fields in LLM response", async () => {
      mockLLM.setResponses(JSON.stringify({ genre: "lo-fi" }));

      await expect(engine.mapWeatherToMood(makeWeather())).rejects.toThrow(
        'Missing or invalid "energy"',
      );
    });

    it("throws error when genre is missing", async () => {
      mockLLM.setResponses(
        JSON.stringify({
          energy: 0.5,
          valence: 0.0,
          tempo_bpm_range: [60, 90],
          descriptors: ["calm", "soft"],
          color_palette: ["#aabbcc", "#ddeeff"],
        }),
      );

      await expect(engine.mapWeatherToMood(makeWeather())).rejects.toThrow(
        "Invalid genre",
      );
    });

    it("returns previous mood when invalid genre is received after a successful call", async () => {
      // First call succeeds
      mockLLM.setResponses(makeMoodJSON({ genre: "jazz", energy: 0.4 }));
      await engine.mapWeatherToMood(makeWeather());

      // Second call returns invalid genre
      mockLLM.setResponses(
        JSON.stringify({
          genre: "trip-hop",
          energy: 0.5,
          valence: 0.0,
          tempo_bpm_range: [60, 90],
          descriptors: ["calm", "soft"],
          color_palette: ["#aabbcc", "#ddeeff"],
        }),
      );

      const result = await engine.mapWeatherToMood(makeWeather());
      expect(result.genre).toBe("jazz");
    });

    it("handles LLM timeout with retry then fallback", async () => {
      // First call succeeds to set a previous mood
      mockLLM.setResponses(makeMoodJSON({ genre: "jazz" }));
      await engine.mapWeatherToMood(makeWeather());

      // Next calls both timeout
      mockLLM.setResponses("__TIMEOUT__", "__TIMEOUT__");

      const result = await engine.mapWeatherToMood(makeWeather());
      // Should fall back to previous mood
      expect(result.genre).toBe("jazz");
    });

    it("throws when LLM times out and no previous mood exists", async () => {
      mockLLM.setResponses("__TIMEOUT__", "__TIMEOUT__");

      await expect(engine.mapWeatherToMood(makeWeather())).rejects.toThrow(
        "LLM call failed and no previous mood available",
      );
    });
  });

  describe("getCurrentMood", () => {
    it("returns null before any mapping", () => {
      expect(engine.getCurrentMood()).toBeNull();
    });

    it("returns the last successful mood after mapping", async () => {
      mockLLM.setResponses(makeMoodJSON({ genre: "jazz", energy: 0.4 }));

      await engine.mapWeatherToMood(makeWeather());

      const current = engine.getCurrentMood();
      expect(current).not.toBeNull();
      expect(current!.genre).toBe("jazz");
      expect(current!.energy).toBe(0.4);
    });
  });

  describe("prompt template injection", () => {
    it("injects weather data into template placeholders", async () => {
      mockLLM.setResponses(makeMoodJSON());

      const weather = makeWeather({
        condition: "sunny",
        temperature_c: 28,
        humidity_pct: 40,
        wind_speed_kmh: 8,
        time_of_day: "morning",
      });

      await engine.mapWeatherToMood(weather);

      // Check the last user message in the calls
      const lastCall = mockLLM.calls[0];
      const userMessage = lastCall.messages[lastCall.messages.length - 1];

      expect(userMessage.role).toBe("user");
      expect(userMessage.content).toContain("sunny");
      expect(userMessage.content).toContain("28");
      expect(userMessage.content).toContain("40");
      expect(userMessage.content).toContain("8");
      expect(userMessage.content).toContain("morning");
    });

    it("includes system prompt as the first message", async () => {
      mockLLM.setResponses(makeMoodJSON());

      await engine.mapWeatherToMood(makeWeather());

      const firstMessage = mockLLM.calls[0].messages[0];
      expect(firstMessage.role).toBe("system");
      expect(firstMessage.content).toContain("mood engine");
    });

    it("includes few-shot examples as user/assistant pairs", async () => {
      mockLLM.setResponses(makeMoodJSON());

      await engine.mapWeatherToMood(makeWeather());

      const messages = mockLLM.calls[0].messages;
      // system(1) + 4 few-shot pairs(8) + user(1) = 10
      expect(messages).toHaveLength(10);

      // Check that few-shot examples alternate user/assistant
      expect(messages[1].role).toBe("user");
      expect(messages[2].role).toBe("assistant");
      expect(messages[3].role).toBe("user");
      expect(messages[4].role).toBe("assistant");

      // Verify few-shot assistant messages are valid JSON
      const firstAssistant = JSON.parse(messages[2].content);
      expect(firstAssistant).toHaveProperty("genre");
      expect(firstAssistant).toHaveProperty("energy");
    });
  });
});
