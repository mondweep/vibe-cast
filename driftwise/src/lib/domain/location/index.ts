// Location Context - Domain Models
// GPS acquisition, geocoding, and place names

/**
 * GPS Coordinates value object
 * Represents a geographic position with accuracy metadata
 */
export interface GPSCoordinates {
	readonly latitude: number;
	readonly longitude: number;
	readonly accuracy: number; // meters
	readonly timestamp: number; // Unix milliseconds
	readonly source: 'gps' | 'network' | 'cached';
}

/**
 * Place Names value object
 * Structured set of location names at different granularities
 */
export interface PlaceNames {
	readonly hamlet?: string;
	readonly village?: string;
	readonly town?: string;
	readonly city?: string;
	readonly locality?: string;
	readonly suburb?: string;
	readonly county?: string;
	readonly state?: string;
	readonly country?: string;
	readonly displayName: string;
}

/**
 * Location entity
 * Combines coordinates with geocoded place names
 */
export interface Location {
	readonly id: string;
	readonly coordinates: GPSCoordinates;
	readonly places: PlaceNames;
	readonly acquiredAt: number;
}

/**
 * Location delta for change detection
 */
export interface LocationDelta {
	readonly previous: GPSCoordinates;
	readonly current: GPSCoordinates;
	readonly distanceMeters: number;
}

// Domain events
export interface LocationAcquiredEvent {
	readonly type: 'LocationAcquired';
	readonly payload: {
		readonly location: Location;
	};
	readonly timestamp: number;
}

export interface LocationChangedEvent {
	readonly type: 'LocationChanged';
	readonly payload: {
		readonly delta: LocationDelta;
	};
	readonly timestamp: number;
}

export type LocationEvent = LocationAcquiredEvent | LocationChangedEvent;

// Factory functions
export function createGPSCoordinates(
	latitude: number,
	longitude: number,
	accuracy: number,
	source: GPSCoordinates['source'] = 'gps'
): GPSCoordinates {
	if (latitude < -90 || latitude > 90) {
		throw new Error('Latitude must be between -90 and 90');
	}
	if (longitude < -180 || longitude > 180) {
		throw new Error('Longitude must be between -180 and 180');
	}
	if (accuracy < 0) {
		throw new Error('Accuracy must be non-negative');
	}

	return {
		latitude,
		longitude,
		accuracy,
		timestamp: Date.now(),
		source
	};
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(a: GPSCoordinates, b: GPSCoordinates): number {
	const R = 6371000; // Earth's radius in meters
	const lat1 = (a.latitude * Math.PI) / 180;
	const lat2 = (b.latitude * Math.PI) / 180;
	const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
	const deltaLon = ((b.longitude - a.longitude) * Math.PI) / 180;

	const h =
		Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

	return R * c;
}

/**
 * Check if location has changed significantly (beyond threshold)
 * @param previous - Previous coordinates (null for first acquisition)
 * @param current - Current coordinates
 * @param thresholdMeters - Distance threshold in meters (default 100)
 */
export function hasLocationChangedSignificantly(
	previous: GPSCoordinates | null,
	current: GPSCoordinates,
	thresholdMeters: number = 100
): boolean {
	if (previous === null) {
		return true;
	}
	const distance = calculateDistance(previous, current);
	return distance > thresholdMeters;
}

/**
 * Round coordinates for cache key generation
 * Default precision of 3 decimal places (~100m resolution)
 */
export function roundCoordinatesForCache(
	coords: GPSCoordinates,
	precision: number = 3
): { latitude: number; longitude: number } {
	const factor = Math.pow(10, precision);
	return {
		latitude: Math.round(coords.latitude * factor) / factor,
		longitude: Math.round(coords.longitude * factor) / factor
	};
}

/**
 * Generate a unique location ID
 */
export function generateLocationId(): string {
	return `loc-${crypto.randomUUID()}`;
}

/**
 * Create a Location entity
 */
export function createLocation(
	coordinates: GPSCoordinates,
	places: PlaceNames
): Location {
	return {
		id: generateLocationId(),
		coordinates,
		places,
		acquiredAt: Date.now()
	};
}
