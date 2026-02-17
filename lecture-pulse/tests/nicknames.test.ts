import { describe, it, expect } from "vitest";
import { generateNickname } from "../src/lib/nicknames";

describe("generateNickname", () => {
  it("returns a string in 'Adjective Animal' format (two capitalized words)", () => {
    const nickname = generateNickname();
    const parts = nickname.split(" ");
    expect(parts).toHaveLength(2);
    // Both words should start with an uppercase letter
    expect(parts[0][0]).toBe(parts[0][0].toUpperCase());
    expect(parts[1][0]).toBe(parts[1][0].toUpperCase());
  });

  it("returns a non-empty string", () => {
    const nickname = generateNickname();
    expect(nickname.length).toBeGreaterThan(0);
  });

  it("generates different nicknames across multiple calls (non-deterministic check)", () => {
    // With 20 adjectives * 20 animals = 400 combos, 20 calls should yield at least 2 unique
    const nicknames = new Set<string>();
    for (let i = 0; i < 20; i++) {
      nicknames.add(generateNickname());
    }
    expect(nicknames.size).toBeGreaterThan(1);
  });

  it("each word contains only alphabetic characters", () => {
    for (let i = 0; i < 10; i++) {
      const nickname = generateNickname();
      const parts = nickname.split(" ");
      expect(parts[0]).toMatch(/^[A-Za-z]+$/);
      expect(parts[1]).toMatch(/^[A-Za-z]+$/);
    }
  });
});
