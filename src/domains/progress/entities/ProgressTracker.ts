export interface CompletionEvent {
  moduleId: string;
  lessonId: string;
  completedAt: Date;
  timeSpentMinutes: number;
}

export interface ProgressTracker {
  learnerId: string;
  completionEvents: CompletionEvent[];
  totalMinutesSpent: number;
  moduleScores: Record<string, number>; // moduleId → score 0-100
}

export function createProgressTracker(learnerId: string): ProgressTracker {
  return {
    learnerId,
    completionEvents: [],
    totalMinutesSpent: 0,
    moduleScores: {},
  };
}

export function recordLessonComplete(
  tracker: ProgressTracker,
  event: CompletionEvent
): ProgressTracker {
  const alreadyRecorded = tracker.completionEvents.some(
    (e) => e.lessonId === event.lessonId
  );
  if (alreadyRecorded) return tracker;

  return {
    ...tracker,
    completionEvents: [...tracker.completionEvents, event],
    totalMinutesSpent: tracker.totalMinutesSpent + event.timeSpentMinutes,
  };
}

export function getModuleProgress(
  tracker: ProgressTracker,
  moduleId: string,
  totalLessons: number
): number {
  if (totalLessons === 0) return 0;
  const completed = tracker.completionEvents.filter(
    (e) => e.moduleId === moduleId
  ).length;
  return Math.round((completed / totalLessons) * 100);
}

export function recordModuleScore(
  tracker: ProgressTracker,
  moduleId: string,
  score: number
): ProgressTracker {
  if (score < 0 || score > 100) throw new Error("Score must be 0–100");
  return {
    ...tracker,
    moduleScores: { ...tracker.moduleScores, [moduleId]: score },
  };
}
