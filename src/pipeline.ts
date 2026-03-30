/**
 * VibeCastPipeline - Pipeline Orchestrator
 *
 * Implements the main composition cycle, parallel social branch,
 * and ambient drift fallback per ADR-002 and SPEC-001 Section 4.
 *
 * Traceability: TASK-007 -> SPEC-001 Section 4 -> PRD-001 US-E01..E05, US-S07, US-U05, ADR-002
 */

import type {
  WeatherInput,
  MoodVector,
  TrackResult,
  FeedPost,
  AgentMention,
} from "./types.js";
import type { WeatherProvider } from "./types.js";
import type { MoodEngine } from "./mood-engine.js";
import type { CompositionGenerator } from "./composition-generator.js";
import type { CityPresenceManager } from "./city-presence.js";
import type { FeedComposer } from "./feed-composer.js";
import type { SocialEngine } from "./social-engine.js";

/** Waveform Studio building ID per SPEC-001 Section 2.4 */
const WAVEFORM_STUDIO_BUILDING_ID =
  "e6262f41-48c3-4e8c-935b-bc4a4c07252b";

/** Duplicate suppression window in ms (US-U05) */
const DUPLICATE_WINDOW_MS = 30_000;

/** Stable weather recomposition timer in ms (30 minutes) */
const STABLE_WEATHER_TIMER_MS = 30 * 60 * 1000;

/** Ambient drift threshold in ms (US-S07: 10 minutes) */
const AMBIENT_DRIFT_THRESHOLD_MS = 10 * 60 * 1000;

/** Track polling timeout in ms */
const TRACK_POLL_TIMEOUT_MS = 5 * 60 * 1000;

/** Track polling interval in ms */
const TRACK_POLL_INTERVAL_MS = 15_000;

/** Mood change thresholds per TASK-007 */
const ENERGY_DELTA_THRESHOLD = 0.1;
const VALENCE_DELTA_THRESHOLD = 0.15;

/** Structured telemetry entry per SPEC-001 Section 8 */
export interface TelemetryEntry {
  trace_id: string;
  component: string;
  prompt_version: string;
  latency_ms: number;
  status: "success" | "error" | "timeout";
  timestamp: string;
}

/** Pipeline configuration */
export interface PipelineConfig {
  /** Override the duplicate suppression window (for testing) */
  duplicateWindowMs?: number;
  /** Override the stable weather timer (for testing) */
  stableWeatherTimerMs?: number;
  /** Override the ambient drift threshold (for testing) */
  ambientDriftThresholdMs?: number;
}

/**
 * VibeCastPipeline orchestrates the weather-to-music-to-feed pipeline.
 *
 * Main composition cycle (sequential, per SPEC-001 Section 4.1):
 *   weather -> mood -> composition -> studio -> feed -> announce
 *
 * Social branch (parallel, per SPEC-001 Section 4.2):
 *   mentions -> SocialEngine -> speak
 *
 * Ambient drift fallback (per SPEC-001 Section 4.3):
 *   No weather > 10min -> halve energy, skip composition, continue social
 */
export class VibeCastPipeline {
  private readonly weatherProvider: WeatherProvider;
  private readonly moodEngine: MoodEngine;
  private readonly compositionGenerator: CompositionGenerator;
  private readonly cityPresence: CityPresenceManager;
  private readonly feedComposer: FeedComposer;
  private readonly socialEngine: SocialEngine;

  // Internal state
  private lastWeatherTimestamp: number = 0;
  private lastWeatherData: WeatherInput | null = null;
  private lastMoodVector: MoodVector | null = null;
  private lastCompositionTimestamp: number = 0;
  private isRunning: boolean = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private inAmbientDrift: boolean = false;

  // Telemetry
  private readonly telemetryLog: TelemetryEntry[] = [];

  // Configuration
  private readonly duplicateWindowMs: number;
  private readonly stableWeatherTimerMs: number;
  private readonly ambientDriftThresholdMs: number;

  constructor(
    weatherProvider: WeatherProvider,
    moodEngine: MoodEngine,
    compositionGenerator: CompositionGenerator,
    cityPresence: CityPresenceManager,
    feedComposer: FeedComposer,
    socialEngine: SocialEngine,
    config?: PipelineConfig,
  ) {
    this.weatherProvider = weatherProvider;
    this.moodEngine = moodEngine;
    this.compositionGenerator = compositionGenerator;
    this.cityPresence = cityPresence;
    this.feedComposer = feedComposer;
    this.socialEngine = socialEngine;

    this.duplicateWindowMs = config?.duplicateWindowMs ?? DUPLICATE_WINDOW_MS;
    this.stableWeatherTimerMs =
      config?.stableWeatherTimerMs ?? STABLE_WEATHER_TIMER_MS;
    this.ambientDriftThresholdMs =
      config?.ambientDriftThresholdMs ?? AMBIENT_DRIFT_THRESHOLD_MS;
  }

  /**
   * Execute one full composition cycle.
   * Returns true if a composition was produced, false if skipped.
   */
  async runCycle(): Promise<boolean> {
    const now = Date.now();

    // Step 1: Get current weather
    let weather: WeatherInput;
    try {
      weather = await this.logStep("WeatherProvider", "n/a", async () => {
        return await this.weatherProvider.getCurrentWeather();
      });
    } catch {
      // Weather provider failed — check ambient drift
      if (
        this.lastWeatherTimestamp > 0 &&
        now - this.lastWeatherTimestamp > this.ambientDriftThresholdMs
      ) {
        this.enterAmbientDrift();
      }
      return false;
    }

    const weatherTimestamp = new Date(weather.timestamp).getTime();

    // Duplicate suppression (US-U05): discard if same weather within 30s
    if (
      this.lastWeatherTimestamp > 0 &&
      now - this.lastWeatherTimestamp < this.duplicateWindowMs
    ) {
      // Discard — use only the latest
      this.lastWeatherData = weather;
      this.lastWeatherTimestamp = now;
      return false;
    }

    this.lastWeatherData = weather;
    this.lastWeatherTimestamp = now;

    // Check ambient drift: if > threshold with no new data, enter drift
    // (Since we just got weather, exit drift if we were in it)
    if (this.inAmbientDrift) {
      this.exitAmbientDrift();
    }

    // Step 2: Map weather to mood
    let mood: MoodVector;
    try {
      mood = await this.logStep("MoodEngine", "WTM-v1.0", async () => {
        return await this.moodEngine.mapWeatherToMood(weather);
      });
    } catch {
      // MoodEngine failure — use cached mood if available
      if (this.lastMoodVector) {
        mood = this.lastMoodVector;
      } else {
        return false;
      }
    }

    // Step 3: Compare mood to previous state
    const moodChanged = this.hasMoodChanged(mood);
    const timerElapsed =
      this.lastCompositionTimestamp === 0 ||
      now - this.lastCompositionTimestamp >= this.stableWeatherTimerMs;

    if (!moodChanged && !timerElapsed) {
      // Mood unchanged and timer not elapsed — skip composition
      this.lastMoodVector = mood;
      return false;
    }

    this.lastMoodVector = mood;

    // Step 4: Generate composition prompt
    let compositionPrompt;
    try {
      compositionPrompt = await this.logStep(
        "CompositionGenerator",
        "COMP-v1.0",
        async () => {
          return await this.compositionGenerator.generatePrompt(mood, weather);
        },
      );
    } catch {
      // CompositionGenerator failure — post narrative-only
      await this.postNarrativeOnly(weather, mood);
      this.lastCompositionTimestamp = now;
      return false;
    }

    // Step 5: Ensure agent is in Waveform Studio
    try {
      await this.logStep("CityPresenceManager", "n/a", async () => {
        return await this.cityPresence.ensureInStudio();
      });
    } catch {
      // Studio navigation failed — try to continue anyway
    }

    // Step 6: Compose track
    let track: TrackResult;
    try {
      track = await this.logStep("CityPresenceManager", "n/a", async () => {
        const result = await this.cityPresence.composeTrack(
          WAVEFORM_STUDIO_BUILDING_ID,
          compositionPrompt.title,
          compositionPrompt.prompt,
        );
        // Poll until succeeded/failed
        if (result.status === "pending" || result.status === "processing") {
          return await this.cityPresence.pollTrackStatus(result.task_id);
        }
        return result;
      });
    } catch {
      // Track generation failed — post narrative-only
      await this.postNarrativeOnly(weather, mood);
      this.lastCompositionTimestamp = now;
      return false;
    }

    if (track.status === "failed") {
      // Track failed — post narrative-only
      await this.postNarrativeOnly(weather, mood);
      this.lastCompositionTimestamp = now;
      return false;
    }

    // Step 7: Compose feed post
    let feedPost: FeedPost;
    try {
      feedPost = await this.logStep("FeedComposer", "NARR-v1.0", async () => {
        return await this.feedComposer.composePost(weather, mood, track);
      });
    } catch {
      // FeedComposer failure — post a minimal fallback
      feedPost = {
        content: `New track: ${track.title} | ${mood.genre} | Weather: ${weather.condition}`,
        post_type: "thought",
      };
    }

    // Step 8: Post to feed
    try {
      await this.cityPresence.postToFeed(feedPost.content, feedPost.post_type);
    } catch {
      // Log and continue
    }

    // Step 9: Announce in current location
    try {
      await this.cityPresence.speak(
        `Just composed "${track.title}" — a ${mood.genre} piece inspired by the ${weather.condition} weather.`,
      );
    } catch {
      // Log and continue
    }

    this.lastCompositionTimestamp = now;
    return true;
  }

  /**
   * Process mentions in parallel social branch (SPEC-001 Section 4.2).
   * Does not block the main pipeline.
   */
  async processMentions(mentions: AgentMention[]): Promise<void> {
    if (!this.lastMoodVector || !this.lastWeatherData) {
      return;
    }

    const currentMood = this.inAmbientDrift
      ? this.getAmbientDriftMood()
      : this.lastMoodVector;

    for (const mention of mentions) {
      try {
        const response = await this.logStep(
          "SocialEngine",
          "SOC-v1.0",
          async () => {
            return await this.socialEngine.generateResponse(
              mention,
              currentMood,
              this.lastWeatherData!,
            );
          },
        );
        await this.cityPresence.speak(response);
      } catch {
        // Social branch failure does not block — continue to next mention
      }
    }
  }

  /**
   * Check if ambient drift should be activated.
   * Called externally or internally when weather data is stale.
   */
  checkAmbientDrift(): boolean {
    if (this.lastWeatherTimestamp === 0) return false;
    const elapsed = Date.now() - this.lastWeatherTimestamp;
    if (elapsed > this.ambientDriftThresholdMs && !this.inAmbientDrift) {
      this.enterAmbientDrift();
      return true;
    }
    return this.inAmbientDrift;
  }

  /**
   * Start the pipeline on a recurring interval.
   */
  start(intervalMs: number): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalHandle = setInterval(() => {
      if (this.isRunning) {
        this.checkAmbientDrift();
        if (!this.inAmbientDrift) {
          this.runCycle().catch(() => {
            // Cycle errors are logged in telemetry
          });
        }
      }
    }, intervalMs);
  }

  /**
   * Stop the pipeline loop.
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /** Whether the pipeline is currently running */
  get running(): boolean {
    return this.isRunning;
  }

  /** Whether the pipeline is in ambient drift mode */
  get ambientDrift(): boolean {
    return this.inAmbientDrift;
  }

  /** Get the telemetry log */
  getTelemetry(): readonly TelemetryEntry[] {
    return this.telemetryLog;
  }

  /** Get the current mood vector (for testing/inspection) */
  getCurrentMood(): MoodVector | null {
    return this.lastMoodVector;
  }

  /** Get the ambient drift mood (energy halved) */
  getAmbientDriftMood(): MoodVector {
    if (!this.lastMoodVector) {
      throw new Error("No mood vector available for ambient drift");
    }
    return {
      ...this.lastMoodVector,
      energy: this.lastMoodVector.energy * 0.5,
    };
  }

  // --- Internal helpers ---

  private hasMoodChanged(newMood: MoodVector): boolean {
    if (!this.lastMoodVector) return true;

    if (newMood.genre !== this.lastMoodVector.genre) return true;
    if (
      Math.abs(newMood.energy - this.lastMoodVector.energy) >
      ENERGY_DELTA_THRESHOLD
    )
      return true;
    if (
      Math.abs(newMood.valence - this.lastMoodVector.valence) >
      VALENCE_DELTA_THRESHOLD
    )
      return true;

    return false;
  }

  private enterAmbientDrift(): void {
    this.inAmbientDrift = true;
  }

  private exitAmbientDrift(): void {
    this.inAmbientDrift = false;
  }

  /**
   * Post a narrative-only feed post when composition/track fails.
   */
  private async postNarrativeOnly(
    weather: WeatherInput,
    mood: MoodVector,
  ): Promise<void> {
    const fallbackTrack: TrackResult = {
      task_id: "",
      artifact_id: "",
      title: "Ambient Reflection",
      public_url: "",
      status: "failed",
    };

    try {
      const feedPost = await this.feedComposer.composePost(
        weather,
        mood,
        fallbackTrack,
      );
      await this.cityPresence.postToFeed(feedPost.content, feedPost.post_type);
    } catch {
      // Best-effort
    }
  }

  /**
   * Log a pipeline step with telemetry.
   */
  private async logStep<T>(
    component: string,
    promptVersion: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now();
    let status: "success" | "error" | "timeout" = "success";

    try {
      const result = await fn();
      return result;
    } catch (err) {
      status =
        err instanceof Error && err.message.includes("timed out")
          ? "timeout"
          : "error";
      throw err;
    } finally {
      const entry: TelemetryEntry = {
        trace_id: crypto.randomUUID(),
        component,
        prompt_version: promptVersion,
        latency_ms: Date.now() - start,
        status,
        timestamp: new Date().toISOString(),
      };
      this.telemetryLog.push(entry);
    }
  }
}
