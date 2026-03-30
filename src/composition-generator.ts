/**
 * CompositionGenerator
 * Translates mood vectors into music studio prompts.
 * Traceability: TASK-005 -> SPEC-001 Section 2.3 -> PRD-001 Section 4.2
 */

import type { PromptRegistry } from "./prompt-registry.js";
import type { LLMClient } from "./llm-client.js";
import type { MoodVector, WeatherInput, CompositionPrompt, Genre } from "./types.js";

/** Genre-to-instruments mapping per SPEC-001 Section 2.3 */
const INSTRUMENTATION_MAP: Record<Genre, string[]> = {
  "lo-fi": ["vinyl crackle", "muted piano", "soft drums", "tape hiss"],
  jazz: ["piano", "upright bass", "brushed drums", "saxophone"],
  electronic: ["synth pads", "arpeggiated sequences", "kick drum", "hi-hats"],
  classical: ["strings", "piano", "woodwinds", "gentle percussion"],
  ambient: ["pad layers", "field recordings", "reverb swells", "drones"],
  rock: ["electric guitar", "bass", "drums", "distortion"],
  folk: ["acoustic guitar", "violin", "hand drums", "flute"],
};

/**
 * Map energy value to a descriptor.
 * 0.0-0.3 = "low", 0.3-0.6 = "moderate", 0.6-0.8 = "high", 0.8-1.0 = "intense"
 */
export function getEnergyDescriptor(energy: number): string {
  if (energy < 0.3) return "low";
  if (energy < 0.6) return "moderate";
  if (energy < 0.8) return "high";
  return "intense";
}

export class CompositionGenerator {
  private readonly registry: PromptRegistry;
  private readonly llm: LLMClient;

  constructor(registry: PromptRegistry, llm: LLMClient) {
    this.registry = registry;
    this.llm = llm;
  }

  /**
   * Generate a composition prompt from mood vector and weather data.
   */
  async generatePrompt(
    mood: MoodVector,
    weather: WeatherInput,
  ): Promise<CompositionPrompt> {
    const template = this.registry.getPrompt("COMP", "v1.0");

    const tempoBpm = Math.round(
      (mood.tempo_bpm_range[0] + mood.tempo_bpm_range[1]) / 2,
    );

    const energyDescriptor = getEnergyDescriptor(mood.energy);
    const instruments = INSTRUMENTATION_MAP[mood.genre];
    const descriptorsStr = mood.descriptors.join(", ");

    // Inject mood and weather into the user template
    const userMessage = template.userTemplate
      .replace("{{mood_json}}", JSON.stringify(mood, null, 2))
      .replace("{{weather_json}}", JSON.stringify(weather, null, 2));

    // Call LLM to generate the creative narrative fragment and title
    const llmResponse = await this.llm.complete(
      [
        { role: "system", content: template.systemPrompt },
        { role: "user", content: userMessage },
      ],
      { timeout: 10000 },
    );

    // Extract title from LLM response (first line or generate from descriptors)
    const title = this.extractTitle(llmResponse, mood, weather);

    // Build the composition prompt per SPEC-001 Section 2.3 output format
    const weatherNarrative = this.extractNarrative(llmResponse);

    const prompt = [
      `Compose a ${mood.genre} track at ${tempoBpm} BPM with ${energyDescriptor} energy.`,
      `Mood: ${descriptorsStr}.`,
      `Inspired by: ${weatherNarrative}.`,
      `Instrumentation hints: ${instruments.join(", ")}.`,
      `Duration: 2-4 minutes.`,
    ].join("\n");

    return {
      title,
      prompt,
      genre: mood.genre,
      tempo_bpm: tempoBpm,
    };
  }

  /**
   * Extract a creative title from the LLM response.
   * Falls back to generating one from mood descriptors and weather.
   */
  private extractTitle(
    llmResponse: string,
    mood: MoodVector,
    weather: WeatherInput,
  ): string {
    // Try to find a title-like line in the LLM response
    const lines = llmResponse.trim().split("\n").filter((l) => l.trim());

    // Look for a line that looks like a title (often the first non-empty line
    // or a line starting with "Title:")
    for (const line of lines) {
      const titleMatch = line.match(/^(?:Title:\s*)?["']?(.+?)["']?\s*$/);
      if (titleMatch && titleMatch[1].length <= 80 && !titleMatch[1].includes("Compose a")) {
        return titleMatch[1].trim();
      }
      break; // Only check the first non-empty line
    }

    // Fallback: construct from mood and weather
    const descriptor = mood.descriptors[0] ?? "unknown";
    return `${descriptor.charAt(0).toUpperCase() + descriptor.slice(1)} ${weather.condition.replace("_", " ")}`;
  }

  /**
   * Extract a weather narrative fragment from the LLM response.
   */
  private extractNarrative(llmResponse: string): string {
    // Look for "Inspired by:" line in the LLM output
    const inspiredMatch = llmResponse.match(/Inspired by:\s*(.+?)(?:\n|$)/);
    if (inspiredMatch) {
      return inspiredMatch[1].trim().replace(/\.$/, "");
    }

    // Otherwise use the full response as a narrative fragment, trimmed
    const lines = llmResponse.trim().split("\n").filter((l) => l.trim());
    // Skip title line, take the narrative content
    const narrativeLines = lines.length > 1 ? lines.slice(1) : lines;
    const narrative = narrativeLines
      .map((l) => l.trim())
      .filter((l) => !l.startsWith("Compose a") && !l.startsWith("Instrumentation") && !l.startsWith("Duration"))
      .join(" ")
      .trim();

    return narrative || "the weather whispers its melody";
  }
}
