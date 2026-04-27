export type AssessmentEvent =
  | { type: "ATTEMPT_SUBMITTED"; attemptId: string; learnerId: string; score: number }
  | { type: "CERTIFICATE_ISSUED"; learnerId: string; issuedAt: Date };
