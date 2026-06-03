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
  public readonly eventType: string;
  public readonly causationId?: string;

  constructor(
    aggregateId: string,
    aggregateType: string,
    correlationId: string,
    id?: string,
    timestamp?: Date,
    causationId?: string
  ) {
    this.id = id || this.generateId();
    this.timestamp = timestamp || new Date();
    this.correlationId = correlationId;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.eventType = `${aggregateType}.${this.getEventName()}`;
    this.causationId = causationId;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getId(): string {
    return this.id;
  }

  abstract getEventName(): string;

  abstract toPrimitives(): Record<string, any>;
}
