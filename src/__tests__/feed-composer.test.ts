import { describe, it, expect, beforeEach } from "vitest";
import { resolve } from "node:path";
import { FeedComposer, WEATHER_EMOJI } from "../feed-composer.js";
import { PromptRegistry } from "../prompt-registry.js";
import { MockLLMClient } from "../llm-client.js";
import type {
  WeatherInput,
  MoodVector,
  TrackResult,
  WeatherCondition,
} from "../types.js";

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

function makeTrack(overrides: Partial<TrackResult> = {}): TrackResult {
  return {
    task_id: "task-123",
    artifact_id: "artifact-456",
    title: "Rain-Washed Reverie",
    public_url: "https://cdn.example.com/track.mp3",
    status: "succeeded",
    ...overrides,
  };
}

/** Build a simulated LLM narrative response */
function makeLLMNarrative(
  title: string = "Slow Hymns for a Silver Sky",
  narrative: string = "The rain taps its gentle morse code on the windowpane, each drop a note in an unwritten symphony. Afternoon light filters through silver curtains of water, casting the world in muted tones. The city hums beneath its liquid veil, and somewhere in the distance, a melody begins to form from the rhythm of the storm.",
): string {
  return `${title}\n\n${narrative}`;
}

describe("FeedComposer", () => {
  let registry: PromptRegistry;
  let mockLLM: MockLLMClient;
  let composer: FeedComposer;

  beforeEach(() => {
    registry = new PromptRegistry(PROMPTS_DIR);
    mockLLM = new MockLLMClient();
    composer = new FeedComposer(registry, mockLLM);
  });

  describe("emoji mapping", () => {
    const emojiMap: Record<WeatherCondition, string> = {
      rain: "\u{1F327}\uFE0F",
      sunny: "\u2600\uFE0F",
      stormy: "\u26C8\uFE0F",
      cloudy: "\u2601\uFE0F",
      snowy: "\u2744\uFE0F",
      foggy: "\u{1F32B}\uFE0F",
      windy: "\u{1F4A8}",
      clear_night: "\u{1F319}",
    };

    for (const [condition, emoji] of Object.entries(emojiMap)) {
      it(`maps ${condition} to correct emoji`, async () => {
        mockLLM.setResponses(makeLLMNarrative());
        const weather = makeWeather({
          condition: condition as WeatherCondition,
        });
        const result = await composer.composePost(
          weather,
          makeMood(),
          makeTrack(),
        );
        expect(result.content).toContain(emoji);
      });
    }

    it("exports WEATHER_EMOJI with all 8 conditions", () => {
      expect(Object.keys(WEATHER_EMOJI)).toHaveLength(8);
      for (const condition of Object.keys(emojiMap)) {
        expect(WEATHER_EMOJI[condition as WeatherCondition]).toBe(
          emojiMap[condition as WeatherCondition],
        );
      }
    });
  });

  describe("post structure", () => {
    it("contains Now playing block with track info", async () => {
      mockLLM.setResponses(makeLLMNarrative());
      const result = await composer.composePost(
        makeWeather(),
        makeMood(),
        makeTrack({ title: "Midnight Drizzle" }),
      );
      expect(result.content).toContain("Now playing: Midnight Drizzle");
      expect(result.content).toContain("lo-fi");
      expect(result.content).toContain("75 BPM");
    });

    it("contains weather summary", async () => {
      mockLLM.setResponses(makeLLMNarrative());
      const weather = makeWeather({
        condition: "sunny",
        temperature_c: 25,
        humidity_pct: 45,
      });
      const result = await composer.composePost(
        weather,
        makeMood(),
        makeTrack(),
      );
      expect(result.content).toContain("Weather: sunny, 25C, 45% humidity");
    });

    it("contains mood descriptors", async () => {
      mockLLM.setResponses(makeLLMNarrative());
      const mood = makeMood({
        descriptors: ["calm", "ethereal", "dreamy"],
      });
      const result = await composer.composePost(
        makeWeather(),
        mood,
        makeTrack(),
      );
      expect(result.content).toContain("Mood: calm, ethereal, dreamy");
    });

    it("has post_type set to thought", async () => {
      mockLLM.setResponses(makeLLMNarrative());
      const result = await composer.composePost(
        makeWeather(),
        makeMood(),
        makeTrack(),
      );
      expect(result.post_type).toBe("thought");
    });

    it("contains a narrative section", async () => {
      mockLLM.setResponses(makeLLMNarrative());
      const result = await composer.composePost(
        makeWeather(),
        makeMood(),
        makeTrack(),
      );
      // Narrative should be between the title line and "Now playing" line
      expect(result.content).toContain("rain taps");
    });

    it("formats Now playing line correctly", async () => {
      mockLLM.setResponses(makeLLMNarrative());
      const mood = makeMood({
        genre: "jazz",
        tempo_bpm_range: [80, 100],
      });
      const track = makeTrack({ title: "Velvet Nocturne" });
      const result = await composer.composePost(makeWeather(), mood, track);
      expect(result.content).toContain(
        "Now playing: Velvet Nocturne | jazz | 90 BPM",
      );
    });
  });

  describe("truncation", () => {
    it("does not truncate posts under 500 characters", async () => {
      mockLLM.setResponses(makeLLMNarrative("Short Title", "A brief note."));
      const result = await composer.composePost(
        makeWeather(),
        makeMood(),
        makeTrack(),
      );
      expect(result.content.length).toBeLessThanOrEqual(500);
      expect(result.content).not.toContain("...");
    });

    it("truncates posts exceeding 500 characters with ellipsis", async () => {
      const longNarrative =
        "The rain descends like a curtain of silver threads upon the sprawling cityscape below. ".repeat(
          10,
        );
      mockLLM.setResponses(makeLLMNarrative("A Lengthy Opus", longNarrative));
      const result = await composer.composePost(
        makeWeather(),
        makeMood(),
        makeTrack(),
      );
      expect(result.content.length).toBeLessThanOrEqual(500);
      expect(result.content).toContain("...");
    });

    it("never truncates metadata lines", async () => {
      const longNarrative =
        "Every raindrop carries a symphony within it, and tonight the city is drenched in a thousand unheard melodies weaving through the streets and alleyways like phantom orchestras. ".repeat(
          8,
        );
      mockLLM.setResponses(
        makeLLMNarrative("The Endless Downpour", longNarrative),
      );
      const track = makeTrack({ title: "Storm Serenade" });
      const mood = makeMood({
        genre: "classical",
        descriptors: ["dramatic", "intense", "sweeping"],
        tempo_bpm_range: [100, 120],
      });
      const weather = makeWeather({
        condition: "stormy",
        temperature_c: 12,
        humidity_pct: 92,
      });

      const result = await composer.composePost(weather, mood, track);

      expect(result.content.length).toBeLessThanOrEqual(500);
      expect(result.content).toContain(
        "Now playing: Storm Serenade | classical | 110 BPM",
      );
      expect(result.content).toContain(
        "Weather: stormy, 12C, 92% humidity",
      );
      expect(result.content).toContain(
        "Mood: dramatic, intense, sweeping",
      );
    });
  });

  describe("LLM interaction", () => {
    it("calls LLM with system and user messages", async () => {
      mockLLM.setResponses(makeLLMNarrative());
      await composer.composePost(makeWeather(), makeMood(), makeTrack());

      expect(mockLLM.calls).toHaveLength(1);
      const call = mockLLM.calls[0];
      expect(call.messages[0].role).toBe("system");
      expect(call.messages[1].role).toBe("user");
    });

    it("injects weather, mood, and track data into template", async () => {
      mockLLM.setResponses(makeLLMNarrative());
      const weather = makeWeather({ condition: "snowy", temperature_c: -5 });
      const mood = makeMood({ genre: "classical" });
      const track = makeTrack({ title: "Frozen Aria" });

      await composer.composePost(weather, mood, track);

      const userMessage = mockLLM.calls[0].messages[1].content;
      expect(userMessage).toContain("snowy");
      expect(userMessage).toContain("-5");
      expect(userMessage).toContain("classical");
      expect(userMessage).toContain("Frozen Aria");
    });
  });
});
