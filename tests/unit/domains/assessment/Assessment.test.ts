import { scoreAttempt, Assessment } from "@/domains/assessment/entities/Assessment";

describe("Assessment scoring — London School TDD", () => {
  const assessment: Assessment = {
    id: "a01",
    moduleId: "M01",
    title: "VPC Quiz",
    passMark: 80,
    timeLimitMinutes: 20,
    questions: [
      {
        id: "q1",
        text: "What is the default VPC CIDR?",
        type: "single-choice",
        options: [
          { id: "a", text: "172.31.0.0/16" },
          { id: "b", text: "10.0.0.0/16" },
        ],
        correctOptionIds: ["a"],
        explanation: "The default VPC uses 172.31.0.0/16.",
      },
      {
        id: "q2",
        text: "Which are valid VPC endpoint types?",
        type: "multi-choice",
        options: [
          { id: "a", text: "Interface" },
          { id: "b", text: "Gateway" },
          { id: "c", text: "Tunnel" },
        ],
        correctOptionIds: ["a", "b"],
        explanation: "Interface and Gateway are the two VPC endpoint types.",
      },
    ],
  };

  it("returns 100 for all correct answers", () => {
    const answers = { q1: ["a"], q2: ["a", "b"] };
    expect(scoreAttempt(assessment, answers)).toBe(100);
  });

  it("returns 50 for half correct", () => {
    const answers = { q1: ["a"], q2: ["c"] };
    expect(scoreAttempt(assessment, answers)).toBe(50);
  });

  it("returns 0 for all wrong answers", () => {
    const answers = { q1: ["b"], q2: ["c"] };
    expect(scoreAttempt(assessment, answers)).toBe(0);
  });

  it("returns 0 for empty answers", () => {
    expect(scoreAttempt(assessment, {})).toBe(0);
  });
});
