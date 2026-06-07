/**
 * Lesson Entity Tests
 * TDD London School: test-first, business rules & invariants
 * Spec source: PRD §4.2 (Interactive Lessons) and §4.4 (Curriculum Definition)
 */

import { Lesson } from '../models/Lesson';
import { CapstoneType } from '../value-objects/CapstoneType';

describe('Lesson Entity', () => {
  const valid = {
    pathId: 'beginner-path',
    order: 1,
    title: 'Introduction to Agent Orchestration',
    topics: ['Agents', 'messages', 'topologies'],
    estimatedHours: 2,
    capstone: CapstoneType.QUIZ,
  };

  describe('Creation', () => {
    it('should create a draft lesson with valid fields', () => {
      const lesson = Lesson.create(valid);

      expect(lesson.getId()).toBeDefined();
      expect(lesson.getPathId()).toBe('beginner-path');
      expect(lesson.getOrder()).toBe(1);
      expect(lesson.getTitle()).toBe('Introduction to Agent Orchestration');
      expect(lesson.getTopics()).toEqual(['Agents', 'messages', 'topologies']);
      expect(lesson.getEstimatedHours()).toBe(2);
      expect(lesson.getCapstone()).toBe(CapstoneType.QUIZ);
      expect(lesson.isPublished()).toBe(false);
    });

    it('should reject an empty title', () => {
      expect(() => Lesson.create({ ...valid, title: '  ' })).toThrow(
        /Title must not be empty/,
      );
    });

    it('should reject order below 1', () => {
      expect(() => Lesson.create({ ...valid, order: 0 })).toThrow(
        /Order must be a positive integer/,
      );
    });

    it('should reject non-positive estimatedHours', () => {
      expect(() => Lesson.create({ ...valid, estimatedHours: 0 })).toThrow(
        /Estimated hours must be a positive number/,
      );
    });

    it('should accept an optional prerequisite lesson', () => {
      const lesson = Lesson.create({ ...valid, order: 2, prerequisiteLessonId: 'lesson-1' });
      expect(lesson.getPrerequisiteLessonId()).toBe('lesson-1');
    });
  });

  describe('Publishing', () => {
    it('should publish a draft lesson', () => {
      const lesson = Lesson.create(valid);
      lesson.publish();
      expect(lesson.isPublished()).toBe(true);
    });

    it('should not publish twice', () => {
      const lesson = Lesson.create(valid);
      lesson.publish();
      expect(() => lesson.publish()).toThrow(/Only draft lessons can be published/);
    });
  });

  describe('Reconstruction', () => {
    it('should rebuild from persistence', () => {
      const lesson = Lesson.fromPersistence({
        id: 'lesson-1',
        pathId: 'beginner-path',
        order: 1,
        title: 'Hello World with Ruflo',
        topics: ['swarm setup'],
        estimatedHours: 3,
        capstone: CapstoneType.RUN_EXAMPLE,
        prerequisiteLessonId: null,
        published: true,
      });

      expect(lesson.getId()).toBe('lesson-1');
      expect(lesson.isPublished()).toBe(true);
    });
  });
});
