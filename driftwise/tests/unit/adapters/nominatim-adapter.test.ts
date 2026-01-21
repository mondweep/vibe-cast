// NominatimAdapter Unit Tests - TDD Suite
// Tests for reverse geocoding via Nominatim API

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NominatimAdapter } from '@adapters/NominatimAdapter';
import type { PlaceNames } from '@domain/location';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('NominatimAdapter', () => {
	let adapter: NominatimAdapter;

	beforeEach(() => {
		vi.useFakeTimers();
		adapter = new NominatimAdapter();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('reverseGeocode', () => {
		it('should return place names for valid coordinates', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						address: {
							city: 'London',
							county: 'Greater London',
							state: 'England',
							country: 'United Kingdom'
						},
						display_name: 'London, Greater London, England, United Kingdom'
					})
			});

			const places = await adapter.reverseGeocode(51.5074, -0.1278);

			expect(places).not.toBeNull();
			expect(places?.city).toBe('London');
			expect(places?.county).toBe('Greater London');
			expect(places?.state).toBe('England');
			expect(places?.country).toBe('United Kingdom');
			expect(places?.displayName).toBe('London, Greater London, England, United Kingdom');
		});

		it('should handle all address granularity levels', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						address: {
							hamlet: 'Little Snoring',
							village: 'Great Snoring',
							town: 'Fakenham',
							locality: 'North Norfolk',
							suburb: undefined,
							county: 'Norfolk',
							state: 'England',
							country: 'United Kingdom'
						},
						display_name: 'Little Snoring, Norfolk, UK'
					})
			});

			const places = await adapter.reverseGeocode(52.8613, 0.8967);

			expect(places?.hamlet).toBe('Little Snoring');
			expect(places?.village).toBe('Great Snoring');
			expect(places?.town).toBe('Fakenham');
			expect(places?.county).toBe('Norfolk');
		});

		it('should use correct API endpoint', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ address: {}, display_name: '' })
			});

			await adapter.reverseGeocode(51.5074, -0.1278);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('https://nominatim.openstreetmap.org/reverse'),
				expect.any(Object)
			);
		});

		it('should include correct query parameters', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ address: {}, display_name: '' })
			});

			await adapter.reverseGeocode(51.5074, -0.1278);

			const calledUrl = mockFetch.mock.calls[0][0] as string;
			expect(calledUrl).toContain('lat=51.5074');
			expect(calledUrl).toContain('lon=-0.1278');
			expect(calledUrl).toContain('format=json');
			expect(calledUrl).toContain('addressdetails=1');
			expect(calledUrl).toContain('zoom=14');
		});

		it('should include User-Agent header', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ address: {}, display_name: '' })
			});

			await adapter.reverseGeocode(51.5074, -0.1278);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						'User-Agent': expect.stringContaining('Driftwise')
					})
				})
			);
		});

		it('should return null on HTTP error', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500
			});

			const places = await adapter.reverseGeocode(51.5074, -0.1278);

			expect(places).toBeNull();
		});

		it('should return null on network error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const places = await adapter.reverseGeocode(51.5074, -0.1278);

			expect(places).toBeNull();
		});

		it('should return null on invalid JSON', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.reject(new Error('Invalid JSON'))
			});

			const places = await adapter.reverseGeocode(51.5074, -0.1278);

			expect(places).toBeNull();
		});

		it('should handle empty address response', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ address: {}, display_name: 'Unknown location' })
			});

			const places = await adapter.reverseGeocode(0, 0);

			expect(places).not.toBeNull();
			expect(places?.displayName).toBe('Unknown location');
		});
	});

	describe('rate limiting', () => {
		it('should enforce 1 request per second', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ address: { city: 'London' }, display_name: 'London' })
			});

			// First request should go through immediately
			const p1 = adapter.reverseGeocode(51.5074, -0.1278);
			await vi.advanceTimersByTimeAsync(0);

			// Second request should be queued
			const p2 = adapter.reverseGeocode(51.5075, -0.1279);

			// Complete first request
			await p1;
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Advance time by 1 second
			await vi.advanceTimersByTimeAsync(1000);
			await p2;

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should queue multiple requests', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ address: { city: 'London' }, display_name: 'London' })
			});

			// Queue 3 requests
			const promises = [
				adapter.reverseGeocode(51.5074, -0.1278),
				adapter.reverseGeocode(51.5075, -0.1279),
				adapter.reverseGeocode(51.5076, -0.1280)
			];

			// First should be immediate
			await vi.advanceTimersByTimeAsync(0);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// After 1 second, second should fire
			await vi.advanceTimersByTimeAsync(1000);
			expect(mockFetch).toHaveBeenCalledTimes(2);

			// After another second, third should fire
			await vi.advanceTimersByTimeAsync(1000);
			expect(mockFetch).toHaveBeenCalledTimes(3);

			// All should resolve
			await Promise.all(promises);
		});
	});

	describe('caching', () => {
		it('should cache results', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({ address: { city: 'London' }, display_name: 'London, UK' })
			});

			// First request
			const result1 = await adapter.reverseGeocode(51.5074, -0.1278);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			// Advance past rate limit
			await vi.advanceTimersByTimeAsync(1100);

			// Second request for same location (rounded)
			const result2 = await adapter.reverseGeocode(51.5074, -0.1278);

			// Should use cache, not make another request
			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(result1?.city).toBe(result2?.city);
		});

		it('should cache nearby coordinates as same location', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({ address: { city: 'London' }, display_name: 'London, UK' })
			});

			// First request
			await adapter.reverseGeocode(51.5074123, -0.1278456);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1100);

			// Second request for slightly different but rounded-same location
			await adapter.reverseGeocode(51.5074999, -0.1278999);

			// Should use cache (same rounded coordinates)
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should not cache different locations', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({ address: { city: 'London' }, display_name: 'London, UK' })
			});

			// First request
			await adapter.reverseGeocode(51.5074, -0.1278);
			expect(mockFetch).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1100);

			// Second request for different location
			await adapter.reverseGeocode(48.8566, 2.3522); // Paris

			// Should make a new request
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should support getCachedResult method', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({ address: { city: 'London' }, display_name: 'London, UK' })
			});

			// Before request, cache should be empty
			const beforeCache = adapter.getCachedResult(51.5074, -0.1278);
			expect(beforeCache).toBeNull();

			// After request, cache should have result
			await adapter.reverseGeocode(51.5074, -0.1278);
			const afterCache = adapter.getCachedResult(51.5074, -0.1278);
			expect(afterCache?.city).toBe('London');
		});
	});

	describe('timeout', () => {
		it('should handle aborted requests', async () => {
			// Mock fetch to reject with AbortError (simulates timeout)
			mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

			const result = await adapter.reverseGeocode(51.5074, -0.1278);

			// Should return null due to abort/timeout
			expect(result).toBeNull();
		});

		it('should use AbortController for timeout', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ address: { city: 'London' }, display_name: 'London' })
			});

			await adapter.reverseGeocode(51.5074, -0.1278);

			// Verify fetch was called with signal option
			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					signal: expect.any(AbortSignal)
				})
			);
		});
	});
});
