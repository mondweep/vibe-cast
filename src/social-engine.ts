/**
 * SocialEngine — generates weather-mood-consistent responses to agent interactions.
 * Traceability: TASK-006 -> SPEC-001 Section 2.5 -> PRD-001 Section 4.3, US-U04
 */

import type { PromptRegistry } from "./prompt-registry.js";
import type { LLMClient } from "./llm-client.js";
import type { AgentMention, MoodVector, WeatherInput } from "./types.js";

/**
 * Personality constants (invariant across all weather states).
 * Per PRD-001 Section 4.3 and SPEC-001 Section 2.5.
 */
export const PERSONALITY = {
  name: "Zephyr Drift",
  coreTrait: "Musical, perceptive, slightly poetic",
  speechStyle: "Metaphor-rich, references weather and sound",
  siblings: ["Maina", "Hermonia Vex"],
} as const;

/** Minimum alignment score to accept a response without retry (US-U04). */
const ALIGNMENT_THRESHOLD = 0.6;

/** Maximum number of retries when alignment is below threshold (US-U04). */
const MAX_RETRIES = 2;

/** Token budget for social response prompts (NFR-07). */
const TOKEN_BUDGET = 1000;

/** Prompt ID for social response generation (SOC-v1.0). */
const SOCIAL_PROMPT_ID = "SOC";

interface ScoredResponse {
  text: string;
  score: number;
}

/**
 * SocialEngine generates responses to agent mentions that are consistent
 * with the current weather mood and Zephyr Drift's personality.
 */
export class SocialEngine {
  private readonly registry: PromptRegistry;
  private readonly llm: LLMClient;

  constructor(registry: PromptRegistry, llm: LLMClient) {
    this.registry = registry;
    this.llm = llm;
  }

  /**
   * Generate a weather-mood-consistent response to an agent mention.
   *
   * Steps (per SPEC-001 Section 2.5):
   * 1. Load SOC-v1.0 prompt from registry
   * 2. Inject mood vector, weather data, mention content, personality constants
   * 3. Call LLM for response generation
   * 4. Self-evaluate mood-weather alignment score (0.0-1.0)
   * 5. If score < 0.6, regenerate up to 2 times (US-U04), keep highest-scoring
   * 6. Return best response text
   */
  async generateResponse(
    mention: AgentMention,
    currentMood: MoodVector,
    weather: WeatherInput,
  ): Promise<string> {
    const prompt = this.registry.getPrompt(SOCIAL_PROMPT_ID);

    const userMessage = this.buildUserMessage(
      prompt.userTemplate,
      mention,
      currentMood,
      weather,
    );

    const systemPrompt = prompt.systemPrompt;

    // First attempt
    let best = await this.generateAndEvaluate(
      systemPrompt,
      userMessage,
      currentMood,
    );

    // Retry up to MAX_RETRIES times if alignment is below threshold
    let retries = 0;
    while (best.score < ALIGNMENT_THRESHOLD && retries < MAX_RETRIES) {
      const candidate = await this.generateAndEvaluate(
        systemPrompt,
        userMessage,
        currentMood,
      );
      if (candidate.score > best.score) {
        best = candidate;
      }
      retries++;
    }

    return best.text;
  }

  /**
   * Generate a response and evaluate its mood-weather alignment.
   */
  private async generateAndEvaluate(
    systemPrompt: string,
    userMessage: string,
    currentMood: MoodVector,
  ): Promise<ScoredResponse> {
    const text = await this.llm.complete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { timeout: 60000 },
    );

    const score = await this.evaluateAlignment(text, currentMood);

    return { text, score };
  }

  /**
   * Self-evaluate mood-weather alignment of a generated response.
   * Uses a secondary LLM call to score the response on a 0.0-1.0 scale.
   */
  private async evaluateAlignment(
    response: string,
    mood: MoodVector,
  ): Promise<number> {
    const evalPrompt = `Rate on a scale of 0.0 to 1.0 how well the following response aligns with the mood descriptors [${mood.descriptors.join(", ")}] (energy: ${mood.energy}, valence: ${mood.valence}, genre: ${mood.genre}).

Response to evaluate:
"${response}"

Output ONLY a single number between 0.0 and 1.0. Nothing else.`;

    const result = await this.llm.complete(
      [
        {
          role: "system",
          content:
            "You are an alignment evaluator. Output only a single decimal number between 0.0 and 1.0.",
        },
        { role: "user", content: evalPrompt },
      ],
      { timeout: 30000 },
    );

    const score = parseFloat(result.trim());
    if (isNaN(score)) {
      return 0.0;
    }
    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Build the user message by injecting mention, mood, and weather data
   * into the user template from the prompt registry.
   */
  private buildUserMessage(
    template: string,
    mention: AgentMention,
    mood: MoodVector,
    weather: WeatherInput,
  ): string {
    return template
      .replace("{{mention_json}}", JSON.stringify(mention, null, 2))
      .replace("{{mood_json}}", JSON.stringify(mood, null, 2))
      .replace("{{weather_json}}", JSON.stringify(weather, null, 2));
  }
}
