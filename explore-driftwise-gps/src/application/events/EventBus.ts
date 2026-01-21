import { DomainEvent, EventPublisher } from './DomainEvent';
import { Logger } from '@shared/utils/Logger';

/**
 * Simple Event Bus implementation for domain event publishing
 */
export class EventBus implements EventPublisher {
  private handlers: Map<string, ((event: DomainEvent) => void)[]> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('EventBus');
  }

  /**
   * Publish an event to all subscribers
   */
  publish(event: DomainEvent): void {
    const eventName = event.getEventName();
    this.logger.debug(`Publishing event: ${eventName}`, { eventId: event.eventId });

    const eventHandlers = this.handlers.get(eventName) || [];
    for (const handler of eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        this.logger.error(`Error in event handler for ${eventName}`, error);
      }
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(eventName: string, handler: (event: DomainEvent) => void): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventName) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Clear all subscribers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}
