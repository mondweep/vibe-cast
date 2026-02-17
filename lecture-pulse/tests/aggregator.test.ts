import { describe, it, expect } from "vitest";
import { aggregateStats } from "../server/aggregator";
import type { Session, Student } from "../src/types";

// ─── Helpers ─────────────────────────────────────────────────────

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: "s1",
    nickname: "TestUser",
    score: 80,
    label: "good",
    headTilt: 0,
    shoulderDelta: 0,
    lastUpdate: Date.now(),
    ...overrides,
  };
}

function makeSession(
  students: Map<string, Student>,
  timeline: Session["timeline"] = [],
): Session {
  return {
    roomCode: "TEST",
    students,
    timeline,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────

describe("aggregateStats", () => {
  // ── Empty session ────────────────────────────────────────────

  it("returns all zeros for empty session (0 participants)", () => {
    const result = aggregateStats(makeSession(new Map()));
    expect(result.participantCount).toBe(0);
    expect(result.averageScore).toBe(0);
    expect(result.distribution).toEqual({ good: 0, fair: 0, poor: 0 });
    expect(result.leaderboard).toEqual([]);
  });

  it("returns existing timeline even when session is empty", () => {
    const timeline = [{ time: "10:00:00", score: 75 }];
    const result = aggregateStats(makeSession(new Map(), timeline));
    expect(result.timeline).toEqual(timeline);
  });

  // ── Single participant ───────────────────────────────────────

  it("computes correct stats for a single participant", () => {
    const students = new Map<string, Student>([
      ["s1", makeStudent({ id: "s1", nickname: "Alice", score: 85, label: "good" })],
    ]);
    const result = aggregateStats(makeSession(students));
    expect(result.participantCount).toBe(1);
    expect(result.averageScore).toBe(85);
    expect(result.distribution.good).toBe(1);
    expect(result.distribution.fair).toBe(0);
    expect(result.distribution.poor).toBe(0);
    expect(result.leaderboard).toHaveLength(1);
    expect(result.leaderboard[0]).toEqual({ nickname: "Alice", score: 85 });
  });

  // ── Multiple participants ────────────────────────────────────

  it("computes correct average, distribution, and leaderboard for multiple students", () => {
    const students = new Map<string, Student>([
      ["s1", makeStudent({ id: "s1", nickname: "A", score: 90, label: "good" })],
      ["s2", makeStudent({ id: "s2", nickname: "B", score: 50, label: "fair" })],
      ["s3", makeStudent({ id: "s3", nickname: "C", score: 20, label: "poor" })],
    ]);
    const result = aggregateStats(makeSession(students));

    expect(result.participantCount).toBe(3);
    // Average: (90 + 50 + 20) / 3 = 53.333... → rounded to 53.3
    expect(result.averageScore).toBeCloseTo(53.3, 0);

    expect(result.distribution.good).toBe(1);
    expect(result.distribution.fair).toBe(1);
    expect(result.distribution.poor).toBe(1);

    // Leaderboard sorted descending
    expect(result.leaderboard[0].nickname).toBe("A");
    expect(result.leaderboard[0].score).toBe(90);
    expect(result.leaderboard[2].nickname).toBe("C");
    expect(result.leaderboard[2].score).toBe(20);
  });

  // ── More than 5 participants → leaderboard capped at 5 ──────

  it("caps leaderboard at 5 when more than 5 participants exist", () => {
    const students = new Map<string, Student>();
    for (let i = 0; i < 8; i++) {
      const score = (i + 1) * 10; // 10, 20, 30, 40, 50, 60, 70, 80
      students.set(`s${i}`, makeStudent({
        id: `s${i}`,
        nickname: `User${i}`,
        score,
        label: score >= 70 ? "good" : score >= 40 ? "fair" : "poor",
      }));
    }
    const result = aggregateStats(makeSession(students));

    expect(result.participantCount).toBe(8);
    expect(result.leaderboard).toHaveLength(5);
    // Top score should be 80, bottom of leaderboard should be 40
    expect(result.leaderboard[0].score).toBe(80);
    expect(result.leaderboard[4].score).toBe(40);
  });

  it("leaderboard is sorted by score descending", () => {
    const students = new Map<string, Student>([
      ["s1", makeStudent({ id: "s1", nickname: "Low", score: 30, label: "poor" })],
      ["s2", makeStudent({ id: "s2", nickname: "Mid", score: 60, label: "fair" })],
      ["s3", makeStudent({ id: "s3", nickname: "High", score: 95, label: "good" })],
    ]);
    const result = aggregateStats(makeSession(students));

    expect(result.leaderboard[0].nickname).toBe("High");
    expect(result.leaderboard[1].nickname).toBe("Mid");
    expect(result.leaderboard[2].nickname).toBe("Low");
  });

  // ── All participants in same category ────────────────────────

  it("handles all participants in good category", () => {
    const students = new Map<string, Student>([
      ["s1", makeStudent({ id: "s1", nickname: "A", score: 90, label: "good" })],
      ["s2", makeStudent({ id: "s2", nickname: "B", score: 85, label: "good" })],
      ["s3", makeStudent({ id: "s3", nickname: "C", score: 75, label: "good" })],
    ]);
    const result = aggregateStats(makeSession(students));

    expect(result.distribution.good).toBe(3);
    expect(result.distribution.fair).toBe(0);
    expect(result.distribution.poor).toBe(0);
  });

  it("handles all participants in poor category", () => {
    const students = new Map<string, Student>([
      ["s1", makeStudent({ id: "s1", nickname: "A", score: 10, label: "poor" })],
      ["s2", makeStudent({ id: "s2", nickname: "B", score: 20, label: "poor" })],
      ["s3", makeStudent({ id: "s3", nickname: "C", score: 5, label: "poor" })],
    ]);
    const result = aggregateStats(makeSession(students));

    expect(result.distribution.good).toBe(0);
    expect(result.distribution.fair).toBe(0);
    expect(result.distribution.poor).toBe(3);
  });

  it("handles all participants in fair category", () => {
    const students = new Map<string, Student>([
      ["s1", makeStudent({ id: "s1", nickname: "A", score: 45, label: "fair" })],
      ["s2", makeStudent({ id: "s2", nickname: "B", score: 60, label: "fair" })],
      ["s3", makeStudent({ id: "s3", nickname: "C", score: 55, label: "fair" })],
    ]);
    const result = aggregateStats(makeSession(students));

    expect(result.distribution.good).toBe(0);
    expect(result.distribution.fair).toBe(3);
    expect(result.distribution.poor).toBe(0);
  });

  // ── Message type ─────────────────────────────────────────────

  it("includes type: dashboard_state in the result", () => {
    const result = aggregateStats(makeSession(new Map()));
    expect(result.type).toBe("dashboard_state");
  });
});
