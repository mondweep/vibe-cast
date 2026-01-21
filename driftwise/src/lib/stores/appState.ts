// Application State Store
// Orchestrates the delivery cycle and manages application state

import { writable, derived, type Readable } from 'svelte/store';
import type { GPSCoordinates, PlaceNames, Location } from '@domain/location';
import type { HistoricalFact, SeasonalContext } from '@domain/discovery';
import type { SessionState, VoiceCommand } from '@domain/voice';
import type { FocusResult } from '@domain/audio';

/**
 * Application state types
 */
export type AppStatus =
	| 'idle'
	| 'locating'
	| 'geocoding'
	| 'researching'
	| 'speaking'
	| 'listening'
	| 'paused'
	| 'error';

export interface AppState {
	status: AppStatus;
	isRunning: boolean;
	currentLocation: Location | null;
	currentFact: HistoricalFact | null;
	lastError: string | null;
	pollingIntervalMs: number;
	sessionCount: number;
	factsDelivered: number;
}

export interface CycleResult {
	success: boolean;
	fact?: HistoricalFact;
	error?: string;
	skippedReason?: string;
}

// Default state
const defaultState: AppState = {
	status: 'idle',
	isRunning: false,
	currentLocation: null,
	currentFact: null,
	lastError: null,
	pollingIntervalMs: 60000, // 1 minute between discoveries for better UX
	sessionCount: 0,
	factsDelivered: 0
};

// Create writable store
function createAppStore() {
	const { subscribe, set, update } = writable<AppState>(defaultState);

	return {
		subscribe,

		// Status transitions
		setStatus(status: AppStatus) {
			update((state) => ({ ...state, status, lastError: null }));
		},

		setError(error: string) {
			update((state) => ({ ...state, status: 'error', lastError: error }));
		},

		// Session management
		start() {
			update((state) => ({
				...state,
				isRunning: true,
				status: 'idle',
				sessionCount: state.sessionCount + 1
			}));
		},

		stop() {
			update((state) => ({
				...state,
				isRunning: false,
				status: 'idle'
			}));
		},

		// Location updates
		setLocation(location: Location) {
			update((state) => ({ ...state, currentLocation: location }));
		},

		// Fact updates
		setFact(fact: HistoricalFact) {
			update((state) => ({
				...state,
				currentFact: fact,
				factsDelivered: state.factsDelivered + 1
			}));
		},

		clearFact() {
			update((state) => ({ ...state, currentFact: null }));
		},

		// Polling interval
		setPollingInterval(ms: number) {
			const clamped = Math.max(30000, Math.min(900000, ms)); // Min 30 seconds
			update((state) => ({ ...state, pollingIntervalMs: clamped }));
		},

		increasePollingInterval() {
			update((state) => ({
				...state,
				pollingIntervalMs: Math.min(state.pollingIntervalMs + 30000, 900000)
			}));
		},

		decreasePollingInterval() {
			update((state) => ({
				...state,
				pollingIntervalMs: Math.max(state.pollingIntervalMs - 30000, 30000)
			}));
		},

		// Reset
		reset() {
			set(defaultState);
		}
	};
}

// Create and export the store
export const appState = createAppStore();

// Derived stores for specific state slices
export const isRunning: Readable<boolean> = derived(appState, ($state) => $state.isRunning);

export const currentStatus: Readable<AppStatus> = derived(appState, ($state) => $state.status);

export const currentLocation: Readable<Location | null> = derived(
	appState,
	($state) => $state.currentLocation
);

export const currentFact: Readable<HistoricalFact | null> = derived(
	appState,
	($state) => $state.currentFact
);

export const pollingInterval: Readable<number> = derived(
	appState,
	($state) => $state.pollingIntervalMs
);

export const stats: Readable<{ sessions: number; facts: number }> = derived(appState, ($state) => ({
	sessions: $state.sessionCount,
	facts: $state.factsDelivered
}));
