/**
 * EventBus Mock Contract Definition
 * London School TDD - Mock contracts for EventBus infrastructure
 *
 * Defines interactions with:
 * - Event handlers (subscriptions and handler execution)
 * - Dead-letter queue (DLQ) for failed events
 * - Retry mechanism (exponential backoff)
 * - Idempotency tracking (processed events)
 */

import { DomainEvent, EventMetadata } from '../../src/shared/infrastructure/events/DomainEvent';

/**
 * Mock Event Handler interface
 * Handlers are async functions that process domain events
 */
export type MockEventHandler = vi.MockedFunction<(event: any) => Promise<void>>;

/**
 * Factory for creating mock event handler
 */
export function createMockEventHandler(): MockEventHandler {
  return vi.fn().mockResolvedValue(undefined);
}

/**
 * Mock Subscription interface
 * Represents registered event handlers with their type and ID
 */
export interface MockSubscription {
  id: string;
  eventType: string;
  handler: MockEventHandler;
}

/**
 * Mock DeadLetterQueue interface
 * Tracks failed events with retry metadata
 */
export interface MockDeadLetterQueue {
  addEvent: vi.MockedFunction<(event: any, error: string, stack?: string) => Promise<void>>;
  getEvent: vi.MockedFunction<(dlqEventId: string) => Promise<any | null>>;
  getAllEvents: vi.MockedFunction<() => Promise<any[]>>;
  removeEvent: vi.MockedFunction<(dlqEventId: string) => Promise<void>>;
  getSize: vi.MockedFunction<() => Promise<number>>;
  clear: vi.MockedFunction<() => Promise<void>>;
}

/**
 * Factory for creating mock DLQ
 */
export function createMockDeadLetterQueue(): MockDeadLetterQueue {
  return {
    addEvent: vi.fn().mockResolvedValue(undefined),
    getEvent: vi.fn().mockResolvedValue(null),
    getAllEvents: vi.fn().mockResolvedValue([]),
    removeEvent: vi.fn().mockResolvedValue(undefined),
    getSize: vi.fn().mockResolvedValue(0),
    clear: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock Retry Policy interface
 * Defines exponential backoff configuration
 */
export interface MockRetryPolicy {
  validateMaxRetries: vi.MockedFunction<(count: number) => boolean>;
  getBackoffDelay: vi.MockedFunction<(retryCount: number) => number>;
  canRetry: vi.MockedFunction<(currentRetries: number) => boolean>;
}

/**
 * Factory for creating mock Retry Policy
 */
export function createMockRetryPolicy(): MockRetryPolicy {
  return {
    validateMaxRetries: vi.fn().mockReturnValue(true),
    getBackoffDelay: vi.fn().mockReturnValue(1000),
    canRetry: vi.fn().mockReturnValue(true),
  };
}

/**
 * Mock Idempotency Tracker interface
 * Tracks which events have been processed to prevent duplicates
 */
export interface MockIdempotencyTracker {
  hasProcessed: vi.MockedFunction<(eventId: string) => Promise<boolean>>;
  markProcessed: vi.MockedFunction<(eventId: string) => Promise<void>>;
  unmarkProcessed: vi.MockedFunction<(eventId: string) => Promise<void>>;
  getProcessedCount: vi.MockedFunction<() => Promise<number>>;
}

/**
 * Factory for creating mock Idempotency Tracker
 */
export function createMockIdempotencyTracker(): MockIdempotencyTracker {
  return {
    hasProcessed: vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined),
    unmarkProcessed: vi.fn().mockResolvedValue(undefined),
    getProcessedCount: vi.fn().mockResolvedValue(0),
  };
}

/**
 * Mock EventBus interface
 * Defines the core publish/subscribe contract
 */
export interface MockEventBus {
  publish: vi.MockedFunction<(event: any) => Promise<void>>;
  subscribe: vi.MockedFunction<(eventType: string, handler: MockEventHandler) => string>;
  unsubscribe: vi.MockedFunction<(subscriptionId: string) => void>;
  retry: vi.MockedFunction<(dlqEventId: string) => Promise<boolean>>;
  getDeadLetterQueue: vi.MockedFunction<() => any[]>;
  getDeadLetterQueueSize: vi.MockedFunction<() => number>;
  getProcessedEventCount: vi.MockedFunction<() => number>;
  getSubscriptionCount: vi.MockedFunction<() => number>;
  isHealthy: vi.MockedFunction<() => boolean>;
}

/**
 * Factory for creating mock EventBus
 */
export function createMockEventBus(): MockEventBus {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue(`sub-${Date.now()}`),
    unsubscribe: vi.fn(),
    retry: vi.fn().mockResolvedValue(true),
    getDeadLetterQueue: vi.fn().mockReturnValue([]),
    getDeadLetterQueueSize: vi.fn().mockReturnValue(0),
    getProcessedEventCount: vi.fn().mockReturnValue(0),
    getSubscriptionCount: vi.fn().mockReturnValue(0),
    isHealthy: vi.fn().mockReturnValue(true),
  };
}

/**
 * Mock Domain Event factory for test data
 */
export class MockDomainEvent extends DomainEvent {
  readonly eventType: string;
  readonly version: string;
  readonly domain: string;

  constructor(
    aggregateId: string,
    eventType: string = 'TestEvent',
    domain: string = 'Test',
    aggregateVersion: number = 1,
    metadata?: Partial<EventMetadata>
  ) {
    super(aggregateId, aggregateVersion, {
      correlationId: `corr-${Date.now()}`,
      userId: 'user-123',
      ...metadata,
    });
    this.eventType = eventType;
    this.version = 'v1';
    this.domain = domain;
  }

  static fromJSON(json: any): MockDomainEvent {
    return new MockDomainEvent(
      json.aggregateId,
      json.eventType,
      json.domain,
      json.aggregateVersion,
      json.metadata
    );
  }
}

/**
 * Mock EventBus Publisher interface
 * Handles publishing events with retry and error handling
 */
export interface MockEventPublisher {
  publishWithRetry: vi.MockedFunction<(event: any, retryCount?: number) => Promise<void>>;
  publishBatch: vi.MockedFunction<(events: any[]) => Promise<void>>;
  getPublishedCount: vi.MockedFunction<() => number>;
}

/**
 * Factory for creating mock EventPublisher
 */
export function createMockEventPublisher(): MockEventPublisher {
  return {
    publishWithRetry: vi.fn().mockResolvedValue(undefined),
    publishBatch: vi.fn().mockResolvedValue(undefined),
    getPublishedCount: vi.fn().mockReturnValue(0),
  };
}

/**
 * Mock interaction verification for EventBus
 * Verifies correct sequence: subscribe → publish → handler execution → event processing
 */
export interface EventBusInteractionSequence {
  /**
   * Step 1: Handler subscribes to event type
   */
  subscribed: {
    method: 'subscribe';
    eventType: string;
    subscriptionId: string;
  };

  /**
   * Step 2: Event is published
   */
  published: {
    method: 'publish';
    eventId: string;
    eventType: string;
  };

  /**
   * Step 3: Check idempotency (prevent duplicates)
   */
  idempotencyChecked: {
    method: 'hasProcessed';
    eventId: string;
    isDuplicate: boolean;
  };

  /**
   * Step 4: Mark event as processed
   */
  marked: {
    method: 'markProcessed';
    eventId: string;
  };

  /**
   * Step 5: Execute handler(s)
   */
  handlerExecuted: {
    eventType: string;
    handlerCount: number;
    success: boolean;
  };

  /**
   * Step 6: On failure, add to DLQ
   */
  dlqUpdated: {
    eventId: string;
    error: string;
    retryCount: number;
  };
}

/**
 * Event Publishing SAGA Contract
 * Defines workflow: subscribe → publish → idempotency check → handler execution → failure handling
 */
export interface EventPublishingSagaContract {
  /**
   * Trigger: Domain aggregate publishes event
   */
  trigger: {
    aggregateId: string;
    eventType: string;
    eventId: string;
  };

  /**
   * Step 1: Verify event metadata
   */
  metadataValidated: {
    correlationId: string;
    aggregateVersion: number;
    domain: string;
  };

  /**
   * Step 2: Check if already processed (idempotency)
   */
  idempotencyCheck: {
    method: 'hasProcessed';
    alreadyProcessed: boolean;
  };

  /**
   * Step 3: Mark as processed
   */
  markedProcessed: {
    method: 'markProcessed';
    timestamp: Date;
  };

  /**
   * Step 4: Find all subscribers for event type
   */
  subscribersFound: {
    eventType: string;
    subscriberCount: number;
  };

  /**
   * Step 5: Execute all handlers concurrently
   */
  handlersExecuted: {
    concurrent: boolean;
    executionCount: number;
  };

  /**
   * Step 6: On handler failure, add to DLQ
   */
  dlqAddition: {
    method: 'addEvent';
    eventId: string;
    error: string;
    retryCount: number;
  };

  /**
   * Step 7: Emit success or failure event
   */
  eventEmitted: {
    eventType: 'EventPublished' | 'EventProcessingFailed';
    eventId: string;
  };
}

/**
 * Retry SAGA Contract
 * Defines workflow: retrieve from DLQ → apply backoff → republish → update retry count
 */
export interface RetryPublishingSagaContract {
  /**
   * Trigger: Manual retry initiated for DLQ event
   */
  trigger: {
    dlqEventId: string;
    initiatedBy: string;
  };

  /**
   * Step 1: Retrieve event from DLQ
   */
  eventRetrieved: {
    method: 'getEvent';
    dlqEventId: string;
  };

  /**
   * Step 2: Check max retry limit
   */
  retryLimitCheck: {
    currentRetries: number;
    maxRetries: number;
    canRetry: boolean;
  };

  /**
   * Step 3: Calculate backoff delay
   */
  backoffCalculated: {
    retryAttempt: number;
    delayMs: number;
  };

  /**
   * Step 4: Unmark event as processed (allow republish)
   */
  unmarkProcessed: {
    method: 'unmarkProcessed';
    eventId: string;
  };

  /**
   * Step 5: Republish event
   */
  republished: {
    method: 'publish';
    eventId: string;
  };

  /**
   * Step 6: On success, remove from DLQ
   */
  dlqRemoval: {
    method: 'removeEvent';
    dlqEventId: string;
  };

  /**
   * Step 7: On failure, update retry metadata
   */
  retryMetadataUpdated: {
    retryCount: number;
    nextRetryAt: Date;
  };
}

/**
 * EventBus domain events contract
 * Events that EventBus publishes about its own operations
 */
export interface EventBusDomainEventContract {
  EventPublished: {
    aggregateId: string;
    aggregateType: 'EventBus';
    eventType: 'EventPublished';
    payload: {
      eventId: string;
      originalEventType: string;
      subscriberCount: number;
      publishedAt: Date;
    };
  };

  EventProcessingFailed: {
    aggregateId: string;
    aggregateType: 'EventBus';
    eventType: 'EventProcessingFailed';
    payload: {
      eventId: string;
      originalEventType: string;
      error: string;
      dlqId: string;
      failedAt: Date;
    };
  };

  EventRetried: {
    aggregateId: string;
    aggregateType: 'EventBus';
    eventType: 'EventRetried';
    payload: {
      dlqEventId: string;
      originalEventId: string;
      retryAttempt: number;
      succeededAt: Date;
    };
  };

  EventRetryExhausted: {
    aggregateId: string;
    aggregateType: 'EventBus';
    eventType: 'EventRetryExhausted';
    payload: {
      dlqEventId: string;
      originalEventId: string;
      totalRetries: number;
      failedAt: Date;
    };
  };

  DuplicateEventDetected: {
    aggregateId: string;
    aggregateType: 'EventBus';
    eventType: 'DuplicateEventDetected';
    payload: {
      eventId: string;
      eventType: string;
      detectedAt: Date;
    };
  };

  HealthCheckFailed: {
    aggregateId: string;
    aggregateType: 'EventBus';
    eventType: 'HealthCheckFailed';
    payload: {
      dlqSize: number;
      threshold: number;
      timestamp: Date;
    };
  };
}

/**
 * EventBus interaction patterns for verification
 * Patterns that mock verification tools use to validate EventBus behavior
 */
export interface EventBusVerificationPatterns {
  /**
   * Verify subscription was registered
   */
  verifySubscribed: (eventType: string, subscriptionId: string) => boolean;

  /**
   * Verify handler was called with correct event
   */
  verifyHandlerCalled: (handler: MockEventHandler, event: any) => boolean;

  /**
   * Verify event was published to all subscribers
   */
  verifyPublishedToAll: (eventType: string) => boolean;

  /**
   * Verify idempotency: duplicate event was rejected
   */
  verifyIdempotencyEnforced: (eventId: string) => boolean;

  /**
   * Verify retry behavior: event was retried with backoff
   */
  verifyRetryBackoff: (dlqEventId: string, expectedDelayMs: number) => boolean;

  /**
   * Verify DLQ management: failed event stored with metadata
   */
  verifyDLQStorage: (dlqEventId: string) => boolean;

  /**
   * Verify handler isolation: failure didn't block other handlers
   */
  verifyHandlerIsolation: (eventType: string) => boolean;

  /**
   * Verify health check: DLQ size below threshold
   */
  verifyHealth: () => boolean;
}
