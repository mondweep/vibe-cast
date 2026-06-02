/**
 * Base domain event class - all domain events inherit from this
 * Provides common properties: id, timestamp, correlationId for tracing
 */
export abstract class DomainEvent {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly correlationId: string;
  public readonly aggregateId: string;
  public readonly aggregateType: string;

  constructor(
    aggregateId: string,
    aggregateType: string,
    correlationId: string,
    id?: string,
    timestamp?: Date
  ) {
    this.id = id || this.generateId();
    this.timestamp = timestamp || new Date();
    this.correlationId = correlationId;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  abstract getEventName(): string;
}
