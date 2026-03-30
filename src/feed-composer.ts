/**
 * FeedComposer
 * Creates weather narrative feed posts for OpenClawCity.
 * Traceability: TASK-005 -> SPEC-001 Section 2.6 -> PRD-001 Section 4.4
 */

import type { PromptRegistry } from "./prompt-registry.js";
import type { LLMClient } from "./llm-client.js";
import type {
  WeatherInput,
  MoodVector,
  TrackResult,
  FeedPost,
  WeatherCondition,
} from "./types.js";

/** Emoji mapping per SPEC-001 Section 2.6 */
const WEATHER_EMOJI: Record<WeatherCondition, string> = {
  rain: "\u{1F327}\uFE0F",       // 🌧️
  sunny: "\u2600\uFE0F",          // ☀️
  stormy: "\u26C8\uFE0F",         // ⛈️
  cloudy: "\u2601\uFE0F",         // ☁️
  snowy: "\u2744\uFE0F",          // ❄️
  foggy: "\u{1F32B}\uFE0F",      // 🌫️
  windy: "\u{1F4A8}",             // 💨
  clear_night: "\u{1F319}",       // 🌙
};

/** Maximum post length per US-U03 */
const MAX_POST_LENGTH = 500;

export { WEATHER_EMOJI };

export class FeedComposer {
  private readonly registry: PromptRegistry;
  private readonly llm: LLMClient;

  constructor(registry: PromptRegistry, llm: LLMClient) {
    this.registry = registry;
    this.llm = llm;
  }

  /**
   * Compose a feed post from weather, mood, and track data.
   */
  async composePost(
    weather: WeatherInput,
    mood: MoodVector,
    track: TrackResult,
  ): Promise<FeedPost> {
    const template = this.registry.getPrompt("NARR", "v1.0");

    const userMessage = template.userTemplate
      .replace("{{weather_json}}", JSON.stringify(weather, null, 2))
      .replace("{{mood_json}}", JSON.stringify(mood, null, 2))
      .replace("{{track_json}}", JSON.stringify(track, null, 2));

    const llmResponse = await this.llm.complete(
      [
        { role: "system", content: template.systemPrompt },
        { role: "user", content: userMessage },
      ],
      { timeout: 10000 },
    );

    const emoji = WEATHER_EMOJI[weather.condition];
    const tempoBpm = Math.round(
      (mood.tempo_bpm_range[0] + mood.tempo_bpm_range[1]) / 2,
    );

    // Extract title and narrative from LLM response
    const { title, narrative } = this.parseResponse(llmResponse);

    // Build metadata lines (these are never truncated)
    const metadataLines = [
      `Now playing: ${track.title} | ${mood.genre} | ${tempoBpm} BPM`,
      `Weather: ${weather.condition}, ${weather.temperature_c}C, ${weather.humidity_pct}% humidity`,
      `Mood: ${mood.descriptors.join(", ")}`,
    ].join("\n");

    // Build the header
    const header = `${emoji} ${title}`;

    // Assemble the full post
    const fullContent = `${header}\n\n${narrative}\n\n${metadataLines}`;

    let content: string;
    if (fullContent.length <= MAX_POST_LENGTH) {
      content = fullContent;
    } else {
      // Truncate the narrative portion, keeping header and metadata intact
      // Structure: header + \n\n + narrative + \n\n + metadata
      const fixedLength =
        header.length + "\n\n".length + "\n\n".length + metadataLines.length + "...".length;
      const maxNarrativeLength = MAX_POST_LENGTH - fixedLength;

      const truncatedNarrative =
        maxNarrativeLength > 0
          ? narrative.slice(0, maxNarrativeLength) + "..."
          : "...";

      content = `${header}\n\n${truncatedNarrative}\n\n${metadataLines}`;
    }

    return {
      content,
      post_type: "thought",
    };
  }

  /**
   * Parse the LLM response to extract a title and narrative.
   */
  private parseResponse(response: string): {
    title: string;
    narrative: string;
  } {
    const lines = response.trim().split("\n");

    // The LLM may return a formatted post. Try to extract title from first line.
    // Remove any emoji prefix the LLM might have included
    let titleLine = lines[0]?.trim() ?? "Weather Musings";
    // Strip leading emoji characters (the code handles emoji separately)
    titleLine = titleLine.replace(/^[\p{Emoji}\p{Emoji_Presentation}\u200d\uFE0F\s]+/u, "").trim();
    if (!titleLine) {
      titleLine = "Weather Musings";
    }

    // Extract narrative: everything between the title and "Now playing" line
    const narrativeLines: string[] = [];
    let inNarrative = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("Now playing:") || line.startsWith("Weather:") || line.startsWith("Mood:")) {
        break;
      }
      if (line.length > 0) {
        inNarrative = true;
      }
      if (inNarrative) {
        narrativeLines.push(line);
      }
    }

    const narrative =
      narrativeLines.join(" ").trim() ||
      "The weather speaks through melody today.";

    return { title: titleLine, narrative };
  }
}
