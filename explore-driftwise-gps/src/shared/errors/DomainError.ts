/**
 * Base domain error class for all domain-specific errors
 */
export abstract class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when invariant validation fails
 */
export class InvariantViolationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVARIANT_VIOLATION', details);
  }
}

/**
 * Error thrown when entity/value object creation fails
 */
export class EntityCreationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'ENTITY_CREATION_ERROR', details);
  }
}

/**
 * Error thrown when repository operation fails
 */
export class RepositoryError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'REPOSITORY_ERROR', details);
  }
}

/**
 * Error thrown when external API call fails
 */
export class ExternalServiceError extends DomainError {
  constructor(
    message: string,
    readonly service: string,
    details?: unknown
  ) {
    super(message, 'EXTERNAL_SERVICE_ERROR', { service, ...details });
  }
}

/**
 * Error thrown when API rate limit is exceeded
 */
export class RateLimitError extends ExternalServiceError {
  constructor(service: string, retryAfterSeconds?: number) {
    super(
      `Rate limit exceeded for ${service}`,
      service,
      { retryAfterSeconds }
    );
  }
}

/**
 * Error thrown when fact generation cannot find suitable fact
 */
export class NoSuitableFactError extends DomainError {
  constructor(location: string) {
    super(
      `No suitable fact found for location: ${location}`,
      'NO_SUITABLE_FACT',
      { location }
    );
  }
}

/**
 * Error thrown when API response parsing fails
 */
export class ResponseParsingError extends DomainError {
  constructor(message: string, response?: unknown) {
    super(message, 'RESPONSE_PARSING_ERROR', { response });
  }
}

/**
 * Error thrown when audio focus operation fails
 */
export class AudioFocusError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUDIO_FOCUS_ERROR', details);
  }
}

/**
 * Error thrown when audio focus state is invalid
 */
export class InvalidAudioFocusState extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_AUDIO_FOCUS_STATE', details);
  }
}

/**
 * Error thrown when audio operation fails
 */
export class AudioError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUDIO_ERROR', details);
  }
}
