// App State Store Unit Tests - TDD Suite
// Tests for application state management

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	appState,
	isRunning,
	currentStatus,
	currentLocation,
	currentFact,
	pollingInterval,
	stats
} from '@stores/appState';
import type { Location } from '@domain/location';
import type { HistoricalFact } from '@domain/discovery';

describe('App State Store', () => {
	beforeEach(() => {
		appState.reset();
	});

	describe('initial state', () => {
		it('should have idle status initially', () => {
			expect(get(currentStatus)).toBe('idle');
		});

		it('should not be running initially', () => {
			expect(get(isRunning)).toBe(false);
		});

		it('should have no location initially', () => {
			expect(get(currentLocation)).toBeNull();
		});

		it('should have no fact initially', () => {
			expect(get(currentFact)).toBeNull();
		});

		it('should have default polling interval of 5 minutes', () => {
			expect(get(pollingInterval)).toBe(120000);
		});

		it('should have zero stats initially', () => {
			const s = get(stats);
			expect(s.sessions).toBe(0);
			expect(s.facts).toBe(0);
		});
	});

	describe('status transitions', () => {
		it('should update status', () => {
			appState.setStatus('locating');
			expect(get(currentStatus)).toBe('locating');
		});

		it('should clear error when setting status', () => {
			appState.setError('Test error');
			appState.setStatus('idle');

			const state = get(appState);
			expect(state.lastError).toBeNull();
		});
	});

	describe('error handling', () => {
		it('should set error status and message', () => {
			appState.setError('GPS failed');

			const state = get(appState);
			expect(state.status).toBe('error');
			expect(state.lastError).toBe('GPS failed');
		});
	});

	describe('session management', () => {
		it('should start session', () => {
			appState.start();

			expect(get(isRunning)).toBe(true);
			expect(get(stats).sessions).toBe(1);
		});

		it('should stop session', () => {
			appState.start();
			appState.stop();

			expect(get(isRunning)).toBe(false);
			expect(get(currentStatus)).toBe('idle');
		});

		it('should increment session count on each start', () => {
			appState.start();
			appState.stop();
			appState.start();

			expect(get(stats).sessions).toBe(2);
		});
	});

	describe('location updates', () => {
		it('should set location', () => {
			const location: Location = {
				id: 'loc-1',
				coordinates: {
					latitude: 51.5074,
					longitude: -0.1278,
					accuracy: 10,
					timestamp: Date.now(),
					source: 'gps'
				},
				places: {
					city: 'London',
					country: 'United Kingdom',
					displayName: 'London, UK'
				},
				acquiredAt: Date.now()
			};

			appState.setLocation(location);

			expect(get(currentLocation)).toEqual(location);
		});
	});

	describe('fact updates', () => {
		it('should set fact and increment counter', () => {
			const fact: HistoricalFact = {
				id: 'fact-1',
				text: 'In 1834, something happened.',
				metadata: {
					sourceLocation: { displayName: 'London' },
					seasonalContext: { season: 'summer', timeOfDay: 'afternoon' },
					generatedAt: Date.now(),
					researchDurationMs: 100
				},
				quality: {
					score: 80,
					isGeneric: false,
					containsSpecifics: true,
					containsExclusions: false,
					verdict: 'acceptable'
				}
			};

			appState.setFact(fact);

			expect(get(currentFact)).toEqual(fact);
			expect(get(stats).facts).toBe(1);
		});

		it('should clear fact', () => {
			appState.setFact({
				id: 'fact-1',
				text: 'Test',
				metadata: {
					sourceLocation: { displayName: 'Test' },
					seasonalContext: { season: 'summer', timeOfDay: 'afternoon' },
					generatedAt: Date.now(),
					researchDurationMs: 100
				},
				quality: {
					score: 80,
					isGeneric: false,
					containsSpecifics: true,
					containsExclusions: false,
					verdict: 'acceptable'
				}
			});

			appState.clearFact();

			expect(get(currentFact)).toBeNull();
		});
	});

	describe('polling interval', () => {
		it('should set polling interval', () => {
			appState.setPollingInterval(180000); // 3 minutes

			expect(get(pollingInterval)).toBe(180000);
		});

		it('should clamp to minimum of 2 minutes', () => {
			appState.setPollingInterval(60000); // 1 minute

			expect(get(pollingInterval)).toBe(120000);
		});

		it('should clamp to maximum of 15 minutes', () => {
			appState.setPollingInterval(1000000); // Too high

			expect(get(pollingInterval)).toBe(900000);
		});

		it('should increase polling interval', () => {
			appState.setPollingInterval(300000); // 5 min
			appState.increasePollingInterval();

			expect(get(pollingInterval)).toBe(360000); // 6 min
		});

		it('should not increase beyond maximum', () => {
			appState.setPollingInterval(900000); // 15 min
			appState.increasePollingInterval();

			expect(get(pollingInterval)).toBe(900000);
		});

		it('should decrease polling interval', () => {
			appState.setPollingInterval(300000); // 5 min
			appState.decreasePollingInterval();

			expect(get(pollingInterval)).toBe(240000); // 4 min
		});

		it('should not decrease below minimum', () => {
			appState.setPollingInterval(120000); // 2 min
			appState.decreasePollingInterval();

			expect(get(pollingInterval)).toBe(120000);
		});
	});

	describe('reset', () => {
		it('should reset to default state', () => {
			appState.start();
			appState.setStatus('speaking');
			appState.setPollingInterval(600000);

			appState.reset();

			expect(get(isRunning)).toBe(false);
			expect(get(currentStatus)).toBe('idle');
			expect(get(pollingInterval)).toBe(120000);
			expect(get(stats).sessions).toBe(0);
		});
	});
});
