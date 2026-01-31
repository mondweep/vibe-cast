/**
 * Identity Context
 *
 * Handles user authentication, profiles, and session management.
 * This is the entry point for the Identity bounded context.
 */

// Value Objects
export * from './value-objects/user-id';
export * from './value-objects/email';
export * from './value-objects/session-token';

// Entities
export * from './entities/user';
export * from './entities/user-profile';
export * from './entities/session';

// Domain Events
export * from './events/user-registered';
export * from './events/user-profile-updated';
export * from './events/session-created';

// Repository Interfaces
export * from './repositories/user-repository';
export * from './repositories/session-repository';

// Domain Services
export * from './services/authentication-service';
export * from './services/registration-service';
