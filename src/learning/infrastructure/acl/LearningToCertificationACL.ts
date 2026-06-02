import { IEventBus } from '../../../shared/infrastructure/events/IEventBus';
import { EventHandler } from '../../../shared/domain/EventHandler';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { Logger } from '../../../shared/infrastructure/logging/Logger';
import { EnrollmentCompleted } from '../../domain/events/EnrollmentCompleted';
import { CandidateQualified } from '../../../certification/domain/events/CandidateQualified';

/**
 * LearningToCertificationACL
 *
 * Anti-Corruption Layer for Learning → Certification event translation
 *
 * Translates domain-specific events:
 * - Input: EnrollmentCompleted (Learning domain)
 * - Output: CandidateQualified (Certification domain)
 *
 * Features:
 * - Event subscription to EnrollmentCompleted
 * - Idempotency tracking via Set<eventId>
 * - Correlation ID propagation (unchanged)
 * - Causation ID tracking (source event ID)
 * - Structured logging with correlationId
 *
 * Idempotency: In-memory Set<eventId> sufficient for Week 10 single-process
 * Persistence: Will be moved to saga_processed_events in Phase 6
 */
export class LearningToCertificationACL implements EventHandler {
  private eventBus: IEventBus;
  private logger: Logger;
  private seen: Set<string> = new Set();

  constructor(eventBus: IEventBus, logger: Logger) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Subscribe this ACL to the event bus
   * Registers handlers for Learning domain events
   */
  subscribe(): string {
    return this.eventBus.subscribe('EnrollmentCompleted', this);
  }

  /**
   * Check if this handler can process the event
   */
  canHandle(event: DomainEvent): boolean {
    return event.getEventName() === 'EnrollmentCompleted';
  }

  /**
   * Handle EnrollmentCompleted event
   *
   * Workflow:
   * 1. Check idempotency: return if already processed
   * 2. Parse event as EnrollmentCompleted
   * 3. Transform to CandidateQualified
   * 4. Propagate correlationId unchanged
   * 5. Set causationId = EnrollmentCompleted.id
   * 6. Publish to EventBus
   */
  async handle(event: DomainEvent): Promise<void> {
    if (!(event instanceof EnrollmentCompleted)) {
      this.logger.warn('LearningToCertificationACL: event is not EnrollmentCompleted', {
        eventName: event.getEventName(),
        eventId: event.id,
      });
      return;
    }

    const eventId = event.id;

    // IDEMPOTENCY CHECK
    if (this.seen.has(eventId)) {
      this.logger.debug('LearningToCertificationACL: skipping duplicate event', {
        eventId,
        correlationId: event.correlationId,
      });
      return;
    }

    // Mark as seen
    this.seen.add(eventId);

    this.logger.info('LearningToCertificationACL: transforming EnrollmentCompleted', {
      eventId,
      enrollmentId: event.enrollmentId,
      learnerId: event.learnerId,
      correlationId: event.correlationId,
    });

    try {
      // Transform event
      const candidateQualified = new CandidateQualified({
        enrollmentId: event.enrollmentId,
        learnerId: event.learnerId,
        correlationId: event.correlationId, // Propagate unchanged
        causationId: event.id, // Source event ID
      });

      // Publish to EventBus
      await this.eventBus.publish(candidateQualified);

      this.logger.info('LearningToCertificationACL: published CandidateQualified', {
        sourceEventId: eventId,
        targetEventId: candidateQualified.id,
        correlationId: event.correlationId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('LearningToCertificationACL: failed to transform event', {
        eventId,
        error: errorMessage,
        correlationId: event.correlationId,
      });

      throw error;
    }
  }

  /**
   * Get idempotency tracking statistics
   * Useful for monitoring
   */
  getProcessedCount(): number {
    return this.seen.size;
  }

  /**
   * Clear idempotency tracking
   * Use with caution - may allow duplicate processing
   */
  clearProcessedEvents(): void {
    const previousSize = this.seen.size;
    this.seen.clear();

    this.logger.warn('LearningToCertificationACL: cleared processed events', {
      clearedCount: previousSize,
    });
  }
}
