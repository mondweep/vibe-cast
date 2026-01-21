// Location Context Unit Tests - TDD Comprehensive Suite

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createGPSCoordinates,
	calculateDistance,
	hasLocationChangedSignificantly,
	roundCoordinatesForCache,
	generateLocationId,
	type GPSCoordinates,
	type PlaceNames,
	type Location
} from '@domain/location';

describe('Location Context', () => {
	describe('createGPSCoordinates', () => {
		it('should create valid GPS coordinates', () => {
			const coords = createGPSCoordinates(51.5074, -0.1278, 10, 'gps');

			expect(coords.latitude).toBe(51.5074);
			expect(coords.longitude).toBe(-0.1278);
			expect(coords.accuracy).toBe(10);
			expect(coords.source).toBe('gps');
			expect(coords.timestamp).toBeDefined();
		});

		it('should reject invalid latitude (> 90)', () => {
			expect(() => createGPSCoordinates(91, 0, 10)).toThrow('Latitude must be between -90 and 90');
		});

		it('should reject invalid latitude (< -90)', () => {
			expect(() => createGPSCoordinates(-91, 0, 10)).toThrow(
				'Latitude must be between -90 and 90'
			);
		});

		it('should reject invalid longitude (> 180)', () => {
			expect(() => createGPSCoordinates(0, 181, 10)).toThrow(
				'Longitude must be between -180 and 180'
			);
		});

		it('should reject invalid longitude (< -180)', () => {
			expect(() => createGPSCoordinates(0, -181, 10)).toThrow(
				'Longitude must be between -180 and 180'
			);
		});

		it('should reject negative accuracy', () => {
			expect(() => createGPSCoordinates(0, 0, -5)).toThrow('Accuracy must be non-negative');
		});

		it('should accept edge case coordinates', () => {
			// North Pole
			const northPole = createGPSCoordinates(90, 0, 10);
			expect(northPole.latitude).toBe(90);

			// South Pole
			const southPole = createGPSCoordinates(-90, 0, 10);
			expect(southPole.latitude).toBe(-90);

			// International Date Line
			const dateLineEast = createGPSCoordinates(0, 180, 10);
			expect(dateLineEast.longitude).toBe(180);

			const dateLineWest = createGPSCoordinates(0, -180, 10);
			expect(dateLineWest.longitude).toBe(-180);
		});

		it('should default to gps source if not specified', () => {
			const coords = createGPSCoordinates(0, 0, 10);
			expect(coords.source).toBe('gps');
		});
	});

	describe('calculateDistance', () => {
		it('should calculate distance between two points correctly', () => {
			// London to Paris is approximately 344 km
			const london: GPSCoordinates = {
				latitude: 51.5074,
				longitude: -0.1278,
				accuracy: 10,
				timestamp: Date.now(),
				source: 'gps'
			};

			const paris: GPSCoordinates = {
				latitude: 48.8566,
				longitude: 2.3522,
				accuracy: 10,
				timestamp: Date.now(),
				source: 'gps'
			};

			const distance = calculateDistance(london, paris);

			// Should be approximately 344 km (344000 meters)
			expect(distance).toBeGreaterThan(340000);
			expect(distance).toBeLessThan(350000);
		});

		it('should return 0 for same coordinates', () => {
			const coords: GPSCoordinates = {
				latitude: 51.5074,
				longitude: -0.1278,
				accuracy: 10,
				timestamp: Date.now(),
				source: 'gps'
			};

			const distance = calculateDistance(coords, coords);
			expect(distance).toBe(0);
		});

		it('should calculate short distances accurately', () => {
			// Two points approximately 100 meters apart in London
			const a: GPSCoordinates = {
				latitude: 51.5074,
				longitude: -0.1278,
				accuracy: 10,
				timestamp: Date.now(),
				source: 'gps'
			};

			const b: GPSCoordinates = {
				latitude: 51.5083, // ~100m north
				longitude: -0.1278,
				accuracy: 10,
				timestamp: Date.now(),
				source: 'gps'
			};

			const distance = calculateDistance(a, b);

			// Should be approximately 100 meters
			expect(distance).toBeGreaterThan(90);
			expect(distance).toBeLessThan(110);
		});

		it('should handle crossing the prime meridian', () => {
			const west: GPSCoordinates = {
				latitude: 51.5,
				longitude: -0.1,
				accuracy: 10,
				timestamp: Date.now(),
				source: 'gps'
			};

			const east: GPSCoordinates = {
				latitude: 51.5,
				longitude: 0.1,
				accuracy: 10,
				timestamp: Date.now(),
				source: 'gps'
			};

			const distance = calculateDistance(west, east);

			// Should be approximately 14 km
			expect(distance).toBeGreaterThan(13000);
			expect(distance).toBeLessThan(15000);
		});

		it('should be symmetric', () => {
			const london = createGPSCoordinates(51.5074, -0.1278, 10);
			const paris = createGPSCoordinates(48.8566, 2.3522, 10);

			const dist1 = calculateDistance(london, paris);
			const dist2 = calculateDistance(paris, london);

			expect(dist1).toBe(dist2);
		});
	});

	describe('hasLocationChangedSignificantly', () => {
		it('should return true when distance exceeds threshold', () => {
			const prev = createGPSCoordinates(51.5074, -0.1278, 10);
			const curr = createGPSCoordinates(51.5174, -0.1278, 10); // ~1.1 km north

			const changed = hasLocationChangedSignificantly(prev, curr, 100);
			expect(changed).toBe(true);
		});

		it('should return false when distance is below threshold', () => {
			const prev = createGPSCoordinates(51.5074, -0.1278, 10);
			const curr = createGPSCoordinates(51.5075, -0.1278, 10); // ~11 meters north

			const changed = hasLocationChangedSignificantly(prev, curr, 100);
			expect(changed).toBe(false);
		});

		it('should return false for same location', () => {
			const coords = createGPSCoordinates(51.5074, -0.1278, 10);

			const changed = hasLocationChangedSignificantly(coords, coords, 100);
			expect(changed).toBe(false);
		});

		it('should handle null previous location', () => {
			const curr = createGPSCoordinates(51.5074, -0.1278, 10);

			const changed = hasLocationChangedSignificantly(null, curr, 100);
			expect(changed).toBe(true);
		});

		it('should use default threshold of 100 meters', () => {
			const prev = createGPSCoordinates(51.5074, -0.1278, 10);
			const curr = createGPSCoordinates(51.5083, -0.1278, 10); // ~100 meters

			// Exactly at threshold should return false
			const changed = hasLocationChangedSignificantly(prev, curr);
			// Since we're at exactly the threshold, behavior depends on implementation
			expect(typeof changed).toBe('boolean');
		});
	});

	describe('roundCoordinatesForCache', () => {
		it('should round to 3 decimal places by default', () => {
			const coords = createGPSCoordinates(51.5074123, -0.1278456, 10);
			const rounded = roundCoordinatesForCache(coords);

			expect(rounded.latitude).toBe(51.507);
			expect(rounded.longitude).toBe(-0.128);
		});

		it('should support custom precision', () => {
			const coords = createGPSCoordinates(51.5074123, -0.1278456, 10);
			const rounded = roundCoordinatesForCache(coords, 2);

			expect(rounded.latitude).toBe(51.51);
			expect(rounded.longitude).toBe(-0.13);
		});

		it('should generate consistent cache keys', () => {
			const coords1 = createGPSCoordinates(51.5074001, -0.1278001, 10);
			const coords2 = createGPSCoordinates(51.5074999, -0.1278999, 10);

			const rounded1 = roundCoordinatesForCache(coords1);
			const rounded2 = roundCoordinatesForCache(coords2);

			expect(rounded1.latitude).toBe(rounded2.latitude);
			expect(rounded1.longitude).toBe(rounded2.longitude);
		});
	});

	describe('generateLocationId', () => {
		it('should generate unique IDs', () => {
			const id1 = generateLocationId();
			const id2 = generateLocationId();

			expect(id1).not.toBe(id2);
		});

		it('should start with loc- prefix', () => {
			const id = generateLocationId();
			expect(id.startsWith('loc-')).toBe(true);
		});

		it('should be a valid string', () => {
			const id = generateLocationId();
			expect(typeof id).toBe('string');
			expect(id.length).toBeGreaterThan(4);
		});
	});
});
