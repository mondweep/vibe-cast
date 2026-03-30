import { describe, it, expect, beforeEach } from "vitest";
import { resolve } from "node:path";
import { CompositionGenerator, getEnergyDescriptor } from "../composition-generator.js";
import { PromptRegistry } from "../prompt-registry.js";
import { MockLLMClient } from "../llm-client.js";
import type { WeatherInput, MoodVector, Genre } from "../types.js";

const PROMPTS_DIR = resolve(__dirname, "..", "..", "docs", "prompts");

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

function makeMood(overrides: Partial<MoodVector> = {}): MoodVector {
  return {
    genre: "lo-fi",
    energy: 0.35,
    valence: -0.1,
    tempo_bpm_range: [68, 82],
    descriptors: ["reflective", "melancholic", "gentle"],
    color_palette: ["#4a6fa5", "#7b9ec7"],
    ...overrides,
  };
}

/** Simulated LLM response for composition prompt generation */
function makeLLMResponse(title: string = "Rain-Washed Reverie"): string {
  return `${title}
Compose a lo-fi track at 75 BPM with moderate energy.
Mood: reflective, melancholic, gentle.
Inspired by: raindrops tracing silver lines down the window as afternoon light fades.
Instrumentation hints: vinyl crackle, muted piano, soft drums, tape hiss.
Duration: 2-4 minutes.`;
}

describe("CompositionGenerator", () => {
  let registry: PromptRegistry;
  let mockLLM: MockLLMClient;
  let generator: CompositionGenerator;

  beforeEach(() => {
    registry = new PromptRegistry(PROMPTS_DIR);
    mockLLM = new MockLLMClient();
    generator = new CompositionGenerator(registry, mockLLM);
  });

  describe("genre instrumentation mapping", () => {
    const genreInstruments: Record<Genre, string[]> = {
      "lo-fi": ["vinyl crackle", "muted piano", "soft drums", "tape hiss"],
      jazz: ["piano", "upright bass", "brushed drums", "saxophone"],
      electronic: ["synth pads", "arpeggiated sequences", "kick drum", "hi-hats"],
      classical: ["strings", "piano", "woodwinds", "gentle percussion"],
      ambient: ["pad layers", "field recordings", "reverb swells", "drones"],
      rock: ["electric guitar", "bass", "drums", "distortion"],
      folk: ["acoustic guitar", "violin", "hand drums", "flute"],
    };

    for (const [genre, instruments] of Object.entries(genreInstruments)) {
      it(`maps ${genre} to correct instruments`, async () => {
        mockLLM.setResponses(makeLLMResponse(`${genre} title`));
        const mood = makeMood({ genre: genre as Genre });
        const result = await generator.generatePrompt(mood, makeWeather());

        for (const instrument of instruments) {
          expect(result.prompt).toContain(instrument);
        }
      });
    }
  });

  describe("tempo calculation", () => {
    it("calculates tempo as midpoint of tempo_bpm_range [60, 90]", async () => {
      mockLLM.setResponses(makeLLMResponse());
      const mood = makeMood({ tempo_bpm_range: [60, 90] });
      const result = await generator.generatePrompt(mood, makeWeather());
      expect(result.tempo_bpm).toBe(75);
    });

    it("calculates tempo as midpoint of tempo_bpm_range [100, 130]", async () => {
      mockLLM.setResponses(makeLLMResponse());
      const mood = makeMood({ tempo_bpm_range: [100, 130] });
      const result = await generator.generatePrompt(mood, makeWeather());
      expect(result.tempo_bpm).toBe(115);
    });

    it("rounds midpoint for odd ranges [61, 90]", async () => {
      mockLLM.setResponses(makeLLMResponse());
      const mood = makeMood({ tempo_bpm_range: [61, 90] });
      const result = await generator.generatePrompt(mood, makeWeather());
      expect(result.tempo_bpm).toBe(76);
    });
  });

  describe("energy descriptors", () => {
    it("maps energy 0.2 to low", () => {
      expect(getEnergyDescriptor(0.2)).toBe("low");
    });

    it("maps energy 0.0 to low", () => {
      expect(getEnergyDescriptor(0.0)).toBe("low");
    });

    it("maps energy 0.45 to moderate", () => {
      expect(getEnergyDescriptor(0.45)).toBe("moderate");
    });

    it("maps energy 0.75 to high", () => {
      expect(getEnergyDescriptor(0.75)).toBe("high");
    });

    it("maps energy 0.95 to intense", () => {
      expect(getEnergyDescriptor(0.95)).toBe("intense");
    });

    it("maps energy 1.0 to intense", () => {
      expect(getEnergyDescriptor(1.0)).toBe("intense");
    });

    it("includes energy descriptor in prompt text", async () => {
      mockLLM.setResponses(makeLLMResponse());
      const mood = makeMood({ energy: 0.75 });
      const result = await generator.generatePrompt(mood, makeWeather());
      expect(result.prompt).toContain("high energy");
    });
  });

  describe("prompt format", () => {
    it("contains all required elements", async () => {
      mockLLM.setResponses(makeLLMResponse());
      const mood = makeMood();
      const result = await generator.generatePrompt(mood, makeWeather());

      expect(result.prompt).toContain("Compose a lo-fi track");
      expect(result.prompt).toContain("75 BPM");
      expect(result.prompt).toContain("Mood: reflective, melancholic, gentle");
      expect(result.prompt).toContain("Inspired by:");
      expect(result.prompt).toContain("Instrumentation hints:");
      expect(result.prompt).toContain("Duration: 2-4 minutes");
    });

    it("returns correct genre in result", async () => {
      mockLLM.setResponses(makeLLMResponse());
      const mood = makeMood({ genre: "jazz" });
      const result = await generator.generatePrompt(mood, makeWeather());
      expect(result.genre).toBe("jazz");
    });
  });

  describe("title generation", () => {
    it("extracts title from LLM response", async () => {
      mockLLM.setResponses(makeLLMResponse("Midnight Rainfall Serenade"));
      const result = await generator.generatePrompt(makeMood(), makeWeather());
      expect(result.title).toBe("Midnight Rainfall Serenade");
    });

    it("generates fallback title when LLM provides no clear title", async () => {
      mockLLM.setResponses(
        "Compose a lo-fi track at 75 BPM with moderate energy.",
      );
      const result = await generator.generatePrompt(
        makeMood({ descriptors: ["calm", "soft"] }),
        makeWeather({ condition: "rain" }),
      );
      // Fallback: first descriptor + condition
      expect(result.title).toBe("Calm rain");
    });
  });

  describe("LLM interaction", () => {
    it("calls LLM with system and user messages", async () => {
      mockLLM.setResponses(makeLLMResponse());
      await generator.generatePrompt(makeMood(), makeWeather());

      expect(mockLLM.calls).toHaveLength(1);
      const call = mockLLM.calls[0];
      expect(call.messages[0].role).toBe("system");
      expect(call.messages[1].role).toBe("user");
    });

    it("injects mood and weather into user template", async () => {
      mockLLM.setResponses(makeLLMResponse());
      const weather = makeWeather({ condition: "sunny", temperature_c: 30 });
      const mood = makeMood({ genre: "electronic", energy: 0.8 });

      await generator.generatePrompt(mood, weather);

      const userMessage = mockLLM.calls[0].messages[1].content;
      expect(userMessage).toContain("sunny");
      expect(userMessage).toContain("30");
      expect(userMessage).toContain("electronic");
      expect(userMessage).toContain("0.8");
    });

    it("sets timeout to 10000ms", async () => {
      mockLLM.setResponses(makeLLMResponse());
      await generator.generatePrompt(makeMood(), makeWeather());
      expect(mockLLM.calls[0].options?.timeout).toBe(10000);
    });
  });
});
