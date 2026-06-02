# Ruflo Platform: London School Mock Implementation Guide

**Companion to**: TDD_LONDON_SCHOOL_STRATEGY.md  
**Purpose**: Practical implementation patterns for creating and managing mocks across the Ruflo platform  

---

## 1. Mock Factory Architecture

### Base Mock Factory Pattern

All domains follow this pattern for consistency:

```typescript
// tests/factories/base.factory.ts
export abstract class BaseMockFactory<T> {
  protected defaultValues: Partial<T>;

  protected constructor(defaults?: Partial<T>) {
    this.defaultValues = defaults || {};
  }

  protected merge(overrides?: Partial<T>): T {
    return {
      ...this.defaultValues,
      ...overrides
    } as T;
  }

  abstract createMock(): jest.Mocked<any>;
}
```

### Learning Domain Mock Factory

```typescript
// tests/factories/learning.factory.ts
import { ILearningRepository, ILearningEventPublisher } from '../../src/domains/learning';

export class LearningMockFactory extends BaseMockFactory<ILearningRepository> {
  constructor() {
    super();
  }

  createMockRepository(overrides?: Partial<Completion[]>): jest.Mocked<ILearningRepository> {
    const defaultCompletions = [
      { userId: 'u-default', moduleId: 'm-1', completedAt: new Date() },
      { userId: 'u-default', moduleId: 'm-2', completedAt: new Date(Date.now() - 86400000) }
    ];

    return {
      getCompletions: jest.fn().mockResolvedValue(overrides || defaultCompletions),
      markModuleComplete: jest.fn().mockResolvedValue(undefined),
      getProgress: jest.fn().mockResolvedValue(0.5),
      findById: jest.fn().mockResolvedValue(null)
    };
  }

  createMockEventPublisher(): jest.Mocked<ILearningEventPublisher> {
    return {
      moduleCompleted: jest.fn().mockResolvedValue(undefined),
      courseStarted: jest.fn().mockResolvedValue(undefined),
      progressUpdated: jest.fn().mockResolvedValue(undefined)
    };
  }

  // Convenience method for tests needing only specific completions
  createMockRepositoryWithCompletions(
    userId: string,
    moduleIds: string[]
  ): jest.Mocked<ILearningRepository> {
    const completions = moduleIds.map((moduleId, idx) => ({
      userId,
      moduleId,
      completedAt: new Date(Date.now() - idx * 86400000)
    }));

    return this.createMockRepository(completions);
  }
}

// Usage in tests
describe('Learning Service', () => {
  let mockFactory: LearningMockFactory;
  let mockRepository: jest.Mocked<ILearningRepository>;

  beforeEach(() => {
    mockFactory = new LearningMockFactory();
    mockRepository = mockFactory.createMockRepository();
  });

  // Tests use mockRepository
});
```

### Certification Domain Mock Factory

```typescript
// tests/factories/certification.factory.ts
import {
  ICertificationService,
  ICertificationRepository
} from '../../src/domains/certification';

export class CertificationMockFactory {
  createMockService(): jest.Mocked<ICertificationService> {
    return {
      issueBadge: jest.fn().mockResolvedValue({
        id: 'badge-default',
        userId: 'u-default',
        badgeType: 'course-complete',
        issuedAt: new Date()
      }),
      verifyCompletionRequirements: jest.fn().mockResolvedValue(true),
      revokeBadge: jest.fn().mockResolvedValue(undefined),
      getBadges: jest.fn().mockResolvedValue([])
    };
  }

  createMockRepository(): jest.Mocked<ICertificationRepository> {
    return {
      saveBadge: jest.fn().mockResolvedValue({
        id: 'badge-saved',
        userId: 'u-default',
        badgeType: 'course-complete',
        issuedAt: new Date()
      }),
      findBadgeById: jest.fn().mockResolvedValue(null),
      revokeBadge: jest.fn().mockResolvedValue(undefined),
      getUserBadges: jest.fn().mockResolvedValue([])
    };
  }

  // Mock verification requirements checker
  createMockRequirementChecker(
    shouldPass: boolean
  ): jest.Mocked<IRequirementChecker> {
    return {
      checkModuleCompletion: jest
        .fn()
        .mockResolvedValue(shouldPass),
      checkScoreRequirement: jest
        .fn()
        .mockResolvedValue(shouldPass),
      checkTimeRequirement: jest
        .fn()
        .mockResolvedValue(shouldPass)
    };
  }
}
```

### Skill Lab Domain Mock Factory

```typescript
// tests/factories/skill-lab.factory.ts
import { IRufloAgent, ISkillLabRepository } from '../../src/domains/skill-lab';

export class SkillLabMockFactory {
  createMockRufloAgent(): jest.Mocked<IRufloAgent> {
    return {
      validateExercise: jest.fn().mockResolvedValue({
        passed: true,
        testsPassed: 0,
        testsTotal: 0,
        executionTime: 0
      }),
      generateFeedback: jest.fn().mockResolvedValue('Good effort!'),
      suggestCorrection: jest.fn().mockResolvedValue({
        code: 'const corrected = true;',
        explanation: 'This is the correct approach.'
      })
    };
  }

  createMockRufloAgentForFailure(error: string): jest.Mocked<IRufloAgent> {
    return {
      validateExercise: jest.fn().mockResolvedValue({
        passed: false,
        testsPassed: 0,
        testsTotal: 1,
        executionTime: 0,
        errors: [{ line: 1, message: error }]
      }),
      generateFeedback: jest.fn().mockResolvedValue(`Error: ${error}`),
      suggestCorrection: jest.fn().mockResolvedValue({
        code: '',
        explanation: 'Fix the error above.'
      })
    };
  }

  createMockRepository(): jest.Mocked<ISkillLabRepository> {
    return {
      saveSubmission: jest.fn().mockResolvedValue({
        id: 'sub-default',
        userId: 'u-default',
        exerciseId: 'ex-default',
        code: '',
        status: 'pending',
        submittedAt: new Date()
      }),
      findSubmissionById: jest.fn().mockResolvedValue(null),
      getExerciseById: jest.fn().mockResolvedValue({
        id: 'ex-default',
        title: 'Test Exercise',
        description: 'A test exercise',
        difficulty: 'beginner',
        testCases: []
      }),
      getUserSubmissions: jest.fn().mockResolvedValue([])
    };
  }
}
```

### Community Domain Mock Factory

```typescript
// tests/factories/community.factory.ts
import {
  ICommunityRepository,
  INotificationService
} from '../../src/domains/community';

export class CommunityMockFactory {
  createMockRepository(): jest.Mocked<ICommunityRepository> {
    return {
      savePost: jest.fn().mockResolvedValue({
        id: 'post-default',
        userId: 'u-default',
        content: 'Default post content',
        createdAt: new Date()
      }),
      findPostById: jest.fn().mockResolvedValue(null),
      deletePost: jest.fn().mockResolvedValue(undefined),
      getThreadPosts: jest.fn().mockResolvedValue([])
    };
  }

  createMockNotificationService(): jest.Mocked<INotificationService> {
    return {
      notifyMentionedUsers: jest.fn().mockResolvedValue(undefined),
      notifyPostCreated: jest.fn().mockResolvedValue(undefined),
      notifyCommentReplied: jest.fn().mockResolvedValue(undefined)
    };
  }

  // Mock mention processor
  createMockMentionProcessor(): jest.Mocked<IMentionProcessor> {
    return {
      extractMentions: jest.fn().mockReturnValue([]),
      validateMentions: jest.fn().mockResolvedValue([]),
      notifyMentions: jest.fn().mockResolvedValue(undefined)
    };
  }
}
```

### Metrics Domain Mock Factory

```typescript
// tests/factories/metrics.factory.ts
import { IDataAggregator } from '../../src/domains/metrics';

export class MetricsMockFactory {
  createMockAggregator(): jest.Mocked<IDataAggregator> {
    return {
      getUserStats: jest.fn().mockResolvedValue({
        userId: 'u-default',
        completedModules: 0,
        completedCourses: 0,
        badgesEarned: 0,
        totalHoursLearned: 0
      }),
      getCourseStats: jest.fn().mockResolvedValue({
        courseId: 'c-default',
        enrollmentCount: 0,
        completionRate: 0,
        averageScore: 0
      }),
      getLeaderboard: jest.fn().mockResolvedValue([])
    };
  }

  // Mock data collectors for different sources
  createMockLearningStatsCollector(): jest.Mocked<IStatsCollector> {
    return {
      collect: jest.fn().mockResolvedValue({
        completedModules: 3,
        completedCourses: 1,
        averageTimePerModule: 45
      })
    };
  }

  createMockCertificationStatsCollector(): jest.Mocked<IStatsCollector> {
    return {
      collect: jest.fn().mockResolvedValue({
        badgesEarned: 2,
        recentBadges: [],
        badgeEarnRate: 0.5
      })
    };
  }
}
```

---

## 2. Test Builder Pattern

### Domain Entity Builders

```typescript
// tests/builders/completion.builder.ts
export class CompletionBuilder {
  private completion: Partial<Completion> = {
    userId: 'u-test-' + Date.now(),
    moduleId: 'm-test-' + Date.now(),
    completedAt: new Date()
  };

  withUserId(userId: string): this {
    this.completion.userId = userId;
    return this;
  }

  withModuleId(moduleId: string): this {
    this.completion.moduleId = moduleId;
    return this;
  }

  withCompletedAt(date: Date): this {
    this.completion.completedAt = date;
    return this;
  }

  withCompletedDaysAgo(days: number): this {
    this.completion.completedAt = new Date(Date.now() - days * 86400000);
    return this;
  }

  build(): Completion {
    return this.completion as Completion;
  }

  static aCompletion(): CompletionBuilder {
    return new CompletionBuilder();
  }

  // Convenience: multiple completions
  static completions(count: number): Completion[] {
    return Array.from({ length: count }, (_, i) =>
      new CompletionBuilder()
        .withModuleId(`m-${i}`)
        .build()
    );
  }
}

// Usage
const completion = CompletionBuilder.aCompletion()
  .withUserId('u-123')
  .withModuleId('m-advanced-react')
  .withCompletedDaysAgo(1)
  .build();

const completions = CompletionBuilder.completions(3);
```

### Service Mock Builder

```typescript
// tests/builders/mock-service.builder.ts
export class MockServiceBuilder<T> {
  private mock: Partial<jest.Mocked<T>> = {};
  private callTracker: Map<string, any[]> = new Map();

  withMethod<K extends keyof T>(
    method: K,
    implementation: jest.MockedFunction<any>
  ): this {
    (this.mock as any)[method] = implementation;
    return this;
  }

  withTrackedMethod<K extends keyof T>(
    method: K,
    returnValue?: any
  ): this {
    const tracked = jest.fn().mockResolvedValue(returnValue);
    this.callTracker.set(method as string, []);

    const originalMock = tracked;
    tracked.mockImplementation(async (...args) => {
      this.callTracker.get(method as string)?.push(args);
      return returnValue;
    });

    (this.mock as any)[method] = tracked;
    return this;
  }

  withFailingMethod<K extends keyof T>(
    method: K,
    error: Error
  ): this {
    (this.mock as any)[method] = jest.fn().mockRejectedValue(error);
    return this;
  }

  build(): jest.Mocked<T> {
    return this.mock as jest.Mocked<T>;
  }

  getCallsFor(method: string): any[] {
    return this.callTracker.get(method) || [];
  }

  static aService<T>(): MockServiceBuilder<T> {
    return new MockServiceBuilder<T>();
  }
}

// Usage
const mockService = MockServiceBuilder.aService<LearningService>()
  .withMethod('getCompletions', jest.fn().mockResolvedValue([]))
  .withTrackedMethod('markModuleComplete', undefined)
  .build();
```

---

## 3. Mock Setup Helpers

### Global Test Setup

```typescript
// tests/setup/mock-setup.ts
export class MockSetup {
  private allMocks: jest.Mocked<any>[] = [];

  addMock(mock: jest.Mocked<any>): void {
    this.allMocks.push(mock);
  }

  resetAll(): void {
    this.allMocks.forEach(mock => {
      jest.clearAllMocks();
    });
  }

  clearAll(): void {
    this.allMocks.forEach(mock => {
      jest.resetAllMocks();
    });
    this.allMocks = [];
  }

  verifyNoUnexpectedCalls(): void {
    this.allMocks.forEach(mock => {
      const callCounts = Object.entries(mock).reduce(
        (acc, [key, value]) => {
          if (jest.isMockFunction(value)) {
            acc[key] = value.mock.calls.length;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      // Log for debugging
      console.debug(`Mock call counts: ${JSON.stringify(callCounts)}`);
    });
  }

  static create(): MockSetup {
    return new MockSetup();
  }
}

// Jest setup file
beforeEach(() => {
  MockSetup.create();
});

afterEach(() => {
  jest.clearAllMocks();
});
```

### Contract Validation Helper

```typescript
// tests/setup/contract-validator.ts
export interface MockContract {
  methods: Map<string, MockMethodContract>;
  dependencies: string[];
}

export interface MockMethodContract {
  inputShape: Record<string, string>;
  outputShape: string;
  async: boolean;
}

export class ContractValidator {
  validate<T>(mock: jest.Mocked<T>, contract: MockContract): boolean {
    for (const [methodName, methodContract] of contract.methods) {
      const mockMethod = (mock as any)[methodName];

      if (!jest.isMockFunction(mockMethod)) {
        throw new Error(`${methodName} is not mocked`);
      }

      // Verify mockable
      if (methodContract.async && !mockMethod.mock.results) {
        throw new Error(`${methodName} should be async`);
      }
    }

    return true;
  }

  static validate<T>(mock: jest.Mocked<T>, contract: MockContract): void {
    new ContractValidator().validate(mock, contract);
  }
}
```

---

## 4. Call Order Verification

### Call Sequence Tracker

```typescript
// tests/helpers/call-sequence-tracker.ts
export class CallSequenceTracker {
  private calls: Array<{ mock: string; method: string; timestamp: number }> = [];

  track(mockName: string, methodName: string): void {
    this.calls.push({
      mock: mockName,
      method: methodName,
      timestamp: Date.now()
    });
  }

  getSequence(): string[] {
    return this.calls.map(c => `${c.mock}.${c.method}`);
  }

  verifySequence(expected: string[]): boolean {
    const actual = this.getSequence();
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  assertSequence(expected: string[]): void {
    const actual = this.getSequence();
    expect(actual).toEqual(expected);
  }

  static create(): CallSequenceTracker {
    return new CallSequenceTracker();
  }
}

// Usage in tests
it('should verify collaboration order', async () => {
  const tracker = CallSequenceTracker.create();

  const mockA = {
    methodA: jest.fn().mockImplementation(() => {
      tracker.track('MockA', 'methodA');
    })
  };

  const mockB = {
    methodB: jest.fn().mockImplementation(() => {
      tracker.track('MockB', 'methodB');
    })
  };

  // Call service
  await service.execute();

  tracker.assertSequence(['MockA.methodA', 'MockB.methodB']);
});
```

---

## 5. Mock Contract Definitions

### Define Contracts for All Domains

```typescript
// tests/contracts/domain-contracts.ts
export const LEARNING_CONTRACT = {
  methods: new Map([
    [
      'getCompletions',
      {
        inputShape: { userId: 'string' },
        outputShape: 'Completion[]',
        async: true
      }
    ],
    [
      'markModuleComplete',
      {
        inputShape: { userId: 'string', moduleId: 'string' },
        outputShape: 'void',
        async: true
      }
    ]
  ]),
  dependencies: ['repository', 'eventPublisher']
};

export const CERTIFICATION_CONTRACT = {
  methods: new Map([
    [
      'issueBadge',
      {
        inputShape: { userId: 'string', badgeType: 'string' },
        outputShape: 'Badge',
        async: true
      }
    ],
    [
      'verifyCompletionRequirements',
      {
        inputShape: { userId: 'string', badgeType: 'string' },
        outputShape: 'boolean',
        async: true
      }
    ]
  ]),
  dependencies: ['learningRepository', 'certificationRepository']
};

export const SKILL_LAB_CONTRACT = {
  methods: new Map([
    [
      'validateExercise',
      {
        inputShape: { code: 'string', testCases: 'TestCase[]' },
        outputShape: 'ValidationResult',
        async: true
      }
    ],
    [
      'generateFeedback',
      {
        inputShape: { code: 'string', errors: 'Error[]' },
        outputShape: 'string',
        async: true
      }
    ]
  ]),
  dependencies: ['rufloAgent', 'repository']
};

export const COMMUNITY_CONTRACT = {
  methods: new Map([
    [
      'savePost',
      {
        inputShape: { userId: 'string', content: 'string' },
        outputShape: 'CommunityPost',
        async: true
      }
    ],
    [
      'notifyMentions',
      {
        inputShape: { postId: 'string', mentions: 'string[]' },
        outputShape: 'void',
        async: true
      }
    ]
  ]),
  dependencies: ['repository', 'notificationService']
};

export const METRICS_CONTRACT = {
  methods: new Map([
    [
      'getUserStats',
      {
        inputShape: { userId: 'string' },
        outputShape: 'UserStatistics',
        async: true
      }
    ],
    [
      'getLeaderboard',
      {
        inputShape: { courseId: 'string', limit: 'number' },
        outputShape: 'LeaderboardEntry[]',
        async: true
      }
    ]
  ]),
  dependencies: ['learningCollector', 'certificationCollector']
};
```

---

## 6. Integration Test Mock Coordination

```typescript
// tests/integration/mock-coordinator.ts
export class IntegrationMockCoordinator {
  private mocks: Map<string, jest.Mocked<any>> = new Map();

  registerMock(domain: string, mock: jest.Mocked<any>): void {
    this.mocks.set(domain, mock);
  }

  // Enable event passing between mocks (simulates real event flow)
  setupEventFlow(
    publisherMock: jest.Mocked<any>,
    subscriberMock: jest.Mocked<any>
  ): void {
    const events: any[] = [];

    publisherMock.publish?.mockImplementation(async (event) => {
      events.push(event);
      await subscriberMock.handle?.(event);
    });
  }

  // Simulate message passing between domains
  setupMessageFlow(
    senderMock: jest.Mocked<any>,
    receiverMock: jest.Mocked<any>
  ): void {
    const messages: any[] = [];

    senderMock.send?.mockImplementation(async (message) => {
      messages.push(message);
      await receiverMock.receive?.(message);
    });
  }

  getAllMockCalls(): Record<string, any[]> {
    const result: Record<string, any[]> = {};

    for (const [domain, mock] of this.mocks) {
      result[domain] = [];
      for (const key in mock) {
        if (jest.isMockFunction(mock[key])) {
          result[domain].push({
            method: key,
            calls: mock[key].mock.calls
          });
        }
      }
    }

    return result;
  }

  static create(): IntegrationMockCoordinator {
    return new IntegrationMockCoordinator();
  }
}

// Usage
describe('Learning → Certification Integration', () => {
  let coordinator: IntegrationMockCoordinator;
  let mockLearning: jest.Mocked<ILearningService>;
  let mockCertification: jest.Mocked<ICertificationService>;

  beforeEach(() => {
    coordinator = IntegrationMockCoordinator.create();
    mockLearning = createMockLearningService();
    mockCertification = createMockCertificationService();

    coordinator.registerMock('learning', mockLearning);
    coordinator.registerMock('certification', mockCertification);

    // Simulate: Learning publishes event → Certification subscribes
    coordinator.setupEventFlow(mockLearning, mockCertification);
  });

  it('should coordinate badge issuance after module completion', async () => {
    await mockLearning.completeModule('u-123', 'm-1');

    // Event flows to Certification
    expect(mockCertification.checkEligibility).toHaveBeenCalled();
  });
});
```

---

## 7. Best Practices

### DO's

```typescript
// ✅ DO: Keep mocks focused
const mockRepo = {
  save: jest.fn().mockResolvedValue(expectedResult)
};

// ✅ DO: Verify interactions, not implementation
expect(mockRepo.save).toHaveBeenCalledWith(expectedData);

// ✅ DO: Use builders for complex test data
const user = UserBuilder.aUser()
  .withId('u-123')
  .withCompletions(3)
  .build();

// ✅ DO: Reset mocks between tests
beforeEach(() => jest.clearAllMocks());

// ✅ DO: Verify call order matters
expect(callOrder).toEqual(['validate', 'save', 'notify']);
```

### DON'Ts

```typescript
// ❌ DON'T: Over-mock internal details
const mockService = {
  internalMethod1: jest.fn(),
  internalMethod2: jest.fn(),
  // ... 20 more internal methods
};

// ❌ DON'T: Verify implementation details
expect(service.internalState.cache.size).toBe(5);

// ❌ DON'T: Use real instances in unit tests
const realDb = new Database(); // NO!

// ❌ DON'T: Create mocks dynamically in test body
beforeEach(() => {
  // This makes test hard to read
  const mockRepo = {
    find: jest.fn().mockImplementation(async (id) => {
      if (id === 'special') return { id, name: 'Special' };
      return { id, name: 'Default' };
    })
  };
});

// ✅ DO: Use builders instead
const mockRepo = MockFactory.createRepository();
mockRepo.find.mockResolvedValue({ id: 'special', name: 'Special' });
```

---

## 8. Running Mock Tests

```bash
# Run all unit tests (London mocks)
npm test -- --testPathPattern=unit

# Run with coverage
npm test -- --testPathPattern=unit --coverage

# Run integration tests
npm test -- --testPathPattern=integration

# Run specific domain
npm test -- tests/unit/learning

# Run single test file
npm test -- tests/unit/learning/badge-issuance.spec.ts

# Watch mode for development
npm test -- --watch tests/unit

# Run with mock validation
npm test -- --testNamePattern="Mock Contract"
```

---

## Conclusion

This mock implementation guide provides:

1. **Reusable factories** for creating consistent mocks across domains
2. **Builders** for constructing test data fluently
3. **Call tracking** for verifying interactions and order
4. **Contract definitions** for ensuring mock compatibility
5. **Integration helpers** for coordinating mocks across domains

Follow these patterns to maintain consistency and readability across the Ruflo platform's test suite.

---

## Quick Reference Links

- Back to: [TDD_LONDON_SCHOOL_STRATEGY.md](./TDD_LONDON_SCHOOL_STRATEGY.md)
- Section: [2. London School Mock Objects & Contracts](#section-2)
- Section: [3. Test-First Examples](#section-3)
