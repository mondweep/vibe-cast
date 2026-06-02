import { IEventBus } from '../../../shared/infrastructure/events/IEventBus';
import { EventHandler } from '../../../shared/domain/EventHandler';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { Logger } from '../../../shared/infrastructure/logging/Logger';
import { BadgeIssued } from '../../domain/events/BadgeIssued';
import { BadgeEarned } from '../../../community/domain/events/BadgeEarned';

/**
 * CertificationToCommunityACL
 *
 * Anti-Corruption Layer for Certification → Community event translation
 *
 * Translates domain-specific events:
 * - Input: BadgeIssued (Certification domain)
 * - Output: BadgeEarned (Community domain)
 *
 * Features:
 * - Event subscription to BadgeIssued
 * - Idempotency tracking via Set<eventId>
 * - Correlation ID propagation (unchanged)
 * - Causation ID tracking (source event ID)
 * - Structured logging with correlationId
 *
 * Idempotency: In-memory Set<eventId> sufficient for Week 10 single-process
 */
export class CertificationToCommunityACL implements EventHandler {
  private eventBus: IEventBus;
  private logger: Logger;
  private seen: Set<string> = new Set();

  constructor(eventBus: IEventBus, logger: Logger) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Subscribe this ACL to the event bus
   * Registers handlers for Certification domain events
   */
  subscribe(): string {
    return this.eventBus.subscribe('BadgeIssued', this);
  }

  /**
   * Check if this handler can process the event
   */
  canHandle(event: DomainEvent): boolean {
    return event.getEventName() === 'BadgeIssued';
  }

  /**
   * Handle BadgeIssued event
   *
   * Workflow:
   * 1. Check idempotency: return if already processed
   * 2. Parse event as BadgeIssued
   * 3. Transform to BadgeEarned
   * 4. Propagate correlationId unchanged
   * 5. Set causationId = BadgeIssued.id
   * 6. Publish to EventBus
   */
  async handle(event: DomainEvent): Promise<void> {
    if (!(event instanceof BadgeIssued)) {
      this.logger.warn('CertificationToCommunityACL: event is not BadgeIssued', {
        eventName: event.getEventName(),
        eventId: event.id,
      });
      return;
    }

    const eventId = event.id;

    // IDEMPOTENCY CHECK
    if (this.seen.has(eventId)) {
      this.logger.debug('CertificationToCommunityACL: skipping duplicate event', {
        eventId,
        correlationId: event.correlationId,
      });
      return;
    }

    // Mark as seen
    this.seen.add(eventId);

    this.logger.info('CertificationToCommunityACL: transforming BadgeIssued', {
      eventId,
      badgeId: event.badgeId,
      learnerId: event.learnerId,
      correlationId: event.correlationId,
    });

    try {
      // Transform event
      const badgeEarned = new BadgeEarned({
        badgeId: event.badgeId,
        learnerId: event.learnerId,
        correlationId: event.correlationId, // Propagate unchanged
        causationId: event.id, // Source event ID
      });

      // Publish to EventBus
      await this.eventBus.publish(badgeEarned);

      this.logger.info('CertificationToCommunityACL: published BadgeEarned', {
        sourceEventId: eventId,
        targetEventId: badgeEarned.id,
        correlationId: event.correlationId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('CertificationToCommunityACL: failed to transform event', {
        eventId,
        error: errorMessage,
        correlationId: event.correlationId,
      });

      throw error;
    }
  }

  /**
   * Get idempotency tracking statistics
   */
  getProcessedCount(): number {
    return this.seen.size;
  }

  /**
   * Clear idempotency tracking
   */
  clearProcessedEvents(): void {
    const previousSize = this.seen.size;
    this.seen.clear();

    this.logger.warn('CertificationToCommunityACL: cleared processed events', {
      clearedCount: previousSize,
    });
  }
}
