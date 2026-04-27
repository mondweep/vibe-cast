import { createLearner, updatePersona } from "@/domains/learner/entities/Learner";

describe("Learner entity — London School TDD", () => {
  describe("createLearner", () => {
    it("creates a learner with default preferences", () => {
      const learner = createLearner("l01", "alice@example.com", "Alice", "student");
      expect(learner.id).toBe("l01");
      expect(learner.persona).toBe("student");
      expect(learner.preferences.dailyGoalMinutes).toBe(30);
    });

    it("throws on invalid email", () => {
      expect(() => createLearner("l01", "notanemail", "Alice", "student"))
        .toThrow("Invalid email");
    });

    it("throws on empty displayName", () => {
      expect(() => createLearner("l01", "alice@example.com", "  ", "student"))
        .toThrow("displayName is required");
    });
  });

  describe("updatePersona", () => {
    it("returns a new learner with updated persona", () => {
      const learner = createLearner("l01", "alice@example.com", "Alice", "student");
      const updated = updatePersona(learner, "practitioner");
      expect(updated.persona).toBe("practitioner");
      expect(learner.persona).toBe("student"); // original unchanged
    });
  });
});
