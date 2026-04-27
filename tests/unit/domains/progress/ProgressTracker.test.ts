import {
  createProgressTracker,
  recordLessonComplete,
  getModuleProgress,
  recordModuleScore,
} from "@/domains/progress/entities/ProgressTracker";

describe("ProgressTracker — London School TDD", () => {
  const learnerId = "learner-001";

  describe("createProgressTracker", () => {
    it("initialises with zero progress", () => {
      const tracker = createProgressTracker(learnerId);
      expect(tracker.learnerId).toBe(learnerId);
      expect(tracker.completionEvents).toHaveLength(0);
      expect(tracker.totalMinutesSpent).toBe(0);
    });
  });

  describe("recordLessonComplete", () => {
    it("adds a completion event and accumulates time", () => {
      const tracker = createProgressTracker(learnerId);
      const event = {
        moduleId: "M01",
        lessonId: "L01",
        completedAt: new Date(),
        timeSpentMinutes: 25,
      };
      const updated = recordLessonComplete(tracker, event);
      expect(updated.completionEvents).toHaveLength(1);
      expect(updated.totalMinutesSpent).toBe(25);
    });

    it("is idempotent — does not double-record the same lesson", () => {
      const tracker = createProgressTracker(learnerId);
      const event = { moduleId: "M01", lessonId: "L01", completedAt: new Date(), timeSpentMinutes: 25 };
      const once = recordLessonComplete(tracker, event);
      const twice = recordLessonComplete(once, event);
      expect(twice.completionEvents).toHaveLength(1);
    });
  });

  describe("getModuleProgress", () => {
    it("returns 0 when no lessons completed", () => {
      const tracker = createProgressTracker(learnerId);
      expect(getModuleProgress(tracker, "M01", 5)).toBe(0);
    });

    it("returns 100 when all lessons completed", () => {
      let tracker = createProgressTracker(learnerId);
      for (let i = 1; i <= 3; i++) {
        tracker = recordLessonComplete(tracker, {
          moduleId: "M01", lessonId: `L0${i}`, completedAt: new Date(), timeSpentMinutes: 10,
        });
      }
      expect(getModuleProgress(tracker, "M01", 3)).toBe(100);
    });

    it("returns 0 when totalLessons is 0 (guard against division by zero)", () => {
      const tracker = createProgressTracker(learnerId);
      expect(getModuleProgress(tracker, "M01", 0)).toBe(0);
    });
  });

  describe("recordModuleScore", () => {
    it("records a valid score", () => {
      const tracker = createProgressTracker(learnerId);
      const updated = recordModuleScore(tracker, "M01", 87);
      expect(updated.moduleScores["M01"]).toBe(87);
    });

    it("throws on score above 100", () => {
      const tracker = createProgressTracker(learnerId);
      expect(() => recordModuleScore(tracker, "M01", 101)).toThrow("Score must be 0–100");
    });

    it("throws on negative score", () => {
      const tracker = createProgressTracker(learnerId);
      expect(() => recordModuleScore(tracker, "M01", -1)).toThrow("Score must be 0–100");
    });
  });
});
