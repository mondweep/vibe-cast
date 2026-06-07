/**
 * PathProgress Aggregate Tests (per-learner progress side)
 * TDD London School: test-first, business rules & invariants
 * Spec source: PRD §4.1 (startPath / completeLesson, progress, unlock-next)
 */

import { PathProgress } from '../models/PathProgress';
import { LearnerEnrolledInPath } from '../events/LearnerEnrolledInPath';
import { LessonCompleted } from '../events/LessonCompleted';
import { PathCompleted } from '../events/PathCompleted';

const start = (totalLessons = 12) =>
  PathProgress.start({
    learnerId: 'learner-123',
    pathId: 'beginner-path',
    totalLessons,
    correlationId: 'corr-1',
  });

describe('PathProgress Aggregate', () => {
  describe('start', () => {
    it('should enroll the learner at 0% and emit LearnerEnrolledInPath', () => {
      const progress = start();

      expect(progress.getLearnerId()).toBe('learner-123');
      expect(progress.getPathId()).toBe('beginner-path');
      expect(progress.getProgressPercent()).toBe(0);
      expect(progress.getStatus()).toBe('ACTIVE');
      expect(progress.getCompletedCount()).toBe(0);

      const events = progress.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(LearnerEnrolledInPath);
    });

    it('should reject a non-positive lesson count', () => {
      expect(() => start(0)).toThrow(/Total lessons must be a positive integer/);
    });
  });

  describe('completeLesson', () => {
    it('should update progress to 33% after 4 of 12 lessons and emit LessonCompleted', () => {
      const progress = start(12);
      progress.markEventsAsCommitted();

      ['l1', 'l2', 'l3'].forEach((l) => progress.completeLesson(l));
      progress.completeLesson('l4');

      expect(progress.getCompletedCount()).toBe(4);
      expect(progress.getProgressPercent()).toBe(33); // 4/12
      expect(progress.getStatus()).toBe('ACTIVE');

      const events = progress.getUncommittedEvents();
      expect(events.filter((e) => e instanceof LessonCompleted)).toHaveLength(4);
    });

    it('should be idempotent for an already-completed lesson', () => {
      const progress = start(12);
      progress.completeLesson('l1');
      progress.completeLesson('l1');

      expect(progress.getCompletedCount()).toBe(1);
    });

    it('should complete the path and emit PathCompleted on the final lesson', () => {
      const progress = start(3);
      progress.markEventsAsCommitted();

      progress.completeLesson('l1');
      progress.completeLesson('l2');
      progress.completeLesson('l3');

      expect(progress.getProgressPercent()).toBe(100);
      expect(progress.getStatus()).toBe('COMPLETED');
      expect(progress.getCompletedAt()).not.toBeNull();

      const events = progress.getUncommittedEvents();
      expect(events.filter((e) => e instanceof PathCompleted)).toHaveLength(1);
    });

    it('should not emit PathCompleted before all lessons are done', () => {
      const progress = start(3);
      progress.markEventsAsCommitted();

      progress.completeLesson('l1');
      progress.completeLesson('l2');

      const events = progress.getUncommittedEvents();
      expect(events.some((e) => e instanceof PathCompleted)).toBe(false);
      expect(progress.getStatus()).toBe('ACTIVE');
    });

    it('should reject completing a lesson once the path is COMPLETED', () => {
      const progress = start(1);
      progress.completeLesson('l1');
      expect(() => progress.completeLesson('l2')).toThrow(/already completed/);
    });
  });
});
