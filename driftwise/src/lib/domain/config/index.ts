// Configuration Context - Domain Models
// User preferences and application settings

/**
 * Polling interval configuration
 */
export interface PollingInterval {
	readonly currentMs: number;
	readonly minMs: number; // 120000 (2 min)
	readonly maxMs: number; // 900000 (15 min)
}

/**
 * Interest threshold levels
 */
export type InterestThreshold = 'low' | 'medium' | 'high';

/**
 * Available voice presets (Gemini Live API)
 */
export type VoicePreset = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';

/**
 * User preferences entity
 */
export interface UserPreferences {
	readonly id: string; // Always 'default' for V1
	readonly pollingInterval: PollingInterval;
	readonly interestThreshold: InterestThreshold;
	readonly voicePreset: VoicePreset;
	readonly isFirstLaunch: boolean;
	readonly lastUpdatedAt: number;
}

// Domain events
export interface PollingIntervalChangedEvent {
	readonly type: 'PollingIntervalChanged';
	readonly payload: {
		readonly previousMs: number;
		readonly newMs: number;
	};
	readonly timestamp: number;
}

export interface InterestThresholdChangedEvent {
	readonly type: 'InterestThresholdChanged';
	readonly payload: {
		readonly previous: InterestThreshold;
		readonly new: InterestThreshold;
	};
	readonly timestamp: number;
}

export interface VoicePresetChangedEvent {
	readonly type: 'VoicePresetChanged';
	readonly payload: {
		readonly previous: VoicePreset;
		readonly new: VoicePreset;
	};
	readonly timestamp: number;
}

export type ConfigEvent =
	| PollingIntervalChangedEvent
	| InterestThresholdChangedEvent
	| VoicePresetChangedEvent;

// Default values
export const DEFAULT_POLLING_INTERVAL_MS = 300000; // 5 minutes
export const MIN_POLLING_INTERVAL_MS = 120000; // 2 minutes
export const MAX_POLLING_INTERVAL_MS = 900000; // 15 minutes
export const POLLING_STEP_MS = 60000; // 1 minute

export const DEFAULT_INTEREST_THRESHOLD: InterestThreshold = 'medium';
export const DEFAULT_VOICE_PRESET: VoicePreset = 'Puck';

/**
 * Create default user preferences
 */
export function createDefaultPreferences(): UserPreferences {
	return {
		id: 'default',
		pollingInterval: {
			currentMs: DEFAULT_POLLING_INTERVAL_MS,
			minMs: MIN_POLLING_INTERVAL_MS,
			maxMs: MAX_POLLING_INTERVAL_MS
		},
		interestThreshold: DEFAULT_INTEREST_THRESHOLD,
		voicePreset: DEFAULT_VOICE_PRESET,
		isFirstLaunch: true,
		lastUpdatedAt: Date.now()
	};
}

/**
 * Increase polling interval (less frequent facts)
 */
export function increasePollingInterval(current: PollingInterval): PollingInterval {
	const newMs = Math.min(current.currentMs + POLLING_STEP_MS, current.maxMs);
	return { ...current, currentMs: newMs };
}

/**
 * Decrease polling interval (more frequent facts)
 */
export function decreasePollingInterval(current: PollingInterval): PollingInterval {
	const newMs = Math.max(current.currentMs - POLLING_STEP_MS, current.minMs);
	return { ...current, currentMs: newMs };
}

/**
 * Validate polling interval is within bounds
 */
export function isValidPollingInterval(ms: number, bounds: PollingInterval): boolean {
	return ms >= bounds.minMs && ms <= bounds.maxMs;
}
