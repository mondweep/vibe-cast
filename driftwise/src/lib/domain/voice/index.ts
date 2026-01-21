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
export function parseCommand(transcript: string): VoiceCommand | null {
	const normalized = transcript.toLowerCase().trim();

	for (const [type, patterns] of Object.entries(COMMAND_PATTERNS)) {
		if (type === 'follow_up') continue;

		for (const pattern of patterns) {
			if (normalized.includes(pattern)) {
				return {
					type: type as CommandType,
					confidence: 0.9,
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
			transcript
		};
	}

	return null;
}
