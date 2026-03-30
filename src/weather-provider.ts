import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { WeatherInput, WeatherProvider, WeatherCondition, TimeOfDay } from "./types.js";

/** Hardcoded default weather per SPEC-001 Error Handling Matrix */
const DEFAULT_WEATHER: WeatherInput = {
  condition: "cloudy",
  temperature_c: 15,
  humidity_pct: 60,
  wind_speed_kmh: 10,
  time_of_day: "afternoon",
  timestamp: new Date().toISOString(),
};

const VALID_CONDITIONS: WeatherCondition[] = [
  "rain", "sunny", "stormy", "cloudy", "snowy", "foggy", "windy", "clear_night",
];

const VALID_TIMES: TimeOfDay[] = ["morning", "afternoon", "evening", "night"];

/**
 * Validates that an object conforms to the WeatherInput interface shape.
 * Returns true if valid, false otherwise.
 */
function isValidWeatherInput(obj: unknown): obj is WeatherInput {
  if (typeof obj !== "object" || obj === null) return false;
  const w = obj as Record<string, unknown>;

  if (!VALID_CONDITIONS.includes(w.condition as WeatherCondition)) return false;
  if (typeof w.temperature_c !== "number") return false;
  if (typeof w.humidity_pct !== "number") return false;
  if (typeof w.wind_speed_kmh !== "number") return false;
  if (!VALID_TIMES.includes(w.time_of_day as TimeOfDay)) return false;
  if (typeof w.timestamp !== "string") return false;

  return true;
}

export interface SimulatedWeatherProviderOptions {
  /** Path to the fixture JSON file. Defaults to config/weather-fixtures.json relative to project root. */
  fixturePath?: string;
  /** Rotation interval in milliseconds. Defaults to 600_000 (10 minutes per PRD A-06). */
  rotationIntervalMs?: number;
}

/**
 * SimulatedWeatherProvider - MVP implementation of WeatherProvider.
 *
 * Loads weather scenarios from a JSON fixture file and rotates through them.
 * Per SPEC-001 Section 2.1: rotates on a configurable interval (default 10 min).
 * Per SPEC-001 Error Handling Matrix: returns hardcoded default on missing/invalid fixtures.
 */
export class SimulatedWeatherProvider implements WeatherProvider {
  private fixtures: WeatherInput[] = [];
  private currentIndex: number = 0;
  private lastRotationTime: number = 0;
  private readonly fixturePath: string;
  private readonly rotationIntervalMs: number;
  private loaded: boolean = false;

  constructor(options: SimulatedWeatherProviderOptions = {}) {
    this.fixturePath = options.fixturePath ?? resolve(process.cwd(), "config/weather-fixtures.json");
    this.rotationIntervalMs = options.rotationIntervalMs ?? 600_000;
  }

  /**
   * Load fixtures from the JSON file. Validates each entry and skips invalid ones.
   * If the file is missing, malformed, or contains no valid entries, falls back to defaults.
   */
  loadFixtures(): void {
    try {
      const raw = readFileSync(this.fixturePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        console.error(`Weather fixtures at ${this.fixturePath} is not an array. Using default.`);
        this.fixtures = [];
        this.loaded = true;
        return;
      }

      const valid: WeatherInput[] = [];
      for (let i = 0; i < parsed.length; i++) {
        if (isValidWeatherInput(parsed[i])) {
          valid.push(parsed[i] as WeatherInput);
        } else {
          console.warn(`Weather fixture at index ${i} is invalid, skipping.`);
        }
      }

      this.fixtures = valid;

      if (this.fixtures.length === 0) {
        console.error("No valid weather fixtures found. getCurrentWeather() will return default.");
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Failed to load weather fixtures from ${this.fixturePath}: ${err.message}`);
      }
      this.fixtures = [];
    }

    this.loaded = true;
  }

  /**
   * Returns the current weather fixture, advancing to the next one
   * when the rotation interval has elapsed.
   *
   * If no valid fixtures are loaded, returns the hardcoded default.
   */
  async getCurrentWeather(): Promise<WeatherInput> {
    if (!this.loaded) {
      this.loadFixtures();
    }

    if (this.fixtures.length === 0) {
      return { ...DEFAULT_WEATHER, timestamp: new Date().toISOString() };
    }

    const now = Date.now();

    if (this.lastRotationTime === 0) {
      // First call - initialize
      this.lastRotationTime = now;
    } else if (now - this.lastRotationTime >= this.rotationIntervalMs) {
      // Interval elapsed - rotate
      this.currentIndex = (this.currentIndex + 1) % this.fixtures.length;
      this.lastRotationTime = now;
    }

    return { ...this.fixtures[this.currentIndex] };
  }

  /** Returns the number of loaded fixtures (useful for testing). */
  get fixtureCount(): number {
    if (!this.loaded) {
      this.loadFixtures();
    }
    return this.fixtures.length;
  }

  /**
   * Force advance to the next fixture, ignoring the rotation interval.
   * Useful for testing rotation behavior.
   */
  advance(): void {
    if (!this.loaded) {
      this.loadFixtures();
    }
    if (this.fixtures.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.fixtures.length;
      this.lastRotationTime = Date.now();
    }
  }
}
