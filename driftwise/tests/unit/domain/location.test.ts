// Location Context Unit Tests

import { describe, it, expect } from 'vitest';
import { createGPSCoordinates, calculateDistance, type GPSCoordinates } from '@domain/location';

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
	});
});
