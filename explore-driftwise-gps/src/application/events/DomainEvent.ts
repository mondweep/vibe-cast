/**
 * Domain Event base class for application events
 */
export abstract class DomainEvent {
  readonly timestamp: number;
  readonly eventId: string;

  constructor(eventId: string) {
    this.timestamp = Date.now();
    this.eventId = eventId;
  }

  abstract getEventName(): string;
}

/**
 * Location Acquired Event
 */
export class LocationAcquiredEvent extends DomainEvent {
  constructor(readonly latitude: number, readonly longitude: number) {
    super(`location-acquired-${Date.now()}`);
  }

  getEventName(): string {
    return 'LocationAcquired';
  }
}

/**
 * Fact Generated Event
 */
export class FactGeneratedEvent extends DomainEvent {
  constructor(
    readonly factText: string,
    readonly location: string,
    readonly confidence: number
  ) {
    super(`fact-generated-${Date.now()}`);
  }

  getEventName(): string {
    return 'FactGenerated';
  }
}

/**
 * Voice Session Started Event
 */
export class VoiceSessionStartedEvent extends DomainEvent {
  constructor(readonly sessionId: string) {
    super(`voice-session-started-${Date.now()}`);
  }

  getEventName(): string {
    return 'VoiceSessionStarted';
  }
}

/**
 * Command Received Event
 */
export class CommandReceivedEvent extends DomainEvent {
  constructor(readonly intent: string, readonly transcript: string) {
    super(`command-received-${Date.now()}`);
  }

  getEventName(): string {
    return 'CommandReceived';
  }
}

/**
 * Cycle Completed Event
 */
export class CycleCompletedEvent extends DomainEvent {
  constructor(
    readonly success: boolean,
    readonly duration: number,
    readonly error?: Error
  ) {
    super(`cycle-completed-${Date.now()}`);
  }

  getEventName(): string {
    return 'CycleCompleted';
  }
}

/**
 * Cycle Failed Event
 */
export class CycleFailedEvent extends DomainEvent {
  constructor(
    readonly stage: string,
    readonly error: Error,
    readonly recovered: boolean
  ) {
    super(`cycle-failed-${Date.now()}`);
  }

  getEventName(): string {
    return 'CycleFailed';
  }
}

/**
 * Event Publisher interface
 */
export interface EventPublisher {
  publish(event: DomainEvent): void;
  subscribe(eventName: string, handler: (event: DomainEvent) => void): () => void;
}
