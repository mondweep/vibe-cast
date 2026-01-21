import { v4 as uuid } from 'uuid';
import { InvariantViolationError, EntityCreationError } from '@/shared/errors/DomainError';

/**
 * GPSCoordinates: latitude, longitude, accuracy (meters)
 */
export class GPSCoordinates {
  constructor(
    readonly latitude: number,
    readonly longitude: number,
    readonly accuracy: number = 0
  ) {
    if (latitude < -90 || latitude > 90) {
      throw new InvariantViolationError('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      throw new InvariantViolationError('Longitude must be between -180 and 180');
    }
    if (accuracy < 0) {
      throw new InvariantViolationError('Accuracy must be non-negative');
    }
  }

  /**
   * Calculate distance to another coordinate (Haversine formula)
   */
  distanceTo(other: GPSCoordinates): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (this.latitude * Math.PI) / 180;
    const φ2 = (other.latitude * Math.PI) / 180;
    const Δφ = ((other.latitude - this.latitude) * Math.PI) / 180;
    const Δλ = ((other.longitude - this.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}

/**
 * PlaceNames: city, state, country
 */
export class PlaceNames {
  constructor(
    readonly city?: string,
    readonly state?: string,
    readonly country?: string
  ) {
    if (!city && !state && !country) {
      throw new InvariantViolationError('At least one place name must be provided');
    }
  }

  /**
   * Get full place name string
   */
  getFullName(): string {
    return [this.city, this.state, this.country].filter(Boolean).join(', ');
  }
}

/**
 * LocationId: unique identifier for a location
 */
export class LocationId {
  constructor(readonly value: string) {
    if (!value || value.trim() === '') {
      throw new InvariantViolationError('LocationId cannot be empty');
    }
  }

  static generate(): LocationId {
    return new LocationId(uuid());
  }
}

/**
 * LocationDelta: represents movement threshold
 */
export class LocationDelta {
  constructor(readonly meters: number) {
    if (meters < 0) {
      throw new InvariantViolationError('LocationDelta must be non-negative');
    }
  }

  static DEFAULT = new LocationDelta(50); // 50 meters
}

/**
 * Location: aggregate root representing a geographic location
 */
export class Location {
  private constructor(
    readonly id: LocationId,
    readonly coordinates: GPSCoordinates,
    readonly placeNames: PlaceNames,
    readonly acquiredAt: Date = new Date(),
    readonly expiresAt?: Date
  ) {}

  /**
   * Create a new Location
   */
  static create(
    coordinates: GPSCoordinates,
    placeNames: PlaceNames,
    acquiredAt: Date = new Date(),
    expirationMinutes: number = 60
  ): Location {
    try {
      const id = LocationId.generate();
      const expiresAt = new Date(acquiredAt.getTime() + expirationMinutes * 60000);
      return new Location(id, coordinates, placeNames, acquiredAt, expiresAt);
    } catch (error) {
      throw new EntityCreationError('Failed to create Location', { error });
    }
  }

  /**
   * Check if location has expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Check if another location is significantly different
   */
  hasMoved(other: Location, delta: LocationDelta = LocationDelta.DEFAULT): boolean {
    return this.coordinates.distanceTo(other.coordinates) > delta.meters;
  }

  /**
   * Get time since location was acquired (milliseconds)
   */
  ageMs(): number {
    return new Date().getTime() - this.acquiredAt.getTime();
  }
}
