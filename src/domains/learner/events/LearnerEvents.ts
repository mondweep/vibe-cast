export type LearnerEvent =
  | { type: "LEARNER_ENROLLED"; learnerId: string; enrolledAt: Date }
  | { type: "PERSONA_SELECTED"; learnerId: string; persona: string }
  | { type: "PREFERENCES_UPDATED"; learnerId: string };
