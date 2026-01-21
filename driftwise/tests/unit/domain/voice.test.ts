// Voice Context Unit Tests - TDD Suite
// Tests for voice command processing and session management

import { describe, it, expect } from 'vitest';
import {
	parseVoiceCommand,
	createDialogTurn,
	isValidSessionState,
	getNextSessionState,
	type VoiceCommand,
	type SessionState,
	COMMAND_PATTERNS
} from '@domain/voice';

describe('Voice Context - Domain Models', () => {
	describe('parseVoiceCommand', () => {
		describe('pause commands', () => {
			it('should recognize "pause"', () => {
				const command = parseVoiceCommand('pause');
				expect(command?.type).toBe('pause');
			});

			it('should recognize "wait"', () => {
				const command = parseVoiceCommand('wait');
				expect(command?.type).toBe('pause');
			});

			it('should recognize "hold on"', () => {
				const command = parseVoiceCommand('hold on');
				expect(command?.type).toBe('pause');
			});

			it('should recognize "stop talking"', () => {
				const command = parseVoiceCommand('stop talking');
				expect(command?.type).toBe('pause');
			});
		});

		describe('continue commands', () => {
			it('should recognize "continue"', () => {
				const command = parseVoiceCommand('continue');
				expect(command?.type).toBe('continue');
			});

			it('should recognize "go on"', () => {
				const command = parseVoiceCommand('go on');
				expect(command?.type).toBe('continue');
			});

			it('should recognize "resume"', () => {
				const command = parseVoiceCommand('resume');
				expect(command?.type).toBe('continue');
			});

			it('should recognize "keep going"', () => {
				const command = parseVoiceCommand('keep going');
				expect(command?.type).toBe('continue');
			});
		});

		describe('skip commands', () => {
			it('should recognize "skip"', () => {
				const command = parseVoiceCommand('skip');
				expect(command?.type).toBe('skip');
			});

			it('should recognize "next"', () => {
				const command = parseVoiceCommand('next');
				expect(command?.type).toBe('skip');
			});

			it('should recognize "nevermind"', () => {
				const command = parseVoiceCommand('nevermind');
				expect(command?.type).toBe('skip');
			});
		});

		describe('cadence commands', () => {
			it('should recognize "more often"', () => {
				const command = parseVoiceCommand('more often');
				expect(command?.type).toBe('increase_cadence');
			});

			it('should recognize "more facts"', () => {
				const command = parseVoiceCommand('more facts');
				expect(command?.type).toBe('increase_cadence');
			});

			it('should recognize "less often"', () => {
				const command = parseVoiceCommand('less often');
				expect(command?.type).toBe('decrease_cadence');
			});

			it('should recognize "fewer facts"', () => {
				const command = parseVoiceCommand('fewer facts');
				expect(command?.type).toBe('decrease_cadence');
			});

			it('should recognize "quiet mode"', () => {
				const command = parseVoiceCommand('quiet mode');
				expect(command?.type).toBe('decrease_cadence');
			});
		});

		describe('case insensitivity', () => {
			it('should be case insensitive', () => {
				expect(parseVoiceCommand('PAUSE')?.type).toBe('pause');
				expect(parseVoiceCommand('Pause')?.type).toBe('pause');
				expect(parseVoiceCommand('SKIP')?.type).toBe('skip');
			});
		});

		describe('follow-up detection', () => {
			it('should detect follow-up questions', () => {
				const command = parseVoiceCommand('tell me more about that');
				expect(command?.type).toBe('follow_up');
				expect(command?.transcript).toBe('tell me more about that');
			});

			it('should treat unrecognized text as follow-up', () => {
				const command = parseVoiceCommand('what year was that exactly?');
				expect(command?.type).toBe('follow_up');
			});
		});

		describe('confidence scoring', () => {
			it('should have high confidence for exact matches', () => {
				const command = parseVoiceCommand('pause');
				expect(command?.confidence).toBeGreaterThan(0.9);
			});

			it('should have lower confidence for follow-ups', () => {
				const command = parseVoiceCommand('tell me more');
				expect(command?.confidence).toBeLessThan(0.8);
			});
		});

		describe('whitespace handling', () => {
			it('should trim whitespace', () => {
				expect(parseVoiceCommand('  pause  ')?.type).toBe('pause');
			});

			it('should handle multiple spaces', () => {
				expect(parseVoiceCommand('hold  on')?.type).toBe('pause');
			});
		});
	});

	describe('createDialogTurn', () => {
		it('should create assistant turn', () => {
			const turn = createDialogTurn('assistant', 'Hello, this is a fact.');

			expect(turn.speaker).toBe('assistant');
			expect(turn.content).toBe('Hello, this is a fact.');
			expect(turn.id).toBeDefined();
			expect(turn.timestamp).toBeLessThanOrEqual(Date.now());
		});

		it('should create user turn', () => {
			const turn = createDialogTurn('user', 'Tell me more');

			expect(turn.speaker).toBe('user');
			expect(turn.content).toBe('Tell me more');
		});

		it('should generate unique IDs', () => {
			const turn1 = createDialogTurn('assistant', 'First');
			const turn2 = createDialogTurn('assistant', 'Second');

			expect(turn1.id).not.toBe(turn2.id);
		});

		it('should accept optional duration', () => {
			const turn = createDialogTurn('assistant', 'Content', 5000);

			expect(turn.durationMs).toBe(5000);
		});
	});

	describe('Session State Machine', () => {
		describe('isValidSessionState', () => {
			it('should validate all states', () => {
				const validStates: SessionState[] = [
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

				for (const state of validStates) {
					expect(isValidSessionState(state)).toBe(true);
				}
			});

			it('should reject invalid states', () => {
				expect(isValidSessionState('invalid' as SessionState)).toBe(false);
			});
		});

		describe('getNextSessionState', () => {
			it('should transition from idle to connecting', () => {
				expect(getNextSessionState('idle', 'open')).toBe('connecting');
			});

			it('should transition from connecting to ready', () => {
				expect(getNextSessionState('connecting', 'connected')).toBe('ready');
			});

			it('should transition from ready to speaking', () => {
				expect(getNextSessionState('ready', 'speak')).toBe('speaking');
			});

			it('should transition from speaking to listening', () => {
				expect(getNextSessionState('speaking', 'complete')).toBe('listening');
			});

			it('should transition from speaking to paused', () => {
				expect(getNextSessionState('speaking', 'pause')).toBe('paused');
			});

			it('should transition from paused to speaking', () => {
				expect(getNextSessionState('paused', 'resume')).toBe('speaking');
			});

			it('should transition from listening to idle on timeout', () => {
				expect(getNextSessionState('listening', 'timeout')).toBe('idle');
			});

			it('should transition from listening to speaking on follow-up', () => {
				expect(getNextSessionState('listening', 'follow_up')).toBe('speaking');
			});

			it('should allow skip from any active state', () => {
				expect(getNextSessionState('speaking', 'skip')).toBe('closing');
				expect(getNextSessionState('listening', 'skip')).toBe('closing');
				expect(getNextSessionState('paused', 'skip')).toBe('closing');
			});

			it('should transition from closing to closed', () => {
				expect(getNextSessionState('closing', 'closed')).toBe('closed');
			});

			it('should transition from closed to idle', () => {
				expect(getNextSessionState('closed', 'reset')).toBe('idle');
			});

			it('should allow error transition from any state', () => {
				const states: SessionState[] = ['connecting', 'ready', 'speaking', 'listening'];
				for (const state of states) {
					expect(getNextSessionState(state, 'error')).toBe('error');
				}
			});

			it('should return null for invalid transitions', () => {
				expect(getNextSessionState('idle', 'speak')).toBeNull();
				expect(getNextSessionState('closed', 'speak')).toBeNull();
			});
		});
	});

	describe('COMMAND_PATTERNS', () => {
		it('should have patterns for all command types', () => {
			expect(COMMAND_PATTERNS.pause).toBeDefined();
			expect(COMMAND_PATTERNS.continue).toBeDefined();
			expect(COMMAND_PATTERNS.skip).toBeDefined();
			expect(COMMAND_PATTERNS.increase_cadence).toBeDefined();
			expect(COMMAND_PATTERNS.decrease_cadence).toBeDefined();
		});

		it('should have multiple patterns per command', () => {
			expect(COMMAND_PATTERNS.pause.length).toBeGreaterThan(1);
			expect(COMMAND_PATTERNS.skip.length).toBeGreaterThan(1);
		});
	});
});
