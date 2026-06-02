import { DomainEvent } from './DomainEvent';

/**
 * Base aggregate root class
 * Aggregates collect domain events during their lifetime
 */
export abstract class AggregateRoot {
  protected id: string;
  protected version: number = 0;
  protected uncommittedEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  getId(): string {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }

  /**
   * Collect domain events for publishing
   */
  protected addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  /**
   * Get all uncommitted events
   */
  getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }

  /**
   * Clear uncommitted events after publishing
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  /**
   * Increment version after each commit
   */
  incrementVersion(): void {
    this.version++;
  }
}
