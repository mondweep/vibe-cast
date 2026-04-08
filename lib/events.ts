import { EventEmitter } from 'events';

// Event types
export type EventType =
  | 'ticket.created'
  | 'ticket.classified'
  | 'ticket.assigned'
  | 'ticket.processing'
  | 'ticket.resolved'
  | 'ticket.escalated'
  | 'ticket.needs-human-review';

export interface TicketEvent {
  ticketId: string;
  agentId?: string;
  timestamp: string;
  data?: any;
}

// Global event emitter
const eventEmitter = new EventEmitter();

/**
 * Emit a ticket event
 */
export function emitEvent(eventType: EventType, event: TicketEvent): void {
  console.log(`📢 Event: ${eventType}`, {
    ticketId: event.ticketId,
    agentId: event.agentId,
    timestamp: event.timestamp
  });

  eventEmitter.emit(eventType, event);

  // Also emit to WebSocket subscribers if available
  broadcastToClients(eventType, event);
}

/**
 * Listen to ticket events
 */
export function onEvent(eventType: EventType, handler: (event: TicketEvent) => void): void {
  eventEmitter.on(eventType, handler);
}

/**
 * Listen once and remove handler
 */
export function onceEvent(eventType: EventType, handler: (event: TicketEvent) => void): void {
  eventEmitter.once(eventType, handler);
}

/**
 * Remove event listener
 */
export function offEvent(eventType: EventType, handler: (event: TicketEvent) => void): void {
  eventEmitter.off(eventType, handler);
}

/**
 * WebSocket client management for real-time updates
 */
const wsClients = new Set<any>();

export function registerWSClient(client: any): void {
  wsClients.add(client);
  console.log(`📡 WebSocket client registered. Total: ${wsClients.size}`);
}

export function unregisterWSClient(client: any): void {
  wsClients.delete(client);
  console.log(`📡 WebSocket client unregistered. Total: ${wsClients.size}`);
}

export function broadcastToClients(eventType: EventType, event: TicketEvent): void {
  const message = JSON.stringify({
    type: eventType,
    data: event
  });

  for (const client of wsClients) {
    try {
      if (client.send) {
        client.send(message);
      }
    } catch (error) {
      console.error('Error sending to WebSocket client:', error);
      wsClients.delete(client);
    }
  }
}

/**
 * Get current event listeners count (for monitoring)
 */
export function getListenerCount(eventType: EventType): number {
  return eventEmitter.listenerCount(eventType);
}

/**
 * Clear all listeners (useful for testing)
 */
export function clearAllListeners(): void {
  eventEmitter.removeAllListeners();
}
