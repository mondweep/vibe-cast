/**
 * Vibe Cast - Application Entry Point
 *
 * Initializes all components and starts the VibeCastPipeline.
 *
 * Traceability: TASK-007 -> SPEC-001 Section 7 -> PRD-001
 */

import { resolve } from "node:path";
import { SimulatedWeatherProvider } from "./weather-provider.js";
import { MoodEngine } from "./mood-engine.js";
import { CompositionGenerator } from "./composition-generator.js";
import { CityPresenceManager } from "./city-presence.js";
import type { CityClient } from "./city-presence.js";
import { FeedComposer } from "./feed-composer.js";
import { SocialEngine } from "./social-engine.js";
import { PromptRegistry } from "./prompt-registry.js";
import type { LLMClient } from "./llm-client.js";
import { VibeCastPipeline } from "./pipeline.js";

/** Default pipeline polling interval: 10 minutes (matches weather rotation) */
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

export interface VibeCastConfig {
  /** Path to weather fixtures file */
  fixturesPath?: string;
  /** Path to prompts directory */
  promptsDir?: string;
  /** LLM client instance */
  llmClient: LLMClient;
  /** City API client instance */
  cityClient: CityClient;
  /** JWT for city API auth */
  jwt: string;
  /** Pipeline polling interval in ms (default: 10 minutes) */
  intervalMs?: number;
}

/**
 * Create and wire all pipeline components.
 * Returns a configured VibeCastPipeline ready to start.
 */
export function createPipeline(config: VibeCastConfig): VibeCastPipeline {
  const promptsDir =
    config.promptsDir ?? resolve(process.cwd(), "docs", "prompts");

  const registry = new PromptRegistry(promptsDir);

  const weatherProvider = new SimulatedWeatherProvider({
    fixturePath: config.fixturesPath,
  });

  const moodEngine = new MoodEngine(registry, config.llmClient);
  const compositionGenerator = new CompositionGenerator(
    registry,
    config.llmClient,
  );
  const cityPresence = new CityPresenceManager(config.cityClient, config.jwt);
  const feedComposer = new FeedComposer(registry, config.llmClient);
  const socialEngine = new SocialEngine(registry, config.llmClient);

  return new VibeCastPipeline(
    weatherProvider,
    moodEngine,
    compositionGenerator,
    cityPresence,
    feedComposer,
    socialEngine,
  );
}

// Re-export key types for programmatic use
export { VibeCastPipeline } from "./pipeline.js";
export type { TelemetryEntry, PipelineConfig } from "./pipeline.js";

/**
 * Main entry point when executed directly.
 */
async function main(): Promise<void> {
  // In production, these would come from environment variables or config files
  const jwt = process.env.VIBE_CAST_JWT ?? "";
  if (!jwt) {
    console.error(
      "VIBE_CAST_JWT environment variable is required. Exiting.",
    );
    process.exit(1);
  }

  // For MVP, the LLM client and city client must be provided externally.
  // This entry point is a placeholder that demonstrates the wiring.
  console.log("Vibe Cast - Zephyr Drift Agent");
  console.log("Use createPipeline() for programmatic initialization.");
}

// Run if executed directly
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("index.ts") ||
    process.argv[1].endsWith("index.js"));

if (isDirectExecution) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
