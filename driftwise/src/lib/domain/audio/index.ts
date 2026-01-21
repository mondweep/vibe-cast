// Audio Management Context - Domain Models
// Audio focus, ducking, and playback control

/**
 * Audio focus types
 */
export type FocusType =
	| 'gain' // Permanent focus (not used)
	| 'transient' // Brief, immediate
	| 'transient_may_duck'; // Brief, other apps can lower volume

/**
 * Audio focus request result
 */
export type FocusResult = 'granted' | 'delayed' | 'failed';

/**
 * Audio stream information
 */
export interface AudioStreamInfo {
	readonly streamType: 'music' | 'podcast' | 'navigation' | 'alarm' | 'call';
	readonly isPlaying: boolean;
	readonly volume: number; // 0-100
}

/**
 * Audio focus request entity
 */
export interface AudioFocusRequest {
	readonly id: string;
	readonly type: FocusType;
	readonly requestedAt: number;
	readonly result: FocusResult;
	readonly releasedAt?: number;
}

// Domain events
export interface AudioFocusRequestedEvent {
	readonly type: 'AudioFocusRequested';
	readonly payload: {
		readonly focusType: FocusType;
	};
	readonly timestamp: number;
}

export interface AudioFocusGrantedEvent {
	readonly type: 'AudioFocusGranted';
	readonly payload: {
		readonly requestId: string;
	};
	readonly timestamp: number;
}

export interface AudioFocusDeniedEvent {
	readonly type: 'AudioFocusDenied';
	readonly payload: {
		readonly requestId: string;
		readonly reason: string;
	};
	readonly timestamp: number;
}

export interface AudioFocusReleasedEvent {
	readonly type: 'AudioFocusReleased';
	readonly payload: {
		readonly requestId: string;
	};
	readonly timestamp: number;
}

export interface AudioFocusLostEvent {
	readonly type: 'AudioFocusLost';
	readonly payload: {
		readonly temporary: boolean;
	};
	readonly timestamp: number;
}

export type AudioEvent =
	| AudioFocusRequestedEvent
	| AudioFocusGrantedEvent
	| AudioFocusDeniedEvent
	| AudioFocusReleasedEvent
	| AudioFocusLostEvent;

/**
 * Create a new audio focus request
 */
export function createAudioFocusRequest(
	type: FocusType,
	result: FocusResult = 'granted'
): AudioFocusRequest {
	return {
		id: crypto.randomUUID(),
		type,
		requestedAt: Date.now(),
		result
	};
}
