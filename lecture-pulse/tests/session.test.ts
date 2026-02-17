import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionManager } from "../server/session";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  // ── Create session ───────────────────────────────────────────

  it("creates a session and returns a 4-char uppercase room code", () => {
    const code = manager.createSession();
    expect(code).toMatch(/^[A-Z]{4}$/);
  });

  it("created session is retrievable via getSession", () => {
    const code = manager.createSession();
    const session = manager.getSession(code);
    expect(session).not.toBeNull();
    expect(session!.roomCode).toBe(code);
    expect(session!.students.size).toBe(0);
    expect(session!.timeline).toEqual([]);
  });

  it("generates unique room codes across multiple sessions", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      codes.add(manager.createSession());
    }
    expect(codes.size).toBe(20);
  });

  // ── Join session ─────────────────────────────────────────────

  it("allows a student to join an existing session", () => {
    const code = manager.createSession();
    const success = manager.joinSession(code, "Alice");
    expect(success).toBe(true);

    const session = manager.getSession(code);
    expect(session!.students.size).toBe(1);
    expect(session!.students.has("Alice")).toBe(true);
  });

  it("joined student has default score of 100 and label good", () => {
    const code = manager.createSession();
    manager.joinSession(code, "Alice");

    const student = manager.getSession(code)!.students.get("Alice");
    expect(student!.score).toBe(100);
    expect(student!.label).toBe("good");
  });

  it("rejects joining a non-existent room", () => {
    const result = manager.joinSession("ZZZZ", "Bob");
    expect(result).toBe(false);
  });

  it("rejects duplicate nickname in the same room", () => {
    const code = manager.createSession();
    expect(manager.joinSession(code, "Alice")).toBe(true);
    expect(manager.joinSession(code, "Alice")).toBe(false);
  });

  it("allows the same nickname in different rooms", () => {
    const code1 = manager.createSession();
    const code2 = manager.createSession();
    expect(manager.joinSession(code1, "Alice")).toBe(true);
    expect(manager.joinSession(code2, "Alice")).toBe(true);
  });

  // ── Leave session ────────────────────────────────────────────

  it("removes a participant when they leave", () => {
    const code = manager.createSession();
    manager.joinSession(code, "Alice");
    manager.joinSession(code, "Bob");
    expect(manager.getSession(code)!.students.size).toBe(2);

    manager.leaveSession(code, "Alice");
    expect(manager.getSession(code)!.students.size).toBe(1);
    expect(manager.getSession(code)!.students.has("Alice")).toBe(false);
    expect(manager.getSession(code)!.students.has("Bob")).toBe(true);
  });

  it("does not throw when leaving a non-existent room", () => {
    expect(() => manager.leaveSession("NOPE", "Alice")).not.toThrow();
  });

  it("does not throw when leaving with unknown nickname", () => {
    const code = manager.createSession();
    expect(() => manager.leaveSession(code, "Ghost")).not.toThrow();
  });

  // ── Update score ─────────────────────────────────────────────

  it("updates a student score and label correctly", () => {
    const code = manager.createSession();
    manager.joinSession(code, "Alice");
    manager.updateScore(code, "Alice", 55, 12, 0.05);

    const student = manager.getSession(code)!.students.get("Alice");
    expect(student!.score).toBe(55);
    expect(student!.label).toBe("fair");
    expect(student!.headTilt).toBe(12);
    expect(student!.shoulderDelta).toBe(0.05);
  });

  it("updates label to poor when score < 40", () => {
    const code = manager.createSession();
    manager.joinSession(code, "Alice");
    manager.updateScore(code, "Alice", 25, 30, 0.1);

    const student = manager.getSession(code)!.students.get("Alice");
    expect(student!.label).toBe("poor");
  });

  it("updates label to good when score >= 70", () => {
    const code = manager.createSession();
    manager.joinSession(code, "Alice");
    manager.updateScore(code, "Alice", 85, 2, 0.01);

    const student = manager.getSession(code)!.students.get("Alice");
    expect(student!.label).toBe("good");
  });

  it("does not throw when updating score for non-existent room", () => {
    expect(() => manager.updateScore("NOPE", "Alice", 50, 0, 0)).not.toThrow();
  });

  it("does not throw when updating score for non-existent student", () => {
    const code = manager.createSession();
    expect(() => manager.updateScore(code, "Ghost", 50, 0, 0)).not.toThrow();
  });

  // ── End session ──────────────────────────────────────────────

  it("removes a session when ended", () => {
    const code = manager.createSession();
    manager.joinSession(code, "Alice");
    manager.endSession(code);

    expect(manager.getSession(code)).toBeNull();
  });

  it("does not throw when ending a non-existent session", () => {
    expect(() => manager.endSession("NOPE")).not.toThrow();
  });

  // ── Get non-existent session ─────────────────────────────────

  it("returns null for a non-existent session", () => {
    expect(manager.getSession("XXXX")).toBeNull();
  });

  // ── getAllSessions ───────────────────────────────────────────

  it("returns all active sessions", () => {
    manager.createSession();
    manager.createSession();
    manager.createSession();
    expect(manager.getAllSessions().size).toBe(3);
  });
});
