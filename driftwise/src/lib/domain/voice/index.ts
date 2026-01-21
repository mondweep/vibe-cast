// Voice Interaction Context - Domain Models
// Gemini Live API, speech synthesis, command recognition

/**
 * Voice command types
 */
export type CommandType =
	| 'pause'
	| 'continue'
	| 'skip'
	| 'increase_cadence'
	| 'decrease_cadence'
	| 'follow_up';

/**
 * Voice command value object
 */
export interface VoiceCommand {
	readonly type: CommandType;
	readonly confidence: number; // 0-1
	readonly transcript?: string; // For follow_up type
}

/**
 * Transcript result from speech recognition
 */
export interface TranscriptResult {
	readonly text: string;
	readonly confidence: number;
	readonly alternatives: string[];
	readonly isFinal: boolean;
}

/**
 * Dialog turn in a voice session
 */
export interface DialogTurn {
	readonly id: string;
	readonly speaker: 'assistant' | 'user';
	readonly content: string;
	readonly timestamp: number;
	readonly durationMs?: number;
}

/**
 * Voice session states
 */
export type SessionState =
	| 'idle'
	| 'connecting'
	| 'ready'
	| 'speaking'
	| 'listening'
	| 'paused'
	| 'closing'
	| 'closed'
	| 'error';

/**
 * Voice session entity
 */
export interface VoiceSession {
	readonly id: string;
	readonly state: SessionState;
	readonly turns: DialogTurn[];
	readonly startedAt: number;
	readonly lastActivityAt: number;
}

// Domain events
export interface VoiceSessionOpenedEvent {
	readonly type: 'VoiceSessionOpened';
	readonly payload: {
		readonly sessionId: string;
	};
	readonly timestamp: number;
}

export interface SpeechBegunEvent {
	readonly type: 'SpeechBegun';
	readonly payload: {
		readonly sessionId: string;
		readonly turn: DialogTurn;
	};
	readonly timestamp: number;
}

export interface CommandRecognizedEvent {
	readonly type: 'CommandRecognized';
	readonly payload: {
		readonly command: VoiceCommand;
	};
	readonly timestamp: number;
}

export interface VoiceSessionClosedEvent {
	readonly type: 'VoiceSessionClosed';
	readonly payload: {
		readonly sessionId: string;
		readonly reason: string;
	};
	readonly timestamp: number;
}

export type VoiceEvent =
	| VoiceSessionOpenedEvent
	| SpeechBegunEvent
	| CommandRecognizedEvent
	| VoiceSessionClosedEvent;

// Command patterns for fuzzy matching
export const COMMAND_PATTERNS: Record<CommandType, string[]> = {
	pause: ['pause', 'wait', 'hold on', 'stop talking', 'hold'],
	continue: ['continue', 'go on', 'resume', 'keep going', 'carry on'],
	skip: ['skip', 'next', 'stop', 'nevermind', 'never mind'],
	increase_cadence: ['more often', 'more facts', 'more frequently', 'faster'],
	decrease_cadence: ['less often', 'fewer facts', 'less frequently', 'quieter', 'quiet mode'],
	follow_up: [] // Catch-all for unrecognized speech
};

/**
 * Parse a transcript into a voice command
 */
export function parseVoiceCommand(transcript: string): VoiceCommand | null {
	const normalized = transcript.toLowerCase().trim().replace(/\s+/g, ' ');

	for (const [type, patterns] of Object.entries(COMMAND_PATTERNS)) {
		if (type === 'follow_up') continue;

		for (const pattern of patterns) {
			if (normalized.includes(pattern)) {
				return {
					type: type as CommandType,
					confidence: 0.95,
					transcript
				};
			}
		}
	}

	// If we have speech but no recognized command, treat as follow-up question
	if (normalized.length > 3) {
		return {
			type: 'follow_up',
			confidence: 0.7,
			transcript: normalized
		};
	}

	return null;
}

// Alias for backwards compatibility
export const parseCommand = parseVoiceCommand;

/**
 * Create a dialog turn
 */
export function createDialogTurn(
	speaker: 'assistant' | 'user',
	content: string,
	durationMs?: number
): DialogTurn {
	return {
		id: `turn-${crypto.randomUUID()}`,
		speaker,
		content,
		timestamp: Date.now(),
		durationMs
	};
}

/**
 * Valid session states
 */
const VALID_SESSION_STATES: SessionState[] = [
	'idle',
	'connecting',
	'ready',
	'speaking',
	'listening',
	'paused',
	'closing',
	'closed',
	'error'
];

/**
 * Check if a state is valid
 */
export function isValidSessionState(state: SessionState): boolean {
	return VALID_SESSION_STATES.includes(state);
}

/**
 * Session state transition actions
 */
type SessionAction =
	| 'open'
	| 'connected'
	| 'speak'
	| 'complete'
	| 'pause'
	| 'resume'
	| 'timeout'
	| 'follow_up'
	| 'skip'
	| 'closed'
	| 'reset'
	| 'error';

/**
 * State transition table
 */
const STATE_TRANSITIONS: Record<SessionState, Partial<Record<SessionAction, SessionState>>> = {
	idle: { open: 'connecting' },
	connecting: { connected: 'ready', error: 'error' },
	ready: { speak: 'speaking', error: 'error' },
	speaking: { complete: 'listening', pause: 'paused', skip: 'closing', error: 'error' },
	listening: { follow_up: 'speaking', timeout: 'idle', skip: 'closing', error: 'error' },
	paused: { resume: 'speaking', skip: 'closing', error: 'error' },
	closing: { closed: 'closed' },
	closed: { reset: 'idle' },
	error: { reset: 'idle' }
};

/**
 * Get the next session state for a given action
 */
export function getNextSessionState(
	currentState: SessionState,
	action: SessionAction
): SessionState | null {
	const transitions = STATE_TRANSITIONS[currentState];
	return transitions[action] ?? null;
}

/**
 * Create a new voice session
 */
export function createVoiceSession(): VoiceSession {
	return {
		id: `session-${crypto.randomUUID()}`,
		state: 'idle',
		turns: [],
		startedAt: Date.now(),
		lastActivityAt: Date.now()
	};
}
