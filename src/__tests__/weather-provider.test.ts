import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { SimulatedWeatherProvider } from "../weather-provider.js";
import type { WeatherInput } from "../types.js";

const FIXTURES_PATH = resolve(process.cwd(), "config/weather-fixtures.json");
const TMP_DIR = resolve(process.cwd(), "config/.test-tmp");
const TMP_FIXTURES = resolve(TMP_DIR, "test-fixtures.json");

/** Helper to create a valid WeatherInput fixture */
function makeFixture(overrides: Partial<WeatherInput> = {}): WeatherInput {
  return {
    condition: "rain",
    temperature_c: 12,
    humidity_pct: 85,
    wind_speed_kmh: 8,
    time_of_day: "night",
    timestamp: "2026-03-30T22:00:00Z",
    ...overrides,
  };
}

function writeTmpFixtures(data: unknown): string {
  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(TMP_FIXTURES, JSON.stringify(data), "utf-8");
  return TMP_FIXTURES;
}

function cleanupTmp(): void {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

describe("SimulatedWeatherProvider", () => {
  beforeEach(() => {
    cleanupTmp();
  });

  describe("fixture loading (happy path)", () => {
    it("loads fixtures from the default config path", async () => {
      const provider = new SimulatedWeatherProvider();
      const weather = await provider.getCurrentWeather();

      expect(weather).toBeDefined();
      expect(weather.condition).toBeDefined();
      expect(weather.temperature_c).toBeTypeOf("number");
      expect(weather.humidity_pct).toBeTypeOf("number");
      expect(weather.wind_speed_kmh).toBeTypeOf("number");
      expect(weather.time_of_day).toBeDefined();
      expect(weather.timestamp).toBeTypeOf("string");
    });

    it("loads fixtures from a custom path", async () => {
      const fixtures = [makeFixture({ condition: "sunny", temperature_c: 30 })];
      const path = writeTmpFixtures(fixtures);

      const provider = new SimulatedWeatherProvider({ fixturePath: path });
      const weather = await provider.getCurrentWeather();

      expect(weather.condition).toBe("sunny");
      expect(weather.temperature_c).toBe(30);
    });

    it("reports the correct fixture count", () => {
      const fixtures = [
        makeFixture({ condition: "rain" }),
        makeFixture({ condition: "sunny" }),
        makeFixture({ condition: "cloudy" }),
      ];
      const path = writeTmpFixtures(fixtures);

      const provider = new SimulatedWeatherProvider({ fixturePath: path });
      expect(provider.fixtureCount).toBe(3);
    });
  });

  describe("rotation through fixtures", () => {
    it("returns the first fixture on initial call", async () => {
      const fixtures = [
        makeFixture({ condition: "rain" }),
        makeFixture({ condition: "sunny" }),
      ];
      const path = writeTmpFixtures(fixtures);

      const provider = new SimulatedWeatherProvider({ fixturePath: path });
      const weather = await provider.getCurrentWeather();

      expect(weather.condition).toBe("rain");
    });

    it("rotates through all fixtures using advance()", async () => {
      const conditions = ["rain", "sunny", "stormy", "cloudy"] as const;
      const fixtures = conditions.map((c) => makeFixture({ condition: c }));
      const path = writeTmpFixtures(fixtures);

      const provider = new SimulatedWeatherProvider({ fixturePath: path });

      for (const expected of conditions) {
        const weather = await provider.getCurrentWeather();
        expect(weather.condition).toBe(expected);
        provider.advance();
      }
    });

    it("wraps back to the first fixture after exhausting all", async () => {
      const fixtures = [
        makeFixture({ condition: "rain" }),
        makeFixture({ condition: "sunny" }),
      ];
      const path = writeTmpFixtures(fixtures);

      const provider = new SimulatedWeatherProvider({ fixturePath: path });

      // First fixture
      let weather = await provider.getCurrentWeather();
      expect(weather.condition).toBe("rain");

      // Advance to second
      provider.advance();
      weather = await provider.getCurrentWeather();
      expect(weather.condition).toBe("sunny");

      // Advance wraps back to first
      provider.advance();
      weather = await provider.getCurrentWeather();
      expect(weather.condition).toBe("rain");
    });

    it("respects rotation interval - returns same fixture within interval", async () => {
      const fixtures = [
        makeFixture({ condition: "rain" }),
        makeFixture({ condition: "sunny" }),
      ];
      const path = writeTmpFixtures(fixtures);

      const provider = new SimulatedWeatherProvider({
        fixturePath: path,
        rotationIntervalMs: 60_000, // 1 minute
      });

      const first = await provider.getCurrentWeather();
      const second = await provider.getCurrentWeather();

      // Both calls within the interval should return the same fixture
      expect(first.condition).toBe(second.condition);
    });

    it("advances fixture when rotation interval elapses", async () => {
      const fixtures = [
        makeFixture({ condition: "rain" }),
        makeFixture({ condition: "sunny" }),
      ];
      const path = writeTmpFixtures(fixtures);

      const provider = new SimulatedWeatherProvider({
        fixturePath: path,
        rotationIntervalMs: 50, // 50ms for fast test
      });

      const first = await provider.getCurrentWeather();
      expect(first.condition).toBe("rain");

      // Wait for interval to elapse
      await new Promise((r) => setTimeout(r, 60));

      const second = await provider.getCurrentWeather();
      expect(second.condition).toBe("sunny");
    });
  });

  describe("error handling", () => {
    it("returns hardcoded default for missing fixture file", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const provider = new SimulatedWeatherProvider({
        fixturePath: "/nonexistent/path/fixtures.json",
      });

      const weather = await provider.getCurrentWeather();

      expect(weather.condition).toBe("cloudy");
      expect(weather.temperature_c).toBe(15);
      expect(weather.humidity_pct).toBe(60);
      expect(weather.wind_speed_kmh).toBe(10);
      expect(weather.time_of_day).toBe("afternoon");

      consoleSpy.mockRestore();
    });

    it("returns hardcoded default for malformed JSON", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mkdirSync(TMP_DIR, { recursive: true });
      writeFileSync(TMP_FIXTURES, "not valid json {{{", "utf-8");

      const provider = new SimulatedWeatherProvider({ fixturePath: TMP_FIXTURES });
      const weather = await provider.getCurrentWeather();

      expect(weather.condition).toBe("cloudy");
      expect(weather.temperature_c).toBe(15);

      consoleSpy.mockRestore();
    });

    it("returns hardcoded default for empty fixture array", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const path = writeTmpFixtures([]);

      const provider = new SimulatedWeatherProvider({ fixturePath: path });
      const weather = await provider.getCurrentWeather();

      expect(weather.condition).toBe("cloudy");
      expect(weather.temperature_c).toBe(15);

      consoleSpy.mockRestore();
    });

    it("skips invalid entries and keeps valid ones", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const data = [
        makeFixture({ condition: "rain" }),
        { condition: "invalid_condition", temperature_c: 10 }, // invalid
        makeFixture({ condition: "sunny" }),
      ];
      const path = writeTmpFixtures(data);

      const provider = new SimulatedWeatherProvider({ fixturePath: path });
      expect(provider.fixtureCount).toBe(2);

      const weather = await provider.getCurrentWeather();
      expect(weather.condition).toBe("rain");

      provider.advance();
      const second = await provider.getCurrentWeather();
      expect(second.condition).toBe("sunny");

      consoleSpy.mockRestore();
    });

    it("returns default when fixture file is not an array", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const path = writeTmpFixtures({ not: "an array" });

      const provider = new SimulatedWeatherProvider({ fixturePath: path });
      const weather = await provider.getCurrentWeather();

      expect(weather.condition).toBe("cloudy");

      consoleSpy.mockRestore();
    });
  });

  describe("WeatherInput shape validation", () => {
    it("returned data matches the WeatherInput interface shape", async () => {
      const provider = new SimulatedWeatherProvider();
      const weather = await provider.getCurrentWeather();

      // Check all required fields exist and have correct types
      expect(weather).toHaveProperty("condition");
      expect(weather).toHaveProperty("temperature_c");
      expect(weather).toHaveProperty("humidity_pct");
      expect(weather).toHaveProperty("wind_speed_kmh");
      expect(weather).toHaveProperty("time_of_day");
      expect(weather).toHaveProperty("timestamp");

      // Validate condition is one of the 8 allowed values
      const validConditions = [
        "rain", "sunny", "stormy", "cloudy", "snowy", "foggy", "windy", "clear_night",
      ];
      expect(validConditions).toContain(weather.condition);

      // Validate time_of_day
      const validTimes = ["morning", "afternoon", "evening", "night"];
      expect(validTimes).toContain(weather.time_of_day);

      // Validate numeric fields
      expect(weather.temperature_c).toBeTypeOf("number");
      expect(weather.humidity_pct).toBeTypeOf("number");
      expect(weather.wind_speed_kmh).toBeTypeOf("number");

      // Validate timestamp is a string (ISO 8601)
      expect(weather.timestamp).toBeTypeOf("string");
    });

    it("returns a copy, not a reference to internal state", async () => {
      const fixtures = [makeFixture({ condition: "rain" })];
      const path = writeTmpFixtures(fixtures);

      const provider = new SimulatedWeatherProvider({ fixturePath: path });

      const first = await provider.getCurrentWeather();
      first.condition = "sunny"; // mutate the returned object

      const second = await provider.getCurrentWeather();
      expect(second.condition).toBe("rain"); // should be unchanged
    });
  });

  describe("default fixture file coverage", () => {
    it("config/weather-fixtures.json has at least 8 entries", () => {
      const provider = new SimulatedWeatherProvider();
      expect(provider.fixtureCount).toBeGreaterThanOrEqual(8);
    });

    it("config/weather-fixtures.json covers all 8 weather conditions", async () => {
      const provider = new SimulatedWeatherProvider();
      const conditions = new Set<string>();

      for (let i = 0; i < provider.fixtureCount; i++) {
        const weather = await provider.getCurrentWeather();
        conditions.add(weather.condition);
        provider.advance();
      }

      const expected = [
        "rain", "sunny", "stormy", "cloudy", "snowy", "foggy", "windy", "clear_night",
      ];
      for (const c of expected) {
        expect(conditions.has(c), `Missing condition: ${c}`).toBe(true);
      }
    });
  });
});
