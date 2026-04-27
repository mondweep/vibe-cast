export type CourseEvent =
  | { type: "MODULE_PUBLISHED"; moduleId: string; publishedAt: Date }
  | { type: "LESSON_UPDATED"; lessonId: string; moduleId: string; updatedAt: Date }
  | { type: "QUIZ_CREATED"; quizId: string; moduleId: string };
