export type ProgressEvent =
  | { type: "LESSON_COMPLETED"; learnerId: string; lessonId: string; moduleId: string }
  | { type: "MODULE_COMPLETED"; learnerId: string; moduleId: string; score: number }
  | { type: "QUIZ_PASSED"; learnerId: string; quizId: string; score: number }
  | { type: "PATH_UNLOCKED"; learnerId: string; pathId: string };
