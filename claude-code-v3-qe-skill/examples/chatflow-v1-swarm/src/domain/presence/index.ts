/**
 * Presence Context
 *
 * Handles real-time presence, typing indicators, and user activity.
 * This is the entry point for the Presence bounded context.
 */

// Value Objects
export * from './value-objects/presence-status';
export * from './value-objects/device-type';

// Entities
export * from './entities/user-presence';
export * from './entities/connection';
export * from './entities/typing-indicator';

// Domain Events
export * from './events/user-connected';
export * from './events/status-changed';
export * from './events/typing-started';

// Repository Interfaces
export * from './repositories/presence-repository';

// Domain Services
export * from './services/presence-service';
export * from './services/typing-service';
