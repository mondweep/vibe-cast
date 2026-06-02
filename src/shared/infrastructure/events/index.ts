/**
 * Event Infrastructure Module
 *
 * Public API for event-driven architecture
 * Exports: DomainEvent, EventBus, EventPublisher
 *
 * Usage:
 * ```typescript
 * import {
 *   DomainEvent,
 *   EventBus,
 *   EventPublisher,
 *   EventHandler,
 * } from '@shared/infrastructure/events';
 * ```
 */

export {
  DomainEvent,
  EventMetadata,
  deserializeEvent,
  EventConstructor,
} from './DomainEvent';

export {
  EventBus,
  EventHandler,
  DeadLetterEvent,
  RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from './EventBus';

export {
  EventPublisher,
  EventSourcedAggregate,
  PublishOptions,
  EventPublishingHook,
  OutboxEvent,
} from './EventPublisher';
