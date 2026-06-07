/**
 * LearningPath Aggregate Tests (catalog side)
 * TDD London School: test-first, business rules & invariants
 * Spec source: PRD §4.1 (Learning Path Curriculum) and §4.4
 */

import { LearningPath } from '../models/LearningPath';
import { PathLevel } from '../value-objects/PathLevel';

describe('LearningPath Aggregate', () => {
  const beginner = () =>
    LearningPath.create({
      level: PathLevel.BEGINNER,
      title: 'Beginner Path',
      description: 'Backend engineers new to agent systems',
      estimatedHours: 40,
      prerequisitePathId: null,
    });

  describe('Creation', () => {
    it('should create a draft beginner path with no prerequisite', () => {
      const path = beginner();

      expect(path.getId()).toBeDefined();
      expect(path.getLevel()).toBe(PathLevel.BEGINNER);
      expect(path.getTitle()).toBe('Beginner Path');
      expect(path.getEstimatedHours()).toBe(40);
      expect(path.getPrerequisitePathId()).toBeNull();
      expect(path.getLessonCount()).toBe(0);
      expect(path.isPublished()).toBe(false);
    });

    it('should reject an empty title', () => {
      expect(() =>
        LearningPath.create({
          level: PathLevel.BEGINNER,
          title: '',
          description: 'x',
          estimatedHours: 40,
        }),
      ).toThrow(/Title must not be empty/);
    });

    it('should reject non-positive estimatedHours', () => {
      expect(() =>
        LearningPath.create({
          level: PathLevel.INTERMEDIATE,
          title: 'Intermediate',
          description: 'x',
          estimatedHours: 0,
        }),
      ).toThrow(/Estimated hours must be a positive number/);
    });
  });

  describe('Lesson ordering', () => {
    it('should append lessons in order', () => {
      const path = beginner();
      path.addLesson('lesson-1');
      path.addLesson('lesson-2');
      path.addLesson('lesson-3');

      expect(path.getLessonCount()).toBe(3);
      expect(path.getOrderedLessonIds()).toEqual(['lesson-1', 'lesson-2', 'lesson-3']);
    });

    it('should reject duplicate lessons', () => {
      const path = beginner();
      path.addLesson('lesson-1');
      expect(() => path.addLesson('lesson-1')).toThrow(/already in this path/);
    });

    it('should return the next uncompleted lesson in order', () => {
      const path = beginner();
      ['l1', 'l2', 'l3'].forEach((l) => path.addLesson(l));

      expect(path.getNextLessonId([])).toBe('l1');
      expect(path.getNextLessonId(['l1'])).toBe('l2');
      expect(path.getNextLessonId(['l1', 'l2'])).toBe('l3');
      expect(path.getNextLessonId(['l1', 'l2', 'l3'])).toBeNull();
    });
  });

  describe('Prerequisites', () => {
    it('should record a prerequisite path for intermediate', () => {
      const path = LearningPath.create({
        level: PathLevel.INTERMEDIATE,
        title: 'Intermediate Path',
        description: 'x',
        estimatedHours: 50,
        prerequisitePathId: 'beginner-path',
      });
      expect(path.getPrerequisitePathId()).toBe('beginner-path');
    });
  });
});
