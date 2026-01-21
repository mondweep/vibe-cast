// NominatimAdapter - Reverse geocoding via OpenStreetMap Nominatim API
// Implements rate limiting, caching, and error handling

import { roundCoordinatesForCache } from '@domain/location';
import type { PlaceNames, GPSCoordinates } from '@domain/location';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'Driftwise/1.0 (https://github.com/mondweep/vibe-cast)';
const RATE_LIMIT_MS = 1000; // 1 request per second
const REQUEST_TIMEOUT_MS = 2000;
const CACHE_TTL_MS = 86400000; // 24 hours

interface CacheEntry {
	places: PlaceNames;
	cachedAt: number;
}

interface NominatimResponse {
	address?: {
		hamlet?: string;
		village?: string;
		town?: string;
		city?: string;
		locality?: string;
		suburb?: string;
		county?: string;
		state?: string;
		country?: string;
	};
	display_name?: string;
}

export class NominatimAdapter {
	private cache: Map<string, CacheEntry> = new Map();
	private lastRequestTime: number = 0;
	private requestQueue: Array<() => void> = [];
	private isProcessingQueue: boolean = false;

	/**
	 * Reverse geocode coordinates to place names
	 */
	async reverseGeocode(lat: number, lon: number): Promise<PlaceNames | null> {
		// Check cache first
		const cacheKey = this.getCacheKey(lat, lon);
		const cached = this.cache.get(cacheKey);
		if (cached && this.isCacheValid(cached)) {
			return cached.places;
		}

		// Queue the request to respect rate limiting
		return new Promise((resolve) => {
			this.requestQueue.push(async () => {
				const result = await this.executeRequest(lat, lon);
				if (result) {
					this.cache.set(cacheKey, {
						places: result,
						cachedAt: Date.now()
					});
				}
				resolve(result);
			});

			this.processQueue();
		});
	}

	/**
	 * Get cached result without making a request
	 */
	getCachedResult(lat: number, lon: number): PlaceNames | null {
		const cacheKey = this.getCacheKey(lat, lon);
		const cached = this.cache.get(cacheKey);
		if (cached && this.isCacheValid(cached)) {
			return cached.places;
		}
		return null;
	}

	/**
	 * Clear the cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	// Private methods

	private getCacheKey(lat: number, lon: number): string {
		const coords = { latitude: lat, longitude: lon } as GPSCoordinates;
		const rounded = roundCoordinatesForCache(coords);
		return `${rounded.latitude}_${rounded.longitude}`;
	}

	private isCacheValid(entry: CacheEntry): boolean {
		return Date.now() - entry.cachedAt < CACHE_TTL_MS;
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessingQueue) {
			return;
		}

		this.isProcessingQueue = true;

		while (this.requestQueue.length > 0) {
			const timeSinceLastRequest = Date.now() - this.lastRequestTime;
			const waitTime = Math.max(0, RATE_LIMIT_MS - timeSinceLastRequest);

			if (waitTime > 0) {
				await this.sleep(waitTime);
			}

			const request = this.requestQueue.shift();
			if (request) {
				this.lastRequestTime = Date.now();
				await request();
			}
		}

		this.isProcessingQueue = false;
	}

	private async executeRequest(lat: number, lon: number): Promise<PlaceNames | null> {
		const url = new URL(NOMINATIM_BASE_URL);
		url.searchParams.set('lat', lat.toString());
		url.searchParams.set('lon', lon.toString());
		url.searchParams.set('format', 'json');
		url.searchParams.set('addressdetails', '1');
		url.searchParams.set('zoom', '14');

		try {
			const response = await this.fetchWithTimeout(url.toString(), REQUEST_TIMEOUT_MS);

			if (!response.ok) {
				return null;
			}

			const data: NominatimResponse = await response.json();
			return this.mapResponseToPlaceNames(data);
		} catch {
			return null;
		}
	}

	private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': USER_AGENT
				},
				signal: controller.signal
			});
			return response;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private mapResponseToPlaceNames(response: NominatimResponse): PlaceNames {
		const address = response.address || {};
		return {
			hamlet: address.hamlet,
			village: address.village,
			town: address.town,
			city: address.city,
			locality: address.locality,
			suburb: address.suburb,
			county: address.county,
			state: address.state,
			country: address.country,
			displayName: response.display_name || 'Unknown location'
		};
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Singleton instance
let instance: NominatimAdapter | null = null;

export function getNominatimAdapter(): NominatimAdapter {
	if (!instance) {
		instance = new NominatimAdapter();
	}
	return instance;
}
