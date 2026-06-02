# Ruflo Learning Platform: TDD London School Test Strategy

**Version**: 1.0  
**Date**: 2026-06-02  
**Approach**: Outside-In, Mock-Driven Development, Behavior Verification  
**Framework**: Jest with TypeScript + Swarm Test Coordination  

---

## Executive Summary

This document defines the comprehensive Test-Driven Development (TDD) strategy for the Ruflo learning platform using the London School (mockist) approach. The London School emphasizes **how bounded contexts collaborate** through well-defined mock contracts, rather than testing internal state. This strategy applies to five primary domains:

1. **Learning Domain** - Course/module completion tracking
2. **Certification Domain** - Badge/certificate issuance  
3. **Skill Lab Domain** - Exercise validation and AI feedback
4. **Community Domain** - Peer collaboration and discussions
5. **Metrics Domain** - Performance analytics and reporting

Each domain is tested with a tiered approach (unit/integration/E2E), mocking external dependencies to isolate behavior and verify collaborations.

---

## 1. Test Pyramid by Domain

### Pyramid Distribution by Context

```
Learning Domain (Content-Heavy)
├─ Unit Tests (40%)     - Service behavior with mocked repository
├─ Integration (40%)    - Learning + event coordination mocks
└─ E2E (20%)           - User completes module flow

Certification Domain (Orchestration-Heavy)  
├─ Unit Tests (50%)     - Certificate logic with Learning domain mock
├─ Integration (30%)    - Multi-domain coordination
└─ E2E (20%)           - End-to-end badge issuance

Skill Lab Domain (External Integration-Heavy)
├─ Unit Tests (30%)     - Lab service with Ruflo agent mock
├─ Integration (50%)    - Lab + Ruflo + Metrics integration  
└─ E2E (20%)           - Exercise submission → validation → feedback

Community Domain (Event-Driven)
├─ Unit Tests (40%)     - Posting/commenting with repo mocks
├─ Integration (40%)    - Cross-domain events + notifications
└─ E2E (20%)           - User discussion lifecycle

Metrics Domain (Read-Only, Reporting)
├─ Unit Tests (60%)     - Aggregation logic with query mocks
├─ Integration (30%)    - Multi-source data gathering
└─ E2E (10%)           - Dashboard data freshness
```

### Concrete Pyramid Structure

```
            /\               E2E Tests (5% of test suite)
           /  \              - Full user workflows
          /____\             - Real databases (in CI)
         /      \            - Contracts verified with mocks
        /________\           
       /          \          Integration Tests (40%)
      /            \         - Domain coordination
     /              \        - Mock external services
    /________________\       - Event flow verification
   /                  \      
  /                    \     Unit Tests (55%)
 /                      \    - London School mocks
/_________________________\   - Behavior verification
                             - No database access
```

---

## 2. London School Mock Objects & Contracts

### 2.1 Learning Domain Mock Contracts

**LearningRepository Interface** (Mocked by other domains)

```typescript
// domains/learning/ports/learning-repository.interface.ts
export interface ILearningRepository {
  getCompletions(userId: string): Promise<Completion[]>;
  markModuleComplete(userId: string, moduleId: string): Promise<void>;
  getProgress(userId: string, courseId: string): Promise<number>;
  findById(completionId: string): Promise<Completion | null>;
}

// Mock for Certification Domain
const mockLearningRepository = {
  getCompletions: jest.fn().mockResolvedValue([
    { userId: 'u123', moduleId: 'm1', completedAt: new Date() },
    { userId: 'u123', moduleId: 'm2', completedAt: new Date() }
  ]),
  markModuleComplete: jest.fn().mockResolvedValue(undefined),
  getProgress: jest.fn().mockResolvedValue(0.75),
  findById: jest.fn().mockResolvedValue(null)
};
```

**LearningEventPublisher Interface** (Mocked by Community/Metrics)

```typescript
// domains/learning/ports/learning-event-publisher.interface.ts
export interface ILearningEventPublisher {
  moduleCompleted(event: ModuleCompletedEvent): Promise<void>;
  courseStarted(event: CourseStartedEvent): Promise<void>;
  progressUpdated(event: ProgressUpdatedEvent): Promise<void>;
}

// Mock for Community Domain
const mockLearningEventPublisher = {
  moduleCompleted: jest.fn().mockResolvedValue(undefined),
  courseStarted: jest.fn().mockResolvedValue(undefined),
  progressUpdated: jest.fn().mockResolvedValue(undefined)
};
```

### 2.2 Certification Domain Mock Contracts

**CertificationService Contract** (Used by other domains)

```typescript
// domains/certification/ports/certification-service.interface.ts
export interface ICertificationService {
  issueBadge(userId: string, badgeType: string): Promise<Badge>;
  verifyCompletionRequirements(userId: string, badgeType: string): Promise<boolean>;
  revokeBadge(badgeId: string): Promise<void>;
  getBadges(userId: string): Promise<Badge[]>;
}

// Contract Definition for Metrics Domain
const certificationServiceContract = {
  issueBadge: {
    input: { userId: 'string', badgeType: 'string' },
    output: { id: 'string', userId: 'string', badgeType: 'string', issuedAt: 'Date' },
    collaborators: ['LearningRepository', 'CertificationRepository']
  },
  verifyCompletionRequirements: {
    input: { userId: 'string', badgeType: 'string' },
    output: 'boolean',
    collaborators: ['LearningRepository']
  }
};

// Mock for Metrics Domain
const mockCertificationService = {
  issueBadge: jest.fn().mockResolvedValue({
    id: 'badge-123',
    userId: 'u123',
    badgeType: 'course-advanced',
    issuedAt: new Date()
  }),
  verifyCompletionRequirements: jest.fn().mockResolvedValue(true),
  revokeBadge: jest.fn().mockResolvedValue(undefined),
  getBadges: jest.fn().mockResolvedValue([])
};
```

### 2.3 Skill Lab Domain Mock Contracts

**RufloAgentInterface** (Mocked for unit tests)

```typescript
// domains/skill-lab/ports/ruflo-agent.interface.ts
export interface IRufloAgent {
  validateExercise(code: string, testCases: TestCase[]): Promise<ValidationResult>;
  generateFeedback(code: string, errors: Error[]): Promise<string>;
  suggestCorrection(code: string, hint: string): Promise<CodeSuggestion>;
}

// Mock for Skill Lab Service Tests
const mockRufloAgent = {
  validateExercise: jest.fn().mockResolvedValue({
    passed: true,
    testsPassed: 3,
    testsTotal: 3,
    executionTime: 142
  }),
  generateFeedback: jest.fn().mockResolvedValue(
    'Great work! Consider using a more efficient algorithm.'
  ),
  suggestCorrection: jest.fn().mockResolvedValue({
    code: 'const optimal = array.map(x => x * 2);',
    explanation: 'Using native map() is more efficient.'
  })
};
```

**MetricsPublisher Interface** (Mocked by Skill Lab)

```typescript
// domains/metrics/ports/metrics-publisher.interface.ts
export interface IMetricsPublisher {
  recordExerciseSubmission(submission: SubmissionMetric): Promise<void>;
  recordValidationResult(result: ValidationMetric): Promise<void>;
  recordHintUsage(hintMetric: HintMetric): Promise<void>;
}

// Mock for Skill Lab Domain
const mockMetricsPublisher = {
  recordExerciseSubmission: jest.fn().mockResolvedValue(undefined),
  recordValidationResult: jest.fn().mockResolvedValue(undefined),
  recordHintUsage: jest.fn().mockResolvedValue(undefined)
};
```

### 2.4 Community Domain Mock Contracts

**CommunityRepository Interface**

```typescript
// domains/community/ports/community-repository.interface.ts
export interface ICommunityRepository {
  savePost(post: CommunityPost): Promise<CommunityPost>;
  findPostById(postId: string): Promise<CommunityPost | null>;
  deletePost(postId: string): Promise<void>;
  getThreadPosts(threadId: string): Promise<CommunityPost[]>;
}

// Mocks for Community Domain Tests
const mockCommunityRepository = {
  savePost: jest.fn().mockResolvedValue({ id: 'post-123', content: '...', createdAt: new Date() }),
  findPostById: jest.fn().mockResolvedValue(null),
  deletePost: jest.fn().mockResolvedValue(undefined),
  getThreadPosts: jest.fn().mockResolvedValue([])
};
```

**NotificationService Interface** (Mocked by Community)

```typescript
// domains/community/ports/notification-service.interface.ts
export interface INotificationService {
  notifyMentionedUsers(postId: string, mentionedUsers: string[]): Promise<void>;
  notifyPostCreated(post: CommunityPost, followers: string[]): Promise<void>;
  notifyCommentReplied(postId: string, userId: string): Promise<void>;
}

// Mock for Community Domain
const mockNotificationService = {
  notifyMentionedUsers: jest.fn().mockResolvedValue(undefined),
  notifyPostCreated: jest.fn().mockResolvedValue(undefined),
  notifyCommentReplied: jest.fn().mockResolvedValue(undefined)
};
```

### 2.5 Metrics Domain Mock Contracts

**DataAggregator Interface**

```typescript
// domains/metrics/ports/data-aggregator.interface.ts
export interface IDataAggregator {
  getUserStats(userId: string): Promise<UserStatistics>;
  getCourseStats(courseId: string): Promise<CourseStatistics>;
  getLeaderboard(courseId: string, limit: number): Promise<LeaderboardEntry[]>;
}

// Mocks for data sources
const mockLearningStatsCollector = {
  getCompletionRate: jest.fn().mockResolvedValue(0.75),
  getAverageTimePerModule: jest.fn().mockResolvedValue(45)
};

const mockCertificationStatsCollector = {
  getUserBadgeCount: jest.fn().mockResolvedValue(3),
  getRecentBadges: jest.fn().mockResolvedValue([])
};
```

---

## 3. Test-First Examples: Concrete Scenarios

### Example 1: Issue Certification Badge (Outside-In)

**User Story**: "As a learner, I want to automatically receive a badge when I complete all required modules in a course"

**Acceptance Criteria**:
- When all modules in a course are completed
- Then the system issues the appropriate badge
- And the Learning domain is queried for completions
- And the Certification repository records the badge
- And a notification is sent to the user

#### Test-First Implementation

```typescript
// domains/certification/services/__tests__/badge-issuance.spec.ts

describe('Badge Issuance - London School', () => {
  let badgeIssuanceService: BadgeIssuanceService;
  let mockLearningRepository: jest.Mocked<ILearningRepository>;
  let mockCertificationRepository: jest.Mocked<ICertificationRepository>;
  let mockNotificationService: jest.Mocked<INotificationService>;

  beforeEach(() => {
    // Define mocks for external dependencies
    mockLearningRepository = {
      getCompletions: jest.fn(),
      markModuleComplete: jest.fn(),
      getProgress: jest.fn(),
      findById: jest.fn()
    };

    mockCertificationRepository = {
      saveBadge: jest.fn(),
      findBadgeById: jest.fn(),
      revokeBadge: jest.fn(),
      getUserBadges: jest.fn()
    };

    mockNotificationService = {
      notifyBadgeIssued: jest.fn(),
      notifyBadgeRevoked: jest.fn()
    };

    // Inject mocks
    badgeIssuanceService = new BadgeIssuanceService(
      mockLearningRepository,
      mockCertificationRepository,
      mockNotificationService
    );
  });

  describe('issuing badge when course is complete', () => {
    it('should issue badge after all modules completed', async () => {
      // ARRANGE: Set up mock behavior
      const userId = 'u-456';
      const courseId = 'c-789';
      const requiredModules = ['m1', 'm2', 'm3'];

      mockLearningRepository.getCompletions.mockResolvedValue([
        { userId, moduleId: 'm1', completedAt: new Date('2026-06-01') },
        { userId, moduleId: 'm2', completedAt: new Date('2026-06-01') },
        { userId, moduleId: 'm3', completedAt: new Date('2026-06-02') }
      ]);

      mockCertificationRepository.saveBadge.mockResolvedValue({
        id: 'badge-xyz',
        userId,
        badgeType: 'course-complete',
        courseId,
        issuedAt: new Date()
      });

      // ACT: Call the service
      const result = await badgeIssuanceService.issueBadgeIfEligible(userId, courseId, requiredModules);

      // ASSERT: Verify interactions (NOT state)
      expect(mockLearningRepository.getCompletions).toHaveBeenCalledWith(userId);
      expect(mockCertificationRepository.saveBadge).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          badgeType: 'course-complete',
          courseId
        })
      );
      expect(mockNotificationService.notifyBadgeIssued).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ id: 'badge-xyz' })
      );
      expect(result.issued).toBe(true);
    });

    it('should not issue badge if modules not all completed', async () => {
      // ARRANGE: Missing one module
      const userId = 'u-456';
      const courseId = 'c-789';
      const requiredModules = ['m1', 'm2', 'm3'];

      mockLearningRepository.getCompletions.mockResolvedValue([
        { userId, moduleId: 'm1', completedAt: new Date('2026-06-01') },
        { userId, moduleId: 'm2', completedAt: new Date('2026-06-01') }
        // m3 missing
      ]);

      // ACT
      const result = await badgeIssuanceService.issueBadgeIfEligible(userId, courseId, requiredModules);

      // ASSERT: Verify NO badge was issued
      expect(mockCertificationRepository.saveBadge).not.toHaveBeenCalled();
      expect(mockNotificationService.notifyBadgeIssued).not.toHaveBeenCalled();
      expect(result.issued).toBe(false);
    });

    it('should verify collaboration order: check completion → save badge → notify', async () => {
      // ARRANGE
      const userId = 'u-456';
      const courseId = 'c-789';
      const callOrder: string[] = [];

      mockLearningRepository.getCompletions.mockImplementation(async () => {
        callOrder.push('getCompletions');
        return [
          { userId, moduleId: 'm1', completedAt: new Date() },
          { userId, moduleId: 'm2', completedAt: new Date() },
          { userId, moduleId: 'm3', completedAt: new Date() }
        ];
      });

      mockCertificationRepository.saveBadge.mockImplementation(async () => {
        callOrder.push('saveBadge');
        return { id: 'badge-xyz', userId, badgeType: 'course-complete', issuedAt: new Date() };
      });

      mockNotificationService.notifyBadgeIssued.mockImplementation(async () => {
        callOrder.push('notifyBadgeIssued');
      });

      // ACT
      await badgeIssuanceService.issueBadgeIfEligible(userId, courseId, ['m1', 'm2', 'm3']);

      // ASSERT: Verify exact order of interactions
      expect(callOrder).toEqual(['getCompletions', 'saveBadge', 'notifyBadgeIssued']);
    });
  });
});
```

**Key London School Principles Applied**:
- Mocks are injected to isolate the service
- Tests verify **how** the service collaborates (which methods called, with what parameters)
- Tests verify **order** of collaborations (getCompletions before saveBadge before notify)
- Tests focus on **behavior**, not on internal state
- Mock contracts are explicit and reusable across domains

---

### Example 2: Complete Learning Module

**User Story**: "As a learner, I want to mark a module as complete and have community peers notified"

**Acceptance Criteria**:
- When I submit module completion
- Then the Learning domain records the completion
- And a `ModuleCompleted` event is published
- And the Community domain receives the event and notifies peers
- And the Metrics domain records the completion metric

#### Test-First Implementation

```typescript
// domains/learning/services/__tests__/module-completion.spec.ts

describe('Module Completion - London School', () => {
  let moduleCompletionService: ModuleCompletionService;
  let mockLearningRepository: jest.Mocked<ILearningRepository>;
  let mockEventPublisher: jest.Mocked<ILearningEventPublisher>;
  let mockMetricsPublisher: jest.Mocked<IMetricsPublisher>;

  beforeEach(() => {
    mockLearningRepository = {
      getCompletions: jest.fn(),
      markModuleComplete: jest.fn(),
      getProgress: jest.fn(),
      findById: jest.fn()
    };

    mockEventPublisher = {
      moduleCompleted: jest.fn(),
      courseStarted: jest.fn(),
      progressUpdated: jest.fn()
    };

    mockMetricsPublisher = {
      recordExerciseSubmission: jest.fn(),
      recordValidationResult: jest.fn(),
      recordHintUsage: jest.fn()
    };

    moduleCompletionService = new ModuleCompletionService(
      mockLearningRepository,
      mockEventPublisher,
      mockMetricsPublisher
    );
  });

  describe('completing a learning module', () => {
    it('should record completion and publish event', async () => {
      // ARRANGE
      const userId = 'u-789';
      const moduleId = 'm-101';
      const timeSpent = 3600; // seconds

      mockLearningRepository.markModuleComplete.mockResolvedValue(undefined);
      mockEventPublisher.moduleCompleted.mockResolvedValue(undefined);
      mockMetricsPublisher.recordExerciseSubmission.mockResolvedValue(undefined);

      // ACT
      const result = await moduleCompletionService.completeModule(userId, moduleId, timeSpent);

      // ASSERT: Verify collaborations
      expect(mockLearningRepository.markModuleComplete).toHaveBeenCalledWith(userId, moduleId);
      
      expect(mockEventPublisher.moduleCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          moduleId,
          completedAt: expect.any(Date)
        })
      );

      expect(mockMetricsPublisher.recordExerciseSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          moduleId,
          timeSpent
        })
      );

      expect(result.success).toBe(true);
    });

    it('should coordinate with community domain via event', async () => {
      // ARRANGE: Community domain should receive ModuleCompleted event
      const userId = 'u-789';
      const moduleId = 'm-101';
      let publishedEvent: ModuleCompletedEvent;

      mockEventPublisher.moduleCompleted.mockImplementation(async (event) => {
        publishedEvent = event;
      });

      // ACT
      await moduleCompletionService.completeModule(userId, moduleId, 3600);

      // ASSERT: Event contains all data needed by Community domain
      expect(publishedEvent).toEqual(
        expect.objectContaining({
          userId,
          moduleId,
          completedAt: expect.any(Date),
          eventType: 'MODULE_COMPLETED'
        })
      );
    });

    it('should handle repository failure gracefully', async () => {
      // ARRANGE
      const userId = 'u-789';
      const moduleId = 'm-101';
      const error = new Error('Database connection failed');

      mockLearningRepository.markModuleComplete.mockRejectedValue(error);

      // ACT & ASSERT
      await expect(
        moduleCompletionService.completeModule(userId, moduleId, 3600)
      ).rejects.toThrow('Database connection failed');

      // Event should not be published if repository fails
      expect(mockEventPublisher.moduleCompleted).not.toHaveBeenCalled();
    });
  });
});
```

---

### Example 3: Skill Lab Exercise Validation

**User Story**: "As a learner, I want to submit code for a Skill Lab exercise, get validation feedback, and see my progress recorded"

**Acceptance Criteria**:
- When I submit code to a Skill Lab exercise
- Then the code is validated against test cases using Ruflo agent
- And feedback is generated
- And the submission is recorded in Metrics
- And the validation result is saved to the repository

#### Test-First Implementation

```typescript
// domains/skill-lab/services/__tests__/exercise-validation.spec.ts

describe('Exercise Validation - London School', () => {
  let exerciseValidationService: ExerciseValidationService;
  let mockRufloAgent: jest.Mocked<IRufloAgent>;
  let mockSkillLabRepository: jest.Mocked<ISkillLabRepository>;
  let mockMetricsPublisher: jest.Mocked<IMetricsPublisher>;

  beforeEach(() => {
    mockRufloAgent = {
      validateExercise: jest.fn(),
      generateFeedback: jest.fn(),
      suggestCorrection: jest.fn()
    };

    mockSkillLabRepository = {
      saveSubmission: jest.fn(),
      findSubmissionById: jest.fn(),
      getExerciseById: jest.fn(),
      getUserSubmissions: jest.fn()
    };

    mockMetricsPublisher = {
      recordExerciseSubmission: jest.fn(),
      recordValidationResult: jest.fn(),
      recordHintUsage: jest.fn()
    };

    exerciseValidationService = new ExerciseValidationService(
      mockRufloAgent,
      mockSkillLabRepository,
      mockMetricsPublisher
    );
  });

  describe('validating exercise code submission', () => {
    it('should validate code and generate feedback', async () => {
      // ARRANGE
      const userId = 'u-999';
      const exerciseId = 'ex-201';
      const userCode = 'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }';
      const testCases = [
        { input: 0, expected: 0 },
        { input: 5, expected: 5 },
        { input: 10, expected: 55 }
      ];

      mockRufloAgent.validateExercise.mockResolvedValue({
        passed: true,
        testsPassed: 3,
        testsTotal: 3,
        executionTime: 245
      });

      mockRufloAgent.generateFeedback.mockResolvedValue(
        'Good recursion implementation! Consider memoization for performance.'
      );

      mockSkillLabRepository.saveSubmission.mockResolvedValue({
        id: 'sub-123',
        userId,
        exerciseId,
        code: userCode,
        status: 'passed',
        submittedAt: new Date()
      });

      // ACT
      const result = await exerciseValidationService.validateSubmission(
        userId,
        exerciseId,
        userCode,
        testCases
      );

      // ASSERT: Verify interactions with Ruflo agent
      expect(mockRufloAgent.validateExercise).toHaveBeenCalledWith(userCode, testCases);
      expect(mockRufloAgent.generateFeedback).toHaveBeenCalledWith(userCode, []);

      // Verify submission saved
      expect(mockSkillLabRepository.saveSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          exerciseId,
          code: userCode,
          status: 'passed'
        })
      );

      // Verify metrics recorded
      expect(mockMetricsPublisher.recordValidationResult).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          exerciseId,
          passed: true,
          executionTime: 245
        })
      );

      expect(result.passed).toBe(true);
      expect(result.feedback).toBe('Good recursion implementation! Consider memoization for performance.');
    });

    it('should handle validation failures and suggest corrections', async () => {
      // ARRANGE: Validation fails, get suggestion
      const userId = 'u-999';
      const exerciseId = 'ex-201';
      const userCode = 'function sum(arr) { let total = 0; for (let i = 0; i < arr.length; i++); total += arr[i]; return total; }';
      const testCases = [
        { input: [1, 2, 3], expected: 6 }
      ];
      const validationError = { line: 1, message: 'Loop body is empty due to semicolon' };

      mockRufloAgent.validateExercise.mockResolvedValue({
        passed: false,
        testsPassed: 0,
        testsTotal: 1,
        executionTime: 0,
        errors: [validationError]
      });

      mockRufloAgent.generateFeedback.mockResolvedValue(
        'There\'s a syntax error: semicolon after the for loop makes the body empty.'
      );

      mockRufloAgent.suggestCorrection.mockResolvedValue({
        code: 'function sum(arr) { let total = 0; for (let i = 0; i < arr.length; i++) total += arr[i]; return total; }',
        explanation: 'Remove the semicolon after the for statement to include the loop body.'
      });

      // ACT
      const result = await exerciseValidationService.validateSubmission(
        userId,
        exerciseId,
        userCode,
        testCases
      );

      // ASSERT: Verify suggestion provided
      expect(mockRufloAgent.suggestCorrection).toHaveBeenCalledWith(
        userCode,
        'syntax-error'
      );

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('semicolon');
      expect(result.suggestion).toEqual(
        expect.objectContaining({
          code: expect.stringContaining('for (let i = 0; i < arr.length; i++) total += arr[i]')
        })
      );
    });

    it('should coordinate with Ruflo agent sequentially: validate → feedback → suggestion', async () => {
      // ARRANGE: Verify exact order of agent calls
      const callOrder: string[] = [];
      const userId = 'u-999';
      const exerciseId = 'ex-201';
      const userCode = 'function test() {}';
      const testCases = [];
      const validationError = { line: 1, message: 'Test error' };

      mockRufloAgent.validateExercise.mockImplementation(async () => {
        callOrder.push('validateExercise');
        return {
          passed: false,
          testsPassed: 0,
          testsTotal: 1,
          errors: [validationError]
        };
      });

      mockRufloAgent.generateFeedback.mockImplementation(async () => {
        callOrder.push('generateFeedback');
        return 'Feedback message';
      });

      mockRufloAgent.suggestCorrection.mockImplementation(async () => {
        callOrder.push('suggestCorrection');
        return { code: '...', explanation: '...' };
      });

      // ACT
      await exerciseValidationService.validateSubmission(userId, exerciseId, userCode, testCases);

      // ASSERT: Verify order
      expect(callOrder).toEqual(['validateExercise', 'generateFeedback', 'suggestCorrection']);
    });
  });
});
```

---

## 4. Acceptance Test Mapping: PRD to Tests

### Learning Domain Example

| User Story | Acceptance Criteria | Test Scenario | Mock Dependencies | Verified Interaction |
|-----------|------------------|---------------|----|----------------------|
| "Complete a learning module" | Module marked complete in repository | `completeModule` called | LearningRepository mock | `markModuleComplete()` + `moduleCompleted` event |
| | Event published to community | Event publisher called | LearningEventPublisher mock | `moduleCompleted(event)` with correct payload |
| | Metrics recorded for analytics | Metrics service called | MetricsPublisher mock | `recordSubmission()` with userId, moduleId, time |
| "View course progress" | Progress retrieved from repository | `getProgress` called | LearningRepository mock | `getProgress(userId, courseId)` returns percentage |
| | Completion list returned | Completions retrieved | LearningRepository mock | `getCompletions(userId)` returns array |

### Certification Domain Example

| User Story | Acceptance Criteria | Test Scenario | Mock Dependencies | Verified Interaction |
|-----------|------------------|---------------|----|----------------------|
| "Receive badge on course completion" | All modules verified as complete | `issueBadgeIfEligible` checks completions | LearningRepository mock | `getCompletions()` called, filtered for course |
| | Badge saved to system | Badge persisted | CertificationRepository mock | `saveBadge(badge)` with issuedAt timestamp |
| | User notified of badge | Notification sent | NotificationService mock | `notifyBadgeIssued(userId, badge)` |
| | Badge not issued if requirements unmet | Early exit without issuance | All mocks | No `saveBadge()` or `notifyBadgeIssued()` calls |

### Skill Lab Domain Example

| User Story | Acceptance Criteria | Test Scenario | Mock Dependencies | Verified Interaction |
|-----------|------------------|---------------|----|----------------------|
| "Submit code for validation" | Code validated by Ruflo | `validateSubmission` calls agent | RufloAgent mock | `validateExercise(code, testCases)` |
| | Feedback provided to learner | Feedback generated | RufloAgent mock | `generateFeedback(code, errors)` |
| | Submission stored | Repository saves submission | SkillLabRepository mock | `saveSubmission(submission)` |
| | Metrics recorded | Validation metrics published | MetricsPublisher mock | `recordValidationResult(result)` |
| "Get hint on exercise" | Hint usage tracked | `requestHint` called | MetricsPublisher mock | `recordHintUsage(userId, exerciseId, hintCount)` |

---

## 5. CI/CD Testing Gates

### Testing Pipeline Architecture

```
Developer Push
    ↓
[Gate 1: Lint & Type Check]
    ↓ (fail = reject)
[Gate 2: Unit Tests (London Mocks)]
    ├─ Learning: 40% unit coverage required
    ├─ Certification: 50% unit coverage
    ├─ Skill Lab: 30% unit coverage
    ├─ Community: 40% unit coverage
    └─ Metrics: 60% unit coverage
    ↓ (fail = reject)
[Gate 3: Mock Contract Validation]
    ├─ All services mocked correctly
    ├─ All contracts defined
    └─ No real database calls detected
    ↓ (fail = reject)
[Gate 4: Pull Request Opens]
[Gate 5: Integration Tests (Swarm Coordination)]
    ├─ Learning + Community coordination
    ├─ Certification + Learning verification
    ├─ Skill Lab + Ruflo + Metrics flow
    └─ Event publishing chain tests
    ↓ (fail = blocks merge)
[Gate 6: E2E Tests (Nightly Schedule)]
    ├─ User registration → module completion → badge
    ├─ Exercise submission → validation → feedback
    ├─ Community post → peer notification
    └─ Metrics dashboard data freshness
    ↓ (fail = alerts team, doesn't block merge)
[Gate 7: Code Review + Merge]
[Gate 8: Deploy to Staging]
[Gate 9: Certification Sign-Off Tests]
    ├─ All badges properly issued
    ├─ All certifications verified
    └─ No orphaned badge records
[Gate 10: Deploy to Production]
```

### Detailed Gate Definitions

#### Gate 2: Unit Tests (Local, Fast)
```bash
# Runs on: developer machine + CI pre-commit
# Timeout: 2 minutes
# Exit code: Non-zero = block commit

npm test -- --testPathPattern=unit --coverage \
  --coverageThreshold='{"global":{"lines":75}}'

# Coverage thresholds per domain:
# learning/: 40% (focus on service behavior)
# certification/: 50% (extensive mocking)
# skill-lab/: 30% (Ruflo agent mocks are heavy)
# community/: 40% (event-driven complexity)
# metrics/: 60% (mostly aggregation queries)
```

#### Gate 3: Mock Contract Validation
```bash
# Runs on: CI only
# Validates all mocks match interface contracts
# Timeout: 1 minute

npm run test:contract-validation

# Checks:
# - All @Mocked types implement full interface
# - No unimplemented methods in mock
# - Mock return types match interface definitions
# - Jest mock spies are registered correctly
```

#### Gate 5: Integration Tests (PR Phase)
```bash
# Runs on: CI per pull request
# Timeout: 5 minutes
# Can fail without blocking merge (monitoring-only for first week)

npm test -- --testPathPattern=integration \
  --testTimeout=10000

# Tests domain coordination:
# - Learning → Certification (completion check)
# - Certification → Notification (badge issued)
# - Skill Lab → Metrics (submission recorded)
# - Learning → Community (event published)
```

#### Gate 6: E2E Tests (Nightly)
```bash
# Runs on: Scheduled nightly (2 AM UTC)
# Uses: Real database + mock external services
# Timeout: 15 minutes
# Fail: Send Slack alert, don't block anything

npm test -- --testPathPattern=e2e \
  --testTimeout=60000 \
  --detectOpenHandles

# Scenarios:
# - Full user journey: register → course → badge
# - Skill Lab: submit → validate → get feedback
# - Community: post → mention → get notified
# - Metrics: all dashboards load with fresh data
```

---

## 6. Test Data Strategy

### Mock Factory Pattern (London School)

```typescript
// tests/factories/learning.factory.ts
export class LearningMockFactory {
  static createMockCompletions(count: number = 3): Completion[] {
    return Array.from({ length: count }, (_, i) => ({
      userId: `u-${Math.random()}`,
      moduleId: `m-${i + 1}`,
      completedAt: new Date(Date.now() - i * 86400000) // Days ago
    }));
  }

  static createMockLearningRepository(): jest.Mocked<ILearningRepository> {
    return {
      getCompletions: jest.fn().mockResolvedValue(this.createMockCompletions()),
      markModuleComplete: jest.fn().mockResolvedValue(undefined),
      getProgress: jest.fn().mockResolvedValue(Math.random()),
      findById: jest.fn().mockResolvedValue(null)
    };
  }

  static createMockEventPublisher(): jest.Mocked<ILearningEventPublisher> {
    return {
      moduleCompleted: jest.fn().mockResolvedValue(undefined),
      courseStarted: jest.fn().mockResolvedValue(undefined),
      progressUpdated: jest.fn().mockResolvedValue(undefined)
    };
  }
}

// Usage in tests
const mockLearning = LearningMockFactory.createMockLearningRepository();
const service = new BadgeIssuanceService(mockLearning, ...);
```

### Domain-Driven Test Builders

```typescript
// tests/builders/certification.builder.ts
export class CertificationTestBuilder {
  private badge: Partial<Badge> = {
    id: `badge-${Date.now()}`,
    userId: 'test-user',
    badgeType: 'course-complete',
    issuedAt: new Date()
  };

  withUserId(userId: string): this {
    this.badge.userId = userId;
    return this;
  }

  withBadgeType(type: string): this {
    this.badge.badgeType = type;
    return this;
  }

  withIssuedDate(date: Date): this {
    this.badge.issuedAt = date;
    return this;
  }

  build(): Badge {
    return this.badge as Badge;
  }

  static aBadge(): CertificationTestBuilder {
    return new CertificationTestBuilder();
  }
}

// Usage: fluent and readable
const badge = CertificationTestBuilder.aBadge()
  .withUserId('u-123')
  .withBadgeType('advanced-react')
  .withIssuedDate(new Date())
  .build();
```

### Seeds for Each Domain

```typescript
// tests/seeds/learning.seed.ts
export const LEARNING_SEED = {
  modules: [
    { id: 'm-101', title: 'Fundamentals', courseId: 'c-1', duration: 60 },
    { id: 'm-102', title: 'Advanced', courseId: 'c-1', duration: 120 },
    { id: 'm-201', title: 'Frameworks', courseId: 'c-2', duration: 90 }
  ],
  courses: [
    { id: 'c-1', title: 'React Basics', modules: ['m-101', 'm-102'] },
    { id: 'c-2', title: 'Advanced Web', modules: ['m-201'] }
  ]
};

// tests/seeds/certification.seed.ts
export const CERTIFICATION_SEED = {
  badgeTypes: [
    { id: 'bt-1', name: 'Beginner', requiredModules: 1 },
    { id: 'bt-2', name: 'Advanced', requiredModules: 5 },
    { id: 'bt-3', name: 'Expert', requiredModules: 10 }
  ],
  badgeRequirements: {
    'course-complete': { requiredCompleted: 3, requiredScore: 0.7 },
    'advanced-track': { requiredCompleted: 5, requiredScore: 0.85 }
  }
};
```

---

## 7. Quality Metrics & Verification

### Coverage Requirements by Domain

```
Learning Domain
├─ Minimum: 75% lines, 75% branches
├─ Unit: LearningService, CompletionValidator
├─ Integration: Learning + Repository, Learning + EventPublisher
├─ E2E: Module completion user flow
└─ Coverage Goal: 80% (focus on service contracts)

Certification Domain
├─ Minimum: 75% lines, 80% branches (more complex logic)
├─ Unit: BadgeIssuanceService, RequirementValidator
├─ Integration: Certification + Learning verification
├─ E2E: Badge issuance after completion
└─ Coverage Goal: 85% (high contract complexity)

Skill Lab Domain
├─ Minimum: 60% lines, 70% branches (Ruflo agent mocks reduce coverage)
├─ Unit: ExerciseValidator, FeedbackGenerator
├─ Integration: SkillLab + Ruflo + Metrics
├─ E2E: Code submission → validation → feedback
└─ Coverage Goal: 70% (external service dependency)

Community Domain
├─ Minimum: 75% lines, 75% branches
├─ Unit: PostService, ReplyService, MentionProcessor
├─ Integration: Community + Notification, Community + Learning events
├─ E2E: Post creation → peer notification
└─ Coverage Goal: 80% (event-driven complexity)

Metrics Domain
├─ Minimum: 70% lines, 70% branches
├─ Unit: AggregationService, QueryBuilder
├─ Integration: Metrics + multiple data sources
├─ E2E: Dashboard data freshness
└─ Coverage Goal: 75% (mostly read-only)
```

### Acceptance Criteria Verification

```typescript
// tests/acceptance/learning-acceptance.spec.ts
describe('Learning Domain - Acceptance Criteria', () => {
  // PRD Requirement: "User can complete a module and see progress"
  it('AC-001: Module completion updates progress', async () => {
    const service = createLearningService(/* mocks */);
    
    // Before
    let progress = await service.getProgress(userId, courseId);
    expect(progress).toBeLessThan(1.0);

    // Action
    await service.completeModule(userId, moduleId);

    // After
    progress = await service.getProgress(userId, courseId);
    expect(progress).toBeGreaterThan(0);
  });

  // PRD Requirement: "Completion event triggers badge eligibility check"
  it('AC-002: Completion publishes event for badge system', async () => {
    const mockEventPublisher = createMockEventPublisher();
    const service = new LearningService(..., mockEventPublisher);

    await service.completeModule(userId, moduleId);

    expect(mockEventPublisher.moduleCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ userId, moduleId })
    );
  });
});
```

### Untested Domain Invariants Check

```typescript
// tests/invariants/domain-invariants.spec.ts
describe('Domain Invariants', () => {
  it('Certification: A badge cannot be issued twice for same user+badge type', async () => {
    const service = new BadgeIssuanceService(mocks);
    
    await service.issueBadge(userId, 'course-complete', courseId);
    
    // Try issuing again
    await expect(
      service.issueBadge(userId, 'course-complete', courseId)
    ).rejects.toThrow('Badge already issued');
  });

  it('Learning: A module cannot be completed twice', async () => {
    const service = new LearningService(mocks);
    
    await service.completeModule(userId, moduleId);
    
    // Try completing again
    await expect(
      service.completeModule(userId, moduleId)
    ).rejects.toThrow('Module already completed');
  });

  it('Skill Lab: A hint cannot be requested before submission', async () => {
    const service = new SkillLabService(mocks);
    
    await expect(
      service.requestHint(userId, exerciseId, 1)
    ).rejects.toThrow('No submission found');
  });
});
```

---

## 8. Swarm Test Coordination

### Test Agent Orchestration

```typescript
// tests/coordination/swarm-test-coordinator.ts
export class SwarmTestCoordinator {
  private agents = new Map<string, TestAgent>();

  async coordinateTests(): Promise<void> {
    // Unit tests run in parallel (London mocks, no coordination needed)
    await Promise.all([
      this.runDomainTests('learning'),
      this.runDomainTests('certification'),
      this.runDomainTests('skill-lab'),
      this.runDomainTests('community'),
      this.runDomainTests('metrics')
    ]);

    // Integration tests run sequentially (dependencies matter)
    await this.runIntegrationTests('learning-to-certification');
    await this.runIntegrationTests('certification-to-notification');
    await this.runIntegrationTests('skill-lab-to-metrics');
  }

  private async runDomainTests(domain: string): Promise<void> {
    const agent = new TestAgent(domain);
    this.agents.set(domain, agent);
    
    await agent.runUnitTests();
    await agent.reportCoverage();
  }

  private async runIntegrationTests(integration: string): Promise<void> {
    const [domain1, domain2] = integration.split('-to-');
    
    // Share mocks between domains
    const agent1Mocks = this.agents.get(domain1).getMockContracts();
    const agent2Mocks = this.agents.get(domain2).getMockContracts();
    
    await runIntegrationTest(domain1, domain2, agent1Mocks, agent2Mocks);
  }
}
```

### Mock Contract Sharing

```typescript
// tests/contracts/shared-mock-contracts.ts
export const SHARED_MOCK_CONTRACTS = {
  learning: {
    getCompletions: {
      input: { userId: 'string' },
      output: 'Completion[]',
      usedBy: ['Certification', 'Metrics']
    },
    markModuleComplete: {
      input: { userId: 'string', moduleId: 'string' },
      output: 'Promise<void>',
      usedBy: ['Certification', 'Community']
    }
  },
  
  certification: {
    issueBadge: {
      input: { userId: 'string', badgeType: 'string' },
      output: 'Badge',
      usedBy: ['Metrics', 'Community']
    },
    verifyRequirements: {
      input: { userId: 'string', badgeType: 'string' },
      output: 'boolean',
      usedBy: ['Learning']
    }
  }
};

// Swarm agents validate all contracts
export function validateContractCompliance(agent: TestAgent): void {
  const contracts = SHARED_MOCK_CONTRACTS[agent.domain];
  
  for (const [method, contract] of Object.entries(contracts)) {
    const mock = agent.getMock(method);
    if (!mock) {
      throw new Error(`Missing mock for ${agent.domain}.${method}`);
    }
    validateMockSignature(mock, contract);
  }
}
```

---

## 9. Test File Organization

```
/tests
├── unit/
│   ├── learning/
│   │   ├── learning-service.spec.ts
│   │   ├── completion-validator.spec.ts
│   │   └── __mocks__/
│   │       └── learning-mocks.ts
│   ├── certification/
│   │   ├── badge-issuance.spec.ts
│   │   ├── requirement-checker.spec.ts
│   │   └── __mocks__/
│   │       └── certification-mocks.ts
│   ├── skill-lab/
│   │   ├── exercise-validator.spec.ts
│   │   ├── feedback-generator.spec.ts
│   │   └── __mocks__/
│   │       ├── ruflo-agent.mock.ts
│   │       └── skill-lab-mocks.ts
│   ├── community/
│   │   ├── post-service.spec.ts
│   │   ├── mention-processor.spec.ts
│   │   └── __mocks__/
│   │       └── community-mocks.ts
│   └── metrics/
│       ├── aggregation-service.spec.ts
│       └── __mocks__/
│           └── metrics-mocks.ts
│
├── integration/
│   ├── learning-certification.spec.ts
│   ├── certification-notification.spec.ts
│   ├── skill-lab-metrics.spec.ts
│   ├── learning-community.spec.ts
│   └── end-to-end-flow.spec.ts
│
├── e2e/
│   ├── user-journey.spec.ts
│   ├── badge-issuance-flow.spec.ts
│   ├── skill-lab-complete.spec.ts
│   └── community-collaboration.spec.ts
│
├── acceptance/
│   ├── learning-acceptance.spec.ts
│   ├── certification-acceptance.spec.ts
│   ├── skill-lab-acceptance.spec.ts
│   ├── community-acceptance.spec.ts
│   └── metrics-acceptance.spec.ts
│
├── factories/
│   ├── learning.factory.ts
│   ├── certification.factory.ts
│   ├── skill-lab.factory.ts
│   ├── community.factory.ts
│   └── metrics.factory.ts
│
├── builders/
│   ├── completion.builder.ts
│   ├── badge.builder.ts
│   ├── exercise.builder.ts
│   ├── post.builder.ts
│   └── metric.builder.ts
│
├── seeds/
│   ├── learning.seed.ts
│   ├── certification.seed.ts
│   ├── skill-lab.seed.ts
│   ├── community.seed.ts
│   └── metrics.seed.ts
│
├── contracts/
│   ├── learning-contract.ts
│   ├── certification-contract.ts
│   ├── skill-lab-contract.ts
│   ├── community-contract.ts
│   ├── metrics-contract.ts
│   └── shared-contracts.ts
│
├── coordination/
│   ├── swarm-test-coordinator.ts
│   └── mock-contract-validator.ts
│
├── invariants/
│   ├── domain-invariants.spec.ts
│   ├── cross-domain-invariants.spec.ts
│   └── contract-invariants.spec.ts
│
└── jest.config.js
```

---

## 10. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Define mock contracts for all 5 domains
- [ ] Create mock factories for each domain
- [ ] Establish test builders and seeds
- [ ] Set up Jest configuration with coverage thresholds
- [ ] Write 3-4 concrete London School examples

### Phase 2: Unit Tests (Weeks 2-3)
- [ ] Learning domain: 40% unit coverage (15 tests)
- [ ] Certification domain: 50% unit coverage (20 tests)
- [ ] Skill Lab domain: 30% unit coverage (12 tests)
- [ ] Community domain: 40% unit coverage (16 tests)
- [ ] Metrics domain: 60% unit coverage (18 tests)
- [ ] All unit tests use London School mocks
- [ ] All acceptance criteria have passing tests

### Phase 3: Integration Tests (Weeks 4-5)
- [ ] Learning + Certification flow
- [ ] Certification + Notification flow
- [ ] Skill Lab + Ruflo + Metrics flow
- [ ] Learning + Community event coordination
- [ ] Multi-domain transaction testing

### Phase 4: E2E & CI/CD (Weeks 6-7)
- [ ] End-to-end user journeys
- [ ] CI/CD gate configuration
- [ ] Nightly E2E test suite
- [ ] Coverage reporting dashboard
- [ ] Contract compliance validation

### Phase 5: Monitoring (Ongoing)
- [ ] Coverage trend tracking
- [ ] Flaky test detection
- [ ] Mock contract drift detection
- [ ] Swarm test coordination metrics

---

## 11. Quick Reference: Common London School Patterns

### Pattern 1: Verify Collaborator Method Called

```typescript
it('should call repository save method', async () => {
  const mockRepo = { save: jest.fn() };
  const service = new Service(mockRepo);
  
  await service.doSomething();
  
  expect(mockRepo.save).toHaveBeenCalledWith(expectedData);
});
```

### Pattern 2: Verify Call Order (Interactions Matter)

```typescript
it('should verify step sequence', async () => {
  const calls: string[] = [];
  mockA.method.mockImplementation(() => { calls.push('A'); });
  mockB.method.mockImplementation(() => { calls.push('B'); });
  
  await service.execute();
  
  expect(calls).toEqual(['A', 'B']);
});
```

### Pattern 3: Verify Parameter Shape

```typescript
it('should pass correct data shape', async () => {
  const mockRepo = { save: jest.fn() };
  const service = new Service(mockRepo);
  
  await service.create(input);
  
  expect(mockRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: input.userId,
      timestamp: expect.any(Date)
    })
  );
});
```

### Pattern 4: Handle Collaborator Failure

```typescript
it('should handle dependency failure', async () => {
  const error = new Error('Network error');
  mockApi.fetch.mockRejectedValue(error);
  
  await expect(service.doSomething()).rejects.toThrow('Network error');
  
  // Verify cleanup
  expect(mockCleanup.teardown).toHaveBeenCalled();
});
```

### Pattern 5: Use Spy to Assert Behavior

```typescript
it('should retry on temporary failure', async () => {
  mockApi.call
    .mockRejectedValueOnce(new Error('Temporary'))
    .mockResolvedValueOnce(data);
  
  const result = await service.withRetry();
  
  expect(mockApi.call).toHaveBeenCalledTimes(2);
  expect(result).toEqual(data);
});
```

---

## 12. Conclusion

This TDD London School strategy ensures:

1. **Outside-In Development**: Tests drive design from user behavior down to implementation
2. **Mock Contracts**: Clear interfaces between bounded contexts enable safe, fast unit testing
3. **Behavior Verification**: Tests verify HOW services collaborate, not WHAT they contain
4. **Swarm Coordination**: Integration tests validate cross-domain interactions
5. **Quality Gates**: Multi-stage CI/CD pipeline ensures code quality at every step
6. **Measurable Metrics**: Coverage and acceptance criteria track progress

By following this strategy, the Ruflo learning platform will achieve:
- **Fast feedback** (unit tests in <2 minutes)
- **High confidence** (75%+ coverage per domain)
- **Safe refactoring** (mock contracts prevent breaking changes)
- **Clear contracts** (explicit interfaces between domains)
- **Testable architecture** (mocks enable isolated testing)

---

## References

- **London School TDD**: https://github.com/testdouble/contributing-tests/wiki/London-TDD-vs-Chicago-TDD
- **Mock Objects**: Freeman & Pryce, "Growing Object-Oriented Software, Guided by Tests"
- **Domain-Driven Design**: Evans, "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- **Jest Documentation**: https://jestjs.io/docs/getting-started
