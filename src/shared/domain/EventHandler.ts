import { DomainEvent } from './DomainEvent';

/**
 * Event handler interface - all handlers must implement this
 * Provides consistent error handling and tracking
 */
export interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
  canHandle(event: DomainEvent): boolean;
}

/**
 * Handler execution result - tracks outcome of handler execution
 */
export interface HandlerExecutionResult {
  success: boolean;
  eventId: string;
  handlerName: string;
  error?: Error;
  executionTime: number;
  timestamp: Date;
}
