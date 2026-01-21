// LocationService Unit Tests - TDD Suite
// Tests for GPS acquisition and location management

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocationService } from '@services/LocationService';
import type { GPSCoordinates } from '@domain/location';

// Create geolocation mock
const createMockGeolocation = () => ({
	getCurrentPosition: vi.fn(),
	watchPosition: vi.fn(),
	clearWatch: vi.fn()
});

describe('LocationService', () => {
	let service: LocationService;
	let mockGeolocation: ReturnType<typeof createMockGeolocation>;

	beforeEach(() => {
		vi.useFakeTimers();
		mockGeolocation = createMockGeolocation();

		// Mock navigator.geolocation using vi.stubGlobal
		vi.stubGlobal('navigator', {
			...navigator,
			geolocation: mockGeolocation
		});

		service = new LocationService();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		if (service) {
			service.stopPolling();
		}
	});

	describe('requestLocation', () => {
		it('should return GPS coordinates on success', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success({
					coords: {
						latitude: 51.5074,
						longitude: -0.1278,
						accuracy: 10
					},
					timestamp: Date.now()
				});
			});

			const coords = await service.requestLocation();

			expect(coords).not.toBeNull();
			expect(coords?.latitude).toBe(51.5074);
			expect(coords?.longitude).toBe(-0.1278);
			expect(coords?.accuracy).toBe(10);
			expect(coords?.source).toBe('gps');
		});

		it('should use high accuracy option', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success({
					coords: { latitude: 0, longitude: 0, accuracy: 5 },
					timestamp: Date.now()
				});
			});

			await service.requestLocation();

			expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
				expect.any(Function),
				expect.any(Function),
				expect.objectContaining({ enableHighAccuracy: true })
			);
		});

		it('should timeout after 3 seconds', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success({
					coords: { latitude: 0, longitude: 0, accuracy: 5 },
					timestamp: Date.now()
				});
			});

			await service.requestLocation();

			expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
				expect.any(Function),
				expect.any(Function),
				expect.objectContaining({ timeout: 3000 })
			);
		});

		it('should return null on permission denied', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
				error({ code: 1, message: 'Permission denied' });
			});

			const coords = await service.requestLocation();

			expect(coords).toBeNull();
		});

		it('should return null on timeout', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
				error({ code: 3, message: 'Timeout' });
			});

			const coords = await service.requestLocation();

			expect(coords).toBeNull();
		});

		it('should return null on position unavailable', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
				error({ code: 2, message: 'Position unavailable' });
			});

			const coords = await service.requestLocation();

			expect(coords).toBeNull();
		});

		it('should fall back to network location on GPS failure', async () => {
			let callCount = 0;
			mockGeolocation.getCurrentPosition.mockImplementation((success, error, options) => {
				callCount++;
				if (options?.enableHighAccuracy) {
					// First call with high accuracy fails
					error({ code: 3, message: 'Timeout' });
				} else {
					// Second call without high accuracy succeeds
					success({
						coords: { latitude: 51.5, longitude: -0.1, accuracy: 100 },
						timestamp: Date.now()
					});
				}
			});

			const coords = await service.requestLocation();

			// Should have tried twice: high accuracy first, then network
			expect(callCount).toBe(2);
			expect(coords?.source).toBe('network');
		});

		it('should use cached location if recent', async () => {
			// First request succeeds
			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success({
					coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 10 },
					timestamp: Date.now()
				});
			});

			const firstCoords = await service.requestLocation();

			// Second request fails
			mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
				error({ code: 2, message: 'Unavailable' });
			});

			// Should return cached if within 10 minutes
			const cachedCoords = await service.requestLocation();

			expect(cachedCoords).not.toBeNull();
			expect(cachedCoords?.source).toBe('cached');
		});
	});

	describe('polling', () => {
		it('should poll at specified interval', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success({
					coords: { latitude: 51.5, longitude: -0.1, accuracy: 10 },
					timestamp: Date.now()
				});
			});

			const callback = vi.fn();
			service.onLocationUpdate(callback);
			service.startPolling(120000); // 2 minutes (minimum allowed)

			// Initial call
			await vi.advanceTimersByTimeAsync(0);
			expect(callback).toHaveBeenCalledTimes(1);

			// After 2 minutes
			await vi.advanceTimersByTimeAsync(120000);
			expect(callback).toHaveBeenCalledTimes(2);

			// After 4 minutes
			await vi.advanceTimersByTimeAsync(120000);
			expect(callback).toHaveBeenCalledTimes(3);
		});

		it('should stop polling when requested', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success({
					coords: { latitude: 51.5, longitude: -0.1, accuracy: 10 },
					timestamp: Date.now()
				});
			});

			const callback = vi.fn();
			service.onLocationUpdate(callback);
			service.startPolling(120000); // Use minimum allowed interval

			await vi.advanceTimersByTimeAsync(0);
			expect(callback).toHaveBeenCalledTimes(1);

			service.stopPolling();

			await vi.advanceTimersByTimeAsync(120000);
			// Should not have been called again
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should respect minimum interval of 2 minutes', () => {
			expect(() => service.startPolling(60000)).not.toThrow(); // 1 min - should be clamped to 2 min

			const interval = service.getPollingInterval();
			expect(interval).toBeGreaterThanOrEqual(120000);
		});

		it('should respect maximum interval of 15 minutes', () => {
			service.startPolling(1000000); // > 15 min

			const interval = service.getPollingInterval();
			expect(interval).toBeLessThanOrEqual(900000);
		});

		it('should allow setting polling interval', () => {
			service.setPollingInterval(300000); // 5 min

			expect(service.getPollingInterval()).toBe(300000);
		});

		it('should clamp interval to valid range', () => {
			service.setPollingInterval(60000); // 1 min - too low
			expect(service.getPollingInterval()).toBe(120000); // Clamped to 2 min

			service.setPollingInterval(1000000); // too high
			expect(service.getPollingInterval()).toBe(900000); // Clamped to 15 min
		});
	});

	describe('change detection', () => {
		it('should detect significant location change', async () => {
			const callback = vi.fn();
			service.onLocationChange(callback);

			// First location
			mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
				success({
					coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 10 },
					timestamp: Date.now()
				});
			});

			await service.requestLocation();

			// Second location - significant change (> 100m)
			mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
				success({
					coords: { latitude: 51.5174, longitude: -0.1278, accuracy: 10 }, // ~1.1 km north
					timestamp: Date.now()
				});
			});

			await service.requestLocation();

			expect(callback).toHaveBeenCalled();
		});

		it('should not trigger for insignificant changes', async () => {
			// First location (triggers initial change from null)
			mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
				success({
					coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 10 },
					timestamp: Date.now()
				});
			});

			await service.requestLocation();

			// Now subscribe after first location is set
			const callback = vi.fn();
			service.onLocationChange(callback);

			// Second location - insignificant change (< 100m)
			mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
				success({
					coords: { latitude: 51.5075, longitude: -0.1278, accuracy: 10 }, // ~11m north
					timestamp: Date.now()
				});
			});

			await service.requestLocation();

			// Should not trigger because change is insignificant
			expect(callback).not.toHaveBeenCalled();
		});

		it('should report current location', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success({
					coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 10 },
					timestamp: Date.now()
				});
			});

			expect(service.getCurrentLocation()).toBeNull();

			await service.requestLocation();

			const current = service.getCurrentLocation();
			expect(current).not.toBeNull();
			expect(current?.latitude).toBe(51.5074);
		});
	});

	describe('error handling', () => {
		it('should not throw on geolocation errors', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
				error({ code: 2, message: 'Unavailable' });
			});

			await expect(service.requestLocation()).resolves.not.toThrow();
		});

		it('should handle missing geolocation API', async () => {
			vi.stubGlobal('navigator', {
				...navigator,
				geolocation: undefined
			});

			const serviceWithoutGeo = new LocationService();
			const coords = await serviceWithoutGeo.requestLocation();

			expect(coords).toBeNull();
		});
	});

	describe('subscription management', () => {
		it('should support multiple listeners', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success({
					coords: { latitude: 51.5, longitude: -0.1, accuracy: 10 },
					timestamp: Date.now()
				});
			});

			const callback1 = vi.fn();
			const callback2 = vi.fn();

			service.onLocationUpdate(callback1);
			service.onLocationUpdate(callback2);

			await service.requestLocation();

			expect(callback1).toHaveBeenCalled();
			expect(callback2).toHaveBeenCalled();
		});

		it('should support unsubscribing', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success({
					coords: { latitude: 51.5, longitude: -0.1, accuracy: 10 },
					timestamp: Date.now()
				});
			});

			const callback = vi.fn();
			const unsubscribe = service.onLocationUpdate(callback);

			await service.requestLocation();
			expect(callback).toHaveBeenCalledTimes(1);

			unsubscribe();

			await service.requestLocation();
			expect(callback).toHaveBeenCalledTimes(1); // Not called again
		});
	});
});
