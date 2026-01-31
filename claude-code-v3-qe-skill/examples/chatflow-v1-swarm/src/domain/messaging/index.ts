/**
 * Messaging Context
 *
 * Handles chat rooms, messages, and room membership.
 * This is the entry point for the Messaging bounded context.
 */

// Value Objects
export * from './value-objects/room-id';
export * from './value-objects/message-id';
export * from './value-objects/message-content';

// Entities
export * from './entities/room';
export * from './entities/message';
export * from './entities/room-member';
export * from './entities/reaction';

// Domain Events
export * from './events/room-created';
export * from './events/message-sent';
export * from './events/member-joined';

// Repository Interfaces
export * from './repositories/room-repository';
export * from './repositories/message-repository';

// Domain Services
export * from './services/room-service';
export * from './services/message-service';
