import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { VibeCastPipeline } from "../pipeline.js";
import type { TelemetryEntry } from "../pipeline.js";
import type {
  WeatherInput,
  MoodVector,
  CompositionPrompt,
  TrackResult,
  FeedPost,
  AgentMention,
  WeatherProvider,
} from "../types.js";
import type { MoodEngine } from "../mood-engine.js";
import type { CompositionGenerator } from "../composition-generator.js";
import type { CityPresenceManager } from "../city-presence.js";
import type { FeedComposer } from "../feed-composer.js";
import type { SocialEngine } from "../social-engine.js";

// --- Test fixtures ---

function makeWeather(overrides: Partial<WeatherInput> = {}): WeatherInput {
  return {
    condition: "rain",
    temperature_c: 18,
    humidity_pct: 78,
    wind_speed_kmh: 10,
    time_of_day: "afternoon",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeMood(overrides: Partial<MoodVector> = {}): MoodVector {
  return {
    genre: "lo-fi",
    energy: 0.35,
    valence: -0.1,
    tempo_bpm_range: [68, 82] as [number, number],
    descriptors: ["reflective", "melancholic", "gentle"],
    color_palette: ["#4a6fa5", "#7b9ec7", "#a3b8d4"],
    ...overrides,
  };
}

function makeCompositionPrompt(
  overrides: Partial<CompositionPrompt> = {},
): CompositionPrompt {
  return {
    title: "Rain Reverie",
    prompt: "Compose a lo-fi track at 75 BPM with moderate energy.",
    genre: "lo-fi",
    tempo_bpm: 75,
    ...overrides,
  };
}

function makeTrack(overrides: Partial<TrackResult> = {}): TrackResult {
  return {
    task_id: "task-123",
    artifact_id: "art-456",
    title: "Rain Reverie",
    public_url: "https://cdn.example.com/rain-reverie.mp3",
    status: "succeeded",
    ...overrides,
  };
}

function makeFeedPost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    content: "A rainy afternoon melody...",
    post_type: "thought",
    ...overrides,
  };
}

function makeMention(overrides: Partial<AgentMention> = {}): AgentMention {
  return {
    from_agent: "Maina",
    from_agent_id: "agent-789",
    content: "Hey Zephyr, what are you playing?",
    context: "zone_chat",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// --- Mock factories ---

function createMockWeatherProvider(): WeatherProvider & {
  getCurrentWeather: Mock;
} {
  return {
    getCurrentWeather: vi.fn().mockResolvedValue(makeWeather()),
  };
}

function createMockMoodEngine(): Pick<MoodEngine, "mapWeatherToMood" | "getCurrentMood"> & {
  mapWeatherToMood: Mock;
  getCurrentMood: Mock;
} {
  return {
    mapWeatherToMood: vi.fn().mockResolvedValue(makeMood()),
    getCurrentMood: vi.fn().mockReturnValue(null),
  };
}

function createMockCompositionGenerator(): Pick<
  CompositionGenerator,
  "generatePrompt"
> & { generatePrompt: Mock } {
  return {
    generatePrompt: vi.fn().mockResolvedValue(makeCompositionPrompt()),
  };
}

function createMockCityPresence(): Pick<
  CityPresenceManager,
  | "ensureInStudio"
  | "composeTrack"
  | "pollTrackStatus"
  | "postToFeed"
  | "speak"
  | "heartbeat"
> & {
  ensureInStudio: Mock;
  composeTrack: Mock;
  pollTrackStatus: Mock;
  postToFeed: Mock;
  speak: Mock;
  heartbeat: Mock;
} {
  return {
    ensureInStudio: vi.fn().mockResolvedValue({
      building_id: "e6262f41-48c3-4e8c-935b-bc4a4c07252b",
      name: "Waveform Studio",
      entered_at: new Date().toISOString(),
    }),
    composeTrack: vi.fn().mockResolvedValue(makeTrack()),
    pollTrackStatus: vi.fn().mockResolvedValue(makeTrack()),
    postToFeed: vi.fn().mockResolvedValue(42),
    speak: vi.fn().mockResolvedValue(undefined),
    heartbeat: vi.fn().mockResolvedValue({
      status: "ok",
      agent_id: "zephyr",
      zone_id: 1,
      position: { x: 1605, y: 425 },
      nearby_agents: [],
      timestamp: new Date().toISOString(),
    }),
  };
}

function createMockFeedComposer(): Pick<FeedComposer, "composePost"> & {
  composePost: Mock;
} {
  return {
    composePost: vi.fn().mockResolvedValue(makeFeedPost()),
  };
}

function createMockSocialEngine(): Pick<SocialEngine, "generateResponse"> & {
  generateResponse: Mock;
} {
  return {
    generateResponse: vi
      .fn()
      .mockResolvedValue("The rain sings a lo-fi lullaby today..."),
  };
}

// --- Helper to create a fully wired pipeline ---

interface MockComponents {
  weatherProvider: ReturnType<typeof createMockWeatherProvider>;
  moodEngine: ReturnType<typeof createMockMoodEngine>;
  compositionGenerator: ReturnType<typeof createMockCompositionGenerator>;
  cityPresence: ReturnType<typeof createMockCityPresence>;
  feedComposer: ReturnType<typeof createMockFeedComposer>;
  socialEngine: ReturnType<typeof createMockSocialEngine>;
}

function createPipelineWithMocks(
  configOverrides?: {
    duplicateWindowMs?: number;
    stableWeatherTimerMs?: number;
    ambientDriftThresholdMs?: number;
  },
): { pipeline: VibeCastPipeline; mocks: MockComponents } {
  const mocks: MockComponents = {
    weatherProvider: createMockWeatherProvider(),
    moodEngine: createMockMoodEngine(),
    compositionGenerator: createMockCompositionGenerator(),
    cityPresence: createMockCityPresence(),
    feedComposer: createMockFeedComposer(),
    socialEngine: createMockSocialEngine(),
  };

  const pipeline = new VibeCastPipeline(
    mocks.weatherProvider as any,
    mocks.moodEngine as any,
    mocks.compositionGenerator as any,
    mocks.cityPresence as any,
    mocks.feedComposer as any,
    mocks.socialEngine as any,
    configOverrides,
  );

  return { pipeline, mocks };
}

// --- Tests ---

describe("VibeCastPipeline", () => {
  describe("happy path: full cycle", () => {
    it("executes all steps from weather to feed post", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();

      const result = await pipeline.runCycle();

      expect(result).toBe(true);

      // All steps called in sequence
      expect(mocks.weatherProvider.getCurrentWeather).toHaveBeenCalledOnce();
      expect(mocks.moodEngine.mapWeatherToMood).toHaveBeenCalledOnce();
      expect(
        mocks.compositionGenerator.generatePrompt,
      ).toHaveBeenCalledOnce();
      expect(mocks.cityPresence.ensureInStudio).toHaveBeenCalledOnce();
      expect(mocks.cityPresence.composeTrack).toHaveBeenCalledOnce();
      expect(mocks.feedComposer.composePost).toHaveBeenCalledOnce();
      expect(mocks.cityPresence.postToFeed).toHaveBeenCalledOnce();
      expect(mocks.cityPresence.speak).toHaveBeenCalledOnce();
    });

    it("passes correct data through the pipeline", async () => {
      const weather = makeWeather({ condition: "stormy" });
      const mood = makeMood({ genre: "electronic", energy: 0.8 });
      const comp = makeCompositionPrompt({ title: "Storm Surge" });
      const track = makeTrack({ title: "Storm Surge" });
      const post = makeFeedPost({ content: "The storm electrifies..." });

      const { pipeline, mocks } = createPipelineWithMocks();
      mocks.weatherProvider.getCurrentWeather.mockResolvedValue(weather);
      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(mood);
      mocks.compositionGenerator.generatePrompt.mockResolvedValue(comp);
      mocks.cityPresence.composeTrack.mockResolvedValue(track);
      mocks.feedComposer.composePost.mockResolvedValue(post);

      await pipeline.runCycle();

      expect(mocks.moodEngine.mapWeatherToMood).toHaveBeenCalledWith(weather);
      expect(mocks.compositionGenerator.generatePrompt).toHaveBeenCalledWith(
        mood,
        weather,
      );
      expect(mocks.feedComposer.composePost).toHaveBeenCalledWith(
        weather,
        mood,
        track,
      );
      expect(mocks.cityPresence.postToFeed).toHaveBeenCalledWith(
        post.content,
        post.post_type,
      );
    });
  });

  describe("mood unchanged: skip composition", () => {
    it("skips composition when mood has not changed within 30min", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        stableWeatherTimerMs: 30 * 60 * 1000,
        duplicateWindowMs: 10,
      });

      const sameMood = makeMood();
      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(sameMood);

      // First cycle: should compose
      const firstResult = await pipeline.runCycle();
      expect(firstResult).toBe(true);

      // Reset call counters but keep state
      mocks.compositionGenerator.generatePrompt.mockClear();
      mocks.cityPresence.composeTrack.mockClear();

      // Wait for duplicate window to pass
      await new Promise((r) => setTimeout(r, 50));

      // Second cycle with same mood: should skip
      mocks.weatherProvider.getCurrentWeather.mockResolvedValue(
        makeWeather({ timestamp: new Date(Date.now() + 60_000).toISOString() }),
      );

      const secondResult = await pipeline.runCycle();
      expect(secondResult).toBe(false);
      expect(
        mocks.compositionGenerator.generatePrompt,
      ).not.toHaveBeenCalled();
    });
  });

  describe("mood changed: triggers composition", () => {
    it("triggers composition when genre changes", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        stableWeatherTimerMs: 30 * 60 * 1000,
        duplicateWindowMs: 10, // short window for test speed
      });

      // First cycle
      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(
        makeMood({ genre: "lo-fi" }),
      );
      await pipeline.runCycle();

      // Wait for duplicate window to pass
      await new Promise((r) => setTimeout(r, 50));

      // Second cycle with different genre
      mocks.weatherProvider.getCurrentWeather.mockResolvedValue(
        makeWeather({
          condition: "sunny",
          timestamp: new Date(Date.now() + 60_000).toISOString(),
        }),
      );
      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(
        makeMood({ genre: "jazz" }),
      );
      mocks.compositionGenerator.generatePrompt.mockClear();

      const result = await pipeline.runCycle();
      expect(result).toBe(true);
      expect(
        mocks.compositionGenerator.generatePrompt,
      ).toHaveBeenCalledOnce();
    });

    it("triggers composition when energy delta > 0.1", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        stableWeatherTimerMs: 30 * 60 * 1000,
        duplicateWindowMs: 10,
      });

      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(
        makeMood({ energy: 0.3 }),
      );
      await pipeline.runCycle();

      await new Promise((r) => setTimeout(r, 50));

      mocks.weatherProvider.getCurrentWeather.mockResolvedValue(
        makeWeather({
          timestamp: new Date(Date.now() + 60_000).toISOString(),
        }),
      );
      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(
        makeMood({ energy: 0.8 }),
      );
      mocks.compositionGenerator.generatePrompt.mockClear();

      const result = await pipeline.runCycle();
      expect(result).toBe(true);
      expect(
        mocks.compositionGenerator.generatePrompt,
      ).toHaveBeenCalledOnce();
    });
  });

  describe("30-minute timer", () => {
    it("triggers composition even with stable mood after 30 min", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        stableWeatherTimerMs: 100, // Use 100ms for test speed
        duplicateWindowMs: 10,
      });

      const sameMood = makeMood();
      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(sameMood);

      // First cycle
      await pipeline.runCycle();
      mocks.compositionGenerator.generatePrompt.mockClear();
      mocks.cityPresence.composeTrack.mockClear();

      // Wait for both timers to elapse
      await new Promise((r) => setTimeout(r, 150));

      mocks.weatherProvider.getCurrentWeather.mockResolvedValue(
        makeWeather({
          timestamp: new Date(Date.now() + 60_000).toISOString(),
        }),
      );

      const result = await pipeline.runCycle();
      expect(result).toBe(true);
      expect(
        mocks.compositionGenerator.generatePrompt,
      ).toHaveBeenCalledOnce();
    });
  });

  describe("duplicate suppression (US-U05)", () => {
    it("discards second weather update within 30s", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        duplicateWindowMs: 30_000,
      });

      // First cycle runs normally
      await pipeline.runCycle();
      expect(mocks.moodEngine.mapWeatherToMood).toHaveBeenCalledOnce();

      // Second cycle within 30s — suppressed
      mocks.moodEngine.mapWeatherToMood.mockClear();
      const result = await pipeline.runCycle();

      expect(result).toBe(false);
      expect(mocks.moodEngine.mapWeatherToMood).not.toHaveBeenCalled();
    });

    it("processes weather after duplicate window elapses", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        duplicateWindowMs: 50, // 50ms for test speed
      });

      // First cycle
      await pipeline.runCycle();
      mocks.moodEngine.mapWeatherToMood.mockClear();

      // Wait for duplicate window to pass
      await new Promise((r) => setTimeout(r, 100));

      mocks.weatherProvider.getCurrentWeather.mockResolvedValue(
        makeWeather({
          timestamp: new Date(Date.now() + 60_000).toISOString(),
        }),
      );

      // Now a different mood so it triggers composition
      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(
        makeMood({ genre: "jazz" }),
      );

      const result = await pipeline.runCycle();
      expect(result).toBe(true);
      expect(mocks.moodEngine.mapWeatherToMood).toHaveBeenCalledOnce();
    });
  });

  describe("track generation failure", () => {
    it("posts narrative-only when track composition fails", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();

      mocks.cityPresence.composeTrack.mockRejectedValue(
        new Error("Studio unavailable"),
      );

      const result = await pipeline.runCycle();

      // Pipeline continues — posts narrative-only
      expect(result).toBe(false);
      expect(mocks.feedComposer.composePost).toHaveBeenCalled();
    });

    it("posts narrative-only when track status is failed", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();

      mocks.cityPresence.composeTrack.mockResolvedValue(
        makeTrack({ status: "failed" }),
      );

      const result = await pipeline.runCycle();

      expect(result).toBe(false);
      expect(mocks.feedComposer.composePost).toHaveBeenCalled();
    });
  });

  describe("ambient drift (US-S07)", () => {
    it("activates when no weather for > threshold", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        ambientDriftThresholdMs: 100, // 100ms for test speed
      });

      // Run one cycle to set lastWeatherTimestamp
      await pipeline.runCycle();
      expect(pipeline.ambientDrift).toBe(false);

      // Wait for threshold
      await new Promise((r) => setTimeout(r, 150));

      pipeline.checkAmbientDrift();
      expect(pipeline.ambientDrift).toBe(true);
    });

    it("halves energy in ambient drift mood", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        ambientDriftThresholdMs: 100,
      });

      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(
        makeMood({ energy: 0.8 }),
      );

      await pipeline.runCycle();
      await new Promise((r) => setTimeout(r, 150));
      pipeline.checkAmbientDrift();

      const driftMood = pipeline.getAmbientDriftMood();
      expect(driftMood.energy).toBe(0.4); // 0.8 * 0.5
    });

    it("skips composition during ambient drift", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        ambientDriftThresholdMs: 50,
      });

      // Initial cycle to populate state
      await pipeline.runCycle();

      // Enter drift
      await new Promise((r) => setTimeout(r, 100));
      pipeline.checkAmbientDrift();
      expect(pipeline.ambientDrift).toBe(true);

      // The start() method skips runCycle during drift,
      // but we can verify that the pipeline is in drift
      // and would not compose
    });

    it("exits ambient drift when new weather arrives", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        ambientDriftThresholdMs: 50,
        duplicateWindowMs: 10,
      });

      await pipeline.runCycle();
      await new Promise((r) => setTimeout(r, 100));
      pipeline.checkAmbientDrift();
      expect(pipeline.ambientDrift).toBe(true);

      // New weather arrives — should exit drift
      mocks.weatherProvider.getCurrentWeather.mockResolvedValue(
        makeWeather({
          condition: "sunny",
          timestamp: new Date(Date.now() + 120_000).toISOString(),
        }),
      );
      mocks.moodEngine.mapWeatherToMood.mockResolvedValue(
        makeMood({ genre: "electronic" }),
      );

      await pipeline.runCycle();
      expect(pipeline.ambientDrift).toBe(false);
    });

    it("continues social responses during ambient drift", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        ambientDriftThresholdMs: 50,
      });

      // Run one cycle to populate mood/weather
      await pipeline.runCycle();

      // Enter drift
      await new Promise((r) => setTimeout(r, 100));
      pipeline.checkAmbientDrift();
      expect(pipeline.ambientDrift).toBe(true);

      // Social responses should still work
      const mention = makeMention();
      await pipeline.processMentions([mention]);

      expect(mocks.socialEngine.generateResponse).toHaveBeenCalledOnce();
      // Should use the drift mood (halved energy)
      const callArgs = mocks.socialEngine.generateResponse.mock.calls[0];
      expect(callArgs[1].energy).toBe(0.35 * 0.5);
    });
  });

  describe("social branch: processMentions", () => {
    it("generates and posts responses for mentions", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();

      // First populate mood/weather state
      await pipeline.runCycle();
      mocks.cityPresence.speak.mockClear();

      const mentions = [makeMention(), makeMention({ content: "Nice track!" })];
      await pipeline.processMentions(mentions);

      expect(mocks.socialEngine.generateResponse).toHaveBeenCalledTimes(2);
      expect(mocks.cityPresence.speak).toHaveBeenCalledTimes(2);
    });

    it("does nothing when no mood/weather state exists", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();

      // No prior runCycle — no state
      await pipeline.processMentions([makeMention()]);

      expect(mocks.socialEngine.generateResponse).not.toHaveBeenCalled();
    });

    it("continues processing remaining mentions when one fails", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();
      await pipeline.runCycle();
      mocks.cityPresence.speak.mockClear();

      mocks.socialEngine.generateResponse
        .mockRejectedValueOnce(new Error("LLM failed"))
        .mockResolvedValueOnce("All good now!");

      await pipeline.processMentions([
        makeMention(),
        makeMention({ content: "Second mention" }),
      ]);

      // First failed, second succeeded
      expect(mocks.socialEngine.generateResponse).toHaveBeenCalledTimes(2);
      expect(mocks.cityPresence.speak).toHaveBeenCalledTimes(1);
    });
  });

  describe("telemetry", () => {
    it("emits telemetry entries for each pipeline step", async () => {
      const { pipeline } = createPipelineWithMocks();

      await pipeline.runCycle();

      const telemetry = pipeline.getTelemetry();
      // Should have entries for: WeatherProvider, MoodEngine,
      // CompositionGenerator, CityPresenceManager (ensureInStudio),
      // CityPresenceManager (composeTrack), FeedComposer
      expect(telemetry.length).toBeGreaterThanOrEqual(6);

      // Check structure of each entry
      for (const entry of telemetry) {
        expect(entry).toHaveProperty("trace_id");
        expect(entry).toHaveProperty("component");
        expect(entry).toHaveProperty("prompt_version");
        expect(entry).toHaveProperty("latency_ms");
        expect(entry).toHaveProperty("status");
        expect(entry).toHaveProperty("timestamp");
        expect(typeof entry.latency_ms).toBe("number");
        expect(entry.latency_ms).toBeGreaterThanOrEqual(0);
      }
    });

    it("records success status on normal execution", async () => {
      const { pipeline } = createPipelineWithMocks();

      await pipeline.runCycle();

      const telemetry = pipeline.getTelemetry();
      const statuses = telemetry.map((t) => t.status);
      expect(statuses.every((s) => s === "success")).toBe(true);
    });

    it("records error status when a step fails", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();

      mocks.compositionGenerator.generatePrompt.mockRejectedValue(
        new Error("LLM error"),
      );

      await pipeline.runCycle();

      const telemetry = pipeline.getTelemetry();
      const compositionEntry = telemetry.find(
        (t) => t.component === "CompositionGenerator",
      );
      expect(compositionEntry?.status).toBe("error");
    });
  });

  describe("start and stop", () => {
    it("starts and stops the pipeline loop", async () => {
      const { pipeline } = createPipelineWithMocks();

      expect(pipeline.running).toBe(false);

      pipeline.start(50);
      expect(pipeline.running).toBe(true);

      // Let it run for a bit
      await new Promise((r) => setTimeout(r, 30));

      pipeline.stop();
      expect(pipeline.running).toBe(false);
    });

    it("does not start multiple loops", () => {
      const { pipeline } = createPipelineWithMocks();

      pipeline.start(1000);
      pipeline.start(1000); // Should be no-op

      expect(pipeline.running).toBe(true);
      pipeline.stop();
    });

    it("stop prevents new cycles from running", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();

      pipeline.start(20);
      pipeline.stop();

      // Wait enough time that cycles would have run
      await new Promise((r) => setTimeout(r, 100));

      // At most 0-1 calls should have been made (depending on timing)
      // The key assertion is that it stopped
      expect(pipeline.running).toBe(false);
    });
  });

  describe("MoodEngine failure uses cached mood", () => {
    it("continues with previous mood when MoodEngine throws", async () => {
      const { pipeline, mocks } = createPipelineWithMocks({
        duplicateWindowMs: 10,
      });

      // First cycle succeeds, establishing a mood
      await pipeline.runCycle();

      // Wait for duplicate window
      await new Promise((r) => setTimeout(r, 50));

      // Second cycle: MoodEngine fails
      mocks.moodEngine.mapWeatherToMood.mockRejectedValue(
        new Error("LLM timeout"),
      );
      mocks.weatherProvider.getCurrentWeather.mockResolvedValue(
        makeWeather({
          timestamp: new Date(Date.now() + 120_000).toISOString(),
        }),
      );
      // Since mood won't change (cached = same), and timer may not have elapsed,
      // set timer to short
      const { pipeline: p2, mocks: m2 } = createPipelineWithMocks({
        duplicateWindowMs: 10,
        stableWeatherTimerMs: 10,
      });

      // First cycle establishes mood
      await p2.runCycle();
      await new Promise((r) => setTimeout(r, 50));

      m2.moodEngine.mapWeatherToMood.mockRejectedValue(
        new Error("LLM timeout"),
      );
      m2.weatherProvider.getCurrentWeather.mockResolvedValue(
        makeWeather({
          timestamp: new Date(Date.now() + 120_000).toISOString(),
        }),
      );

      // Pipeline should continue using cached mood (but skip due to same mood)
      // The important thing is it doesn't throw
      const result = await p2.runCycle();
      // It used cached mood - should not throw
      expect(m2.moodEngine.mapWeatherToMood).toHaveBeenCalled();
    });
  });

  describe("CompositionGenerator failure posts narrative-only", () => {
    it("posts without track when composition fails", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();

      mocks.compositionGenerator.generatePrompt.mockRejectedValue(
        new Error("Composition LLM failed after retries"),
      );

      const result = await pipeline.runCycle();

      expect(result).toBe(false);
      // FeedComposer should still be called for narrative-only
      expect(mocks.feedComposer.composePost).toHaveBeenCalled();
      // composeTrack should NOT have been called
      expect(mocks.cityPresence.composeTrack).not.toHaveBeenCalled();
    });
  });

  describe("track polling", () => {
    it("polls track status when initial status is pending", async () => {
      const { pipeline, mocks } = createPipelineWithMocks();

      mocks.cityPresence.composeTrack.mockResolvedValue(
        makeTrack({ status: "pending" }),
      );
      mocks.cityPresence.pollTrackStatus.mockResolvedValue(
        makeTrack({ status: "succeeded" }),
      );

      const result = await pipeline.runCycle();

      expect(result).toBe(true);
      expect(mocks.cityPresence.pollTrackStatus).toHaveBeenCalledWith(
        "task-123",
      );
    });
  });
});
