export type QuestionType = "single-choice" | "multi-choice" | "scenario";

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanation: string;
}

export interface Assessment {
  id: string;
  moduleId: string;
  title: string;
  questions: QuizQuestion[];
  passMark: number; // 0-100
  timeLimitMinutes: number | null;
}

export interface Attempt {
  id: string;
  assessmentId: string;
  learnerId: string;
  answers: Record<string, string[]>; // questionId → selected optionIds
  score: number;
  passed: boolean;
  submittedAt: Date;
}

export function scoreAttempt(
  assessment: Assessment,
  answers: Record<string, string[]>
): number {
  let correct = 0;
  for (const question of assessment.questions) {
    const given = (answers[question.id] ?? []).sort().join(",");
    const expected = [...question.correctOptionIds].sort().join(",");
    if (given === expected) correct++;
  }
  return Math.round((correct / assessment.questions.length) * 100);
}
