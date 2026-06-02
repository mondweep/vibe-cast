import { IEventBus } from '../../../shared/infrastructure/events/IEventBus';
import { EventHandler } from '../../../shared/domain/EventHandler';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { Logger } from '../../../shared/infrastructure/logging/Logger';
import { ExerciseCompleted } from '../../domain/events/ExerciseCompleted';
import { SkillAchieved } from '../../../community/domain/events/SkillAchieved';

/**
 * SkillLabToCommunityACL
 *
 * Anti-Corruption Layer for SkillLab → Community event translation
 *
 * Translates domain-specific events:
 * - Input: ExerciseCompleted (SkillLab domain)
 * - Output: SkillAchieved (Community domain)
 *
 * Features:
 * - Event subscription to ExerciseCompleted
 * - Idempotency tracking via Set<eventId>
 * - Correlation ID propagation (unchanged)
 * - Causation ID tracking (source event ID)
 * - Structured logging with correlationId
 *
 * Idempotency: In-memory Set<eventId> sufficient for Week 10 single-process
 */
export class SkillLabToCommunityACL implements EventHandler {
  private eventBus: IEventBus;
  private logger: Logger;
  private seen: Set<string> = new Set();

  constructor(eventBus: IEventBus, logger: Logger) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Subscribe this ACL to the event bus
   * Registers handlers for SkillLab domain events
   */
  subscribe(): string {
    return this.eventBus.subscribe('ExerciseCompleted', this);
  }

  /**
   * Check if this handler can process the event
   */
  canHandle(event: DomainEvent): boolean {
    return event.getEventName() === 'ExerciseCompleted';
  }

  /**
   * Handle ExerciseCompleted event
   *
   * Workflow:
   * 1. Check idempotency: return if already processed
   * 2. Parse event as ExerciseCompleted
   * 3. Transform to SkillAchieved
   * 4. Propagate correlationId unchanged
   * 5. Set causationId = ExerciseCompleted.id
   * 6. Publish to EventBus
   */
  async handle(event: DomainEvent): Promise<void> {
    if (!(event instanceof ExerciseCompleted)) {
      this.logger.warn('SkillLabToCommunityACL: event is not ExerciseCompleted', {
        eventName: event.getEventName(),
        eventId: event.id,
      });
      return;
    }

    const eventId = event.id;

    // IDEMPOTENCY CHECK
    if (this.seen.has(eventId)) {
      this.logger.debug('SkillLabToCommunityACL: skipping duplicate event', {
        eventId,
        correlationId: event.correlationId,
      });
      return;
    }

    // Mark as seen
    this.seen.add(eventId);

    this.logger.info('SkillLabToCommunityACL: transforming ExerciseCompleted', {
      eventId,
      exerciseId: event.exerciseId,
      skillId: event.skillId,
      learnerId: event.learnerId,
      correlationId: event.correlationId,
    });

    try {
      // Transform event
      const skillAchieved = new SkillAchieved({
        skillId: event.skillId,
        learnerId: event.learnerId,
        correlationId: event.correlationId, // Propagate unchanged
        causationId: event.id, // Source event ID
      });

      // Publish to EventBus
      await this.eventBus.publish(skillAchieved);

      this.logger.info('SkillLabToCommunityACL: published SkillAchieved', {
        sourceEventId: eventId,
        targetEventId: skillAchieved.id,
        correlationId: event.correlationId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error('SkillLabToCommunityACL: failed to transform event', {
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

    this.logger.warn('SkillLabToCommunityACL: cleared processed events', {
      clearedCount: previousSize,
    });
  }
}
