// LocationService - GPS acquisition and location management
// Handles polling, caching, and change detection

import {
	createGPSCoordinates,
	calculateDistance,
	hasLocationChangedSignificantly,
	type GPSCoordinates
} from '@domain/location';

const MIN_POLLING_INTERVAL = 120000; // 2 minutes
const MAX_POLLING_INTERVAL = 900000; // 15 minutes
const DEFAULT_POLLING_INTERVAL = 300000; // 5 minutes
const GPS_TIMEOUT = 3000; // 3 seconds
const CACHE_MAX_AGE = 600000; // 10 minutes
const CHANGE_THRESHOLD = 100; // 100 meters

type LocationCallback = (coords: GPSCoordinates) => void;
type Unsubscriber = () => void;

export class LocationService {
	private currentLocation: GPSCoordinates | null = null;
	private previousLocation: GPSCoordinates | null = null;
	private pollingInterval: number = DEFAULT_POLLING_INTERVAL;
	private pollingTimer: ReturnType<typeof setInterval> | null = null;
	private locationListeners: Set<LocationCallback> = new Set();
	private changeListeners: Set<LocationCallback> = new Set();
	private lastCachedAt: number = 0;

	/**
	 * Request current location with fallback strategies
	 */
	async requestLocation(): Promise<GPSCoordinates | null> {
		// Check if geolocation is available
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			return null;
		}

		// Try high accuracy GPS first
		let coords = await this.tryGetPosition(true);

		// Fall back to network location if GPS fails
		if (!coords) {
			coords = await this.tryGetPosition(false);
			if (coords) {
				coords = { ...coords, source: 'network' };
			}
		}

		// Fall back to cached if still no location
		if (!coords && this.currentLocation && this.isCacheValid()) {
			coords = { ...this.currentLocation, source: 'cached' };
		}

		if (coords) {
			this.updateLocation(coords);
		}

		return coords;
	}

	/**
	 * Get current cached location
	 */
	getCurrentLocation(): GPSCoordinates | null {
		return this.currentLocation;
	}

	/**
	 * Start polling for location updates
	 */
	startPolling(intervalMs?: number): void {
		this.stopPolling();

		if (intervalMs !== undefined) {
			this.setPollingInterval(intervalMs);
		}

		// Request immediately
		this.requestLocation();

		// Then poll at interval
		this.pollingTimer = setInterval(() => {
			this.requestLocation();
		}, this.pollingInterval);
	}

	/**
	 * Stop polling for location updates
	 */
	stopPolling(): void {
		if (this.pollingTimer) {
			clearInterval(this.pollingTimer);
			this.pollingTimer = null;
		}
	}

	/**
	 * Set polling interval (clamped to valid range)
	 */
	setPollingInterval(ms: number): void {
		this.pollingInterval = Math.max(MIN_POLLING_INTERVAL, Math.min(MAX_POLLING_INTERVAL, ms));
	}

	/**
	 * Get current polling interval
	 */
	getPollingInterval(): number {
		return this.pollingInterval;
	}

	/**
	 * Subscribe to location updates
	 */
	onLocationUpdate(callback: LocationCallback): Unsubscriber {
		this.locationListeners.add(callback);
		return () => {
			this.locationListeners.delete(callback);
		};
	}

	/**
	 * Subscribe to significant location changes
	 */
	onLocationChange(callback: LocationCallback): Unsubscriber {
		this.changeListeners.add(callback);
		return () => {
			this.changeListeners.delete(callback);
		};
	}

	/**
	 * Check if location has changed significantly since last update
	 */
	hasLocationChanged(thresholdMeters: number = CHANGE_THRESHOLD): boolean {
		if (!this.currentLocation) {
			return false;
		}
		return hasLocationChangedSignificantly(
			this.previousLocation,
			this.currentLocation,
			thresholdMeters
		);
	}

	// Private methods

	private async tryGetPosition(highAccuracy: boolean): Promise<GPSCoordinates | null> {
		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const coords = createGPSCoordinates(
						position.coords.latitude,
						position.coords.longitude,
						position.coords.accuracy,
						'gps'
					);
					resolve(coords);
				},
				() => {
					resolve(null);
				},
				{
					enableHighAccuracy: highAccuracy,
					timeout: GPS_TIMEOUT,
					maximumAge: 0
				}
			);
		});
	}

	private updateLocation(coords: GPSCoordinates): void {
		this.previousLocation = this.currentLocation;
		this.currentLocation = coords;
		this.lastCachedAt = Date.now();

		// Notify location listeners
		for (const callback of this.locationListeners) {
			callback(coords);
		}

		// Check for significant change and notify change listeners
		if (hasLocationChangedSignificantly(this.previousLocation, coords, CHANGE_THRESHOLD)) {
			for (const callback of this.changeListeners) {
				callback(coords);
			}
		}
	}

	private isCacheValid(): boolean {
		return Date.now() - this.lastCachedAt < CACHE_MAX_AGE;
	}
}

// Singleton instance
let instance: LocationService | null = null;

export function getLocationService(): LocationService {
	if (!instance) {
		instance = new LocationService();
	}
	return instance;
}
