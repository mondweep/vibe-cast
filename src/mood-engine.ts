/**
 * MoodEngine - Weather-to-Mood Mapping
 *
 * Core AI component that converts WeatherInput into MoodVector
 * using the WTM-v1.0 few-shot prompting strategy (ADR-001).
 *
 * Traceability: TASK-003 -> SPEC-001 Section 2.2 -> PRD-001 Section 4.1
 */

import type { WeatherInput, MoodVector, Genre } from "./types.js";
import type { PromptRegistry } from "./prompt-registry.js";
import type { LLMClient, Message } from "./llm-client.js";

/** Valid genres per PRD-001 Section 4.1 */
const VALID_GENRES: ReadonlySet<string> = new Set<Genre>([
  "lo-fi",
  "electronic",
  "classical",
  "jazz",
  "ambient",
  "rock",
  "folk",
]);

/** Configuration for MoodEngine */
export interface MoodEngineConfig {
  /** LLM call timeout in milliseconds (default: 5000 per NFR-01) */
  timeout?: number;
  /** Prompt ID to load (default: "WTM") */
  promptId?: string;
}

/**
 * MoodEngine maps weather data to mood vectors using few-shot LLM prompting.
 *
 * Behavior (per SPEC-001 Section 2.2):
 * 1. Load prompt template from PromptRegistry (WTM-v1.0)
 * 2. Inject weather data into user template
 * 3. Call LLM with system prompt + few-shot examples + user message
 * 4. Parse JSON response into MoodVector
 * 5. Validate and clamp: energy [0.0, 1.0], valence [-1.0, 1.0]
 * 6. Apply modifiers: temp > 30C -> energy += 0.1; humidity > 80% -> valence -= 0.1
 * 7. Persist to current-mood store
 */
export class MoodEngine {
  private readonly registry: PromptRegistry;
  private readonly llmClient: LLMClient;
  private readonly config: Required<MoodEngineConfig>;
  private currentMood: MoodVector | null = null;

  constructor(
    registry: PromptRegistry,
    llmClient: LLMClient,
    config?: MoodEngineConfig,
  ) {
    this.registry = registry;
    this.llmClient = llmClient;
    this.config = {
      timeout: config?.timeout ?? 5000,
      promptId: config?.promptId ?? "WTM",
    };
  }

  /**
   * Map weather data to a mood vector.
   *
   * @throws Error if LLM fails after retries and no previous mood is available
   */
  async mapWeatherToMood(weather: WeatherInput): Promise<MoodVector> {
    const prompt = this.registry.getPrompt(this.config.promptId);

    // Build messages: system + few-shot examples + user message
    const messages = this.buildMessages(prompt, weather);

    // Attempt LLM call with retry
    let rawResponse: string;
    try {
      rawResponse = await this.callLLMWithRetry(messages);
    } catch (error) {
      // LLM failed after retries -- fall back to previous mood
      if (this.currentMood) {
        return this.currentMood;
      }
      throw new Error(
        `MoodEngine: LLM call failed and no previous mood available: ${(error as Error).message}`,
      );
    }

    // Parse JSON response with retry on invalid JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawResponse) as Record<string, unknown>;
    } catch {
      // Retry with temperature=0
      try {
        const retryResponse = await this.llmClient.complete(messages, {
          temperature: 0,
          timeout: this.config.timeout,
        });
        parsed = JSON.parse(retryResponse) as Record<string, unknown>;
      } catch {
        if (this.currentMood) {
          return this.currentMood;
        }
        throw new Error(
          `MoodEngine: Failed to parse LLM response as JSON after retry. Raw response: ${rawResponse}`,
        );
      }
    }

    // Validate required fields
    const mood = this.validateAndBuild(parsed);

    // Apply modifiers (Step 6)
    if (weather.temperature_c > 30) {
      mood.energy += 0.1;
    }
    if (weather.humidity_pct > 80) {
      mood.valence -= 0.1;
    }

    // Final clamping after modifiers
    mood.energy = clamp(mood.energy, 0.0, 1.0);
    mood.valence = clamp(mood.valence, -1.0, 1.0);

    // Persist (Step 7)
    this.currentMood = mood;
    return mood;
  }

  /**
   * Get the current (last successfully computed) mood vector.
   * Returns null if no mood has been computed yet.
   */
  getCurrentMood(): MoodVector | null {
    return this.currentMood;
  }

  /**
   * Build the full message array: system + few-shot + user.
   */
  private buildMessages(
    prompt: { systemPrompt: string; userTemplate: string; fewShotExamples?: { input: Record<string, unknown>; output: Record<string, unknown> }[] },
    weather: WeatherInput,
  ): Message[] {
    const messages: Message[] = [
      { role: "system", content: prompt.systemPrompt },
    ];

    // Add few-shot examples as user/assistant pairs
    if (prompt.fewShotExamples) {
      for (const example of prompt.fewShotExamples) {
        messages.push({
          role: "user",
          content: this.injectWeatherIntoTemplate(
            prompt.userTemplate,
            example.input as unknown as WeatherInput,
          ),
        });
        messages.push({
          role: "assistant",
          content: JSON.stringify(example.output),
        });
      }
    }

    // Add the actual user message
    messages.push({
      role: "user",
      content: this.injectWeatherIntoTemplate(prompt.userTemplate, weather),
    });

    return messages;
  }

  /**
   * Inject weather data into the user template by replacing placeholders.
   */
  private injectWeatherIntoTemplate(
    template: string,
    weather: WeatherInput | Record<string, unknown>,
  ): string {
    return template
      .replace("{{condition}}", String(weather.condition))
      .replace("{{temperature_c}}", String(weather.temperature_c))
      .replace("{{humidity_pct}}", String(weather.humidity_pct))
      .replace("{{wind_speed_kmh}}", String(weather.wind_speed_kmh))
      .replace("{{time_of_day}}", String(weather.time_of_day));
  }

  /**
   * Call LLM with one retry on timeout.
   */
  private async callLLMWithRetry(messages: Message[]): Promise<string> {
    try {
      return await this.llmClient.complete(messages, {
        timeout: this.config.timeout,
      });
    } catch {
      // Retry once on failure
      return await this.llmClient.complete(messages, {
        timeout: this.config.timeout,
      });
    }
  }

  /**
   * Validate parsed JSON and build a MoodVector.
   * Clamps energy and valence to valid ranges.
   *
   * @throws Error if required fields are missing or invalid
   */
  private validateAndBuild(parsed: Record<string, unknown>): MoodVector {
    // Validate genre
    if (typeof parsed.genre !== "string" || !VALID_GENRES.has(parsed.genre)) {
      if (this.currentMood) {
        return { ...this.currentMood };
      }
      throw new Error(
        `MoodEngine: Invalid genre "${String(parsed.genre)}". Must be one of: ${[...VALID_GENRES].join(", ")}`,
      );
    }

    // Validate energy
    if (typeof parsed.energy !== "number" || isNaN(parsed.energy)) {
      throw new Error(
        `MoodEngine: Missing or invalid "energy" field. Expected a number, got: ${String(parsed.energy)}`,
      );
    }

    // Validate valence
    if (typeof parsed.valence !== "number" || isNaN(parsed.valence)) {
      throw new Error(
        `MoodEngine: Missing or invalid "valence" field. Expected a number, got: ${String(parsed.valence)}`,
      );
    }

    // Validate tempo_bpm_range
    if (
      !Array.isArray(parsed.tempo_bpm_range) ||
      parsed.tempo_bpm_range.length !== 2 ||
      typeof parsed.tempo_bpm_range[0] !== "number" ||
      typeof parsed.tempo_bpm_range[1] !== "number"
    ) {
      throw new Error(
        `MoodEngine: Missing or invalid "tempo_bpm_range" field. Expected [number, number], got: ${JSON.stringify(parsed.tempo_bpm_range)}`,
      );
    }

    // Validate descriptors
    if (
      !Array.isArray(parsed.descriptors) ||
      parsed.descriptors.length < 2 ||
      parsed.descriptors.length > 5 ||
      !parsed.descriptors.every((d: unknown) => typeof d === "string")
    ) {
      throw new Error(
        `MoodEngine: Missing or invalid "descriptors" field. Expected 2-5 strings, got: ${JSON.stringify(parsed.descriptors)}`,
      );
    }

    // Validate color_palette
    if (
      !Array.isArray(parsed.color_palette) ||
      parsed.color_palette.length < 2 ||
      parsed.color_palette.length > 4 ||
      !parsed.color_palette.every(
        (c: unknown) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c as string),
      )
    ) {
      throw new Error(
        `MoodEngine: Missing or invalid "color_palette" field. Expected 2-4 hex color strings, got: ${JSON.stringify(parsed.color_palette)}`,
      );
    }

    // Clamp energy and valence (Step 5, US-U01)
    let energy = parsed.energy as number;
    let valence = parsed.valence as number;

    if (energy < 0.0 || energy > 1.0) {
      console.warn(
        `MoodEngine: Energy ${energy} out of range [0.0, 1.0], clamping.`,
      );
      energy = clamp(energy, 0.0, 1.0);
    }
    if (valence < -1.0 || valence > 1.0) {
      console.warn(
        `MoodEngine: Valence ${valence} out of range [-1.0, 1.0], clamping.`,
      );
      valence = clamp(valence, -1.0, 1.0);
    }

    return {
      genre: parsed.genre as Genre,
      energy,
      valence,
      tempo_bpm_range: parsed.tempo_bpm_range as [number, number],
      descriptors: parsed.descriptors as string[],
      color_palette: parsed.color_palette as string[],
    };
  }
}

/** Clamp a value to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
