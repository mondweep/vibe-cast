import { v4 as uuid } from 'uuid';
import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { LearnerEnrolledInPath } from '../events/LearnerEnrolledInPath';
import { LessonCompleted } from '../events/LessonCompleted';
import { PathCompleted } from '../events/PathCompleted';

/**
 * PathProgress Aggregate Root (per-learner progress side)
 *
 * Tracks one learner's progress through one LearningPath and emits the
 * learning domain events (PRD §4.1 / §9). Prerequisite gating between paths
 * is enforced by the application service (it needs cross-path data), not here.
 *
 * Invariants:
 * - totalLessons must be a positive integer
 * - a lesson counts at most once (idempotent completion)
 * - no further completion once the path is COMPLETED
 */

export type PathProgressStatus = 'ACTIVE' | 'COMPLETED';

export interface StartPathProgressProps {
  learnerId: string;
  pathId: string;
  totalLessons: number;
  correlationId?: string;
}

export interface RehydratePathProgressProps {
  id: string;
  learnerId: string;
  pathId: string;
  totalLessons: number;
  completedLessonIds: string[];
  status: PathProgressStatus;
  startedAt: Date;
  completedAt: Date | null;
  correlationId?: string;
}

export class PathProgress extends AggregateRoot {
  private constructor(
    id: string,
    private readonly learnerId: string,
    private readonly pathId: string,
    private readonly totalLessons: number,
    private readonly completedLessonIds: string[],
    private status: PathProgressStatus,
    private readonly startedAt: Date,
    private completedAt: Date | null,
    private readonly correlationId: string,
  ) {
    super(id);
  }

  static start(props: StartPathProgressProps): PathProgress {
    if (!Number.isInteger(props.totalLessons) || props.totalLessons < 1) {
      throw new Error('Total lessons must be a positive integer');
    }
    const correlationId = props.correlationId ?? uuid();
    const progress = new PathProgress(
      uuid(),
      props.learnerId,
      props.pathId,
      props.totalLessons,
      [],
      'ACTIVE',
      new Date(),
      null,
      correlationId,
    );
    progress.addEvent(
      new LearnerEnrolledInPath({
        learnerId: props.learnerId,
        pathId: props.pathId,
        totalLessons: props.totalLessons,
        correlationId,
      }),
    );
    return progress;
  }

  /**
   * Reconstitute an existing PathProgress from a persisted read model, without
   * emitting events. Used by the application/command side (ADR-011) to apply a
   * new completeLesson on top of prior state and produce only the new events.
   */
  static rehydrate(props: RehydratePathProgressProps): PathProgress {
    if (!Number.isInteger(props.totalLessons) || props.totalLessons < 1) {
      throw new Error('Total lessons must be a positive integer');
    }
    return new PathProgress(
      props.id,
      props.learnerId,
      props.pathId,
      props.totalLessons,
      [...props.completedLessonIds],
      props.status,
      props.startedAt,
      props.completedAt,
      props.correlationId ?? uuid(),
    );
  }

  /**
   * Mark a lesson complete: recompute progress, emit LessonCompleted, and —
   * when the last lesson lands — flip to COMPLETED and emit PathCompleted.
   */
  completeLesson(lessonId: string): void {
    if (this.status === 'COMPLETED') {
      throw new Error('Cannot complete a lesson: path is already completed');
    }
    if (this.completedLessonIds.includes(lessonId)) {
      return; // idempotent — a lesson counts at most once
    }

    this.completedLessonIds.push(lessonId);

    this.addEvent(
      new LessonCompleted({
        learnerId: this.learnerId,
        pathId: this.pathId,
        lessonId,
        progressPercent: this.getProgressPercent(),
        correlationId: this.correlationId,
      }),
    );

    if (this.completedLessonIds.length >= this.totalLessons) {
      this.status = 'COMPLETED';
      this.completedAt = new Date();
      this.addEvent(
        new PathCompleted({
          learnerId: this.learnerId,
          pathId: this.pathId,
          completedAt: this.completedAt.toISOString(),
          correlationId: this.correlationId,
        }),
      );
    }
  }

  getProgressPercent(): number {
    return Math.round((this.completedLessonIds.length / this.totalLessons) * 100);
  }
  getLearnerId(): string {
    return this.learnerId;
  }
  getPathId(): string {
    return this.pathId;
  }
  getStatus(): PathProgressStatus {
    return this.status;
  }
  getCompletedCount(): number {
    return this.completedLessonIds.length;
  }
  getCompletedLessonIds(): string[] {
    return [...this.completedLessonIds];
  }
  getStartedAt(): Date {
    return this.startedAt;
  }
  getCompletedAt(): Date | null {
    return this.completedAt;
  }
}
