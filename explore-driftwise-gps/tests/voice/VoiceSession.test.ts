import { describe, it, expect, beforeEach } from '@jest/globals';
import { VoiceSession, VoiceSessionState } from '../../src/domains/voice/VoiceSession';
import { VoiceCommand } from '../../src/domains/voice/VoiceCommand';
import { CommandIntent } from '../../src/domains/voice/CommandIntent';
import { DialogTurn } from '../../src/domains/voice/DialogTurn';

describe('VoiceSession - Aggregate Root', () => {
  let session: VoiceSession;

  beforeEach(() => {
    session = VoiceSession.create();
  });

  describe('Session Creation', () => {
    it('should create a new session with IDLE state', () => {
      expect(session).toBeDefined();
      expect(session.getState()).toBe(VoiceSessionState.IDLE);
      expect(session.isActive()).toBe(false);
    });

    it('should have a unique session ID', () => {
      const session2 = VoiceSession.create();
      expect(session.id).not.toBe(session2.id);
      expect(session.id).toMatch(/^session-/);
    });

    it('should initialize with empty dialog history', () => {
      expect(session.getTurnCount()).toBe(0);
      expect(session.getDialogHistory()).toHaveLength(0);
      expect(session.getLastTurn()).toBeUndefined();
    });
  });

  describe('State Machine - IDLE to SPEAKING', () => {
    it('should transition from IDLE to SPEAKING', () => {
      session.startSpeaking();
      expect(session.getState()).toBe(VoiceSessionState.SPEAKING);
    });

    it('should throw error when starting speaking while already speaking', () => {
      session.startSpeaking();
      expect(() => session.startSpeaking()).toThrow();
    });

    it('should be active after starting speaking', () => {
      expect(session.isActive()).toBe(false);
      session.startSpeaking();
      expect(session.isActive()).toBe(true);
    });
  });

  describe('State Machine - SPEAKING to LISTENING', () => {
    it('should transition from SPEAKING to LISTENING', () => {
      session.startSpeaking();
      session.startListening();
      expect(session.getState()).toBe(VoiceSessionState.LISTENING);
    });

    it('should throw error when starting listening from non-speaking state', () => {
      expect(() => session.startListening()).toThrow(
        /can only start listening from SPEAKING/i,
      );
    });
  });

  describe('State Machine - Pause and Resume', () => {
    it('should pause from SPEAKING state', () => {
      session.startSpeaking();
      session.pause();
      expect(session.getState()).toBe(VoiceSessionState.PAUSED);
    });

    it('should pause from LISTENING state', () => {
      session.startSpeaking();
      session.startListening();
      session.pause();
      expect(session.getState()).toBe(VoiceSessionState.PAUSED);
    });

    it('should resume from PAUSED to LISTENING', () => {
      session.startSpeaking();
      session.pause();
      session.resume();
      expect(session.getState()).toBe(VoiceSessionState.LISTENING);
    });

    it('should throw error when resuming from non-paused state', () => {
      expect(() => session.resume()).toThrow(/can only resume from PAUSED/i);
    });

    it('should throw error when pausing from IDLE or PAUSED', () => {
      expect(() => session.pause()).toThrow();
      session.startSpeaking();
      session.pause();
      expect(() => session.pause()).toThrow();
    });
  });

  describe('State Machine - Close', () => {
    it('should close session and transition to IDLE', () => {
      session.startSpeaking();
      expect(session.getState()).toBe(VoiceSessionState.SPEAKING);
      session.close();
      expect(session.getState()).toBe(VoiceSessionState.IDLE);
    });

    it('should not be active after closing', () => {
      session.startSpeaking();
      session.close();
      expect(session.isActive()).toBe(false);
    });
  });

  describe('Dialog Turn Management', () => {
    beforeEach(() => {
      session.startSpeaking();
    });

    it('should start a dialog turn', () => {
      const factText = 'The Great Wall of China is over 13,000 miles long.';
      const turn = session.startDialogTurn(factText, 1500);

      expect(turn).toBeInstanceOf(DialogTurn);
      expect(turn.factText).toBe(factText);
      expect(turn.synthesisTimeMs).toBe(1500);
    });

    it('should throw error when starting dialog turn from non-speaking state', () => {
      session.startListening();
      expect(() => session.startDialogTurn('test', 1000)).toThrow();
    });

    it('should record user response to current turn', () => {
      session.startDialogTurn('fact', 1000);
      session.startListening();

      const command = VoiceCommand.create(CommandIntent.SKIP, 'skip this', 0.9);
      const completedTurn = session.recordUserResponse(command);

      expect(completedTurn.completed).toBe(true);
      expect(completedTurn.userCommand?.intent).toBe(CommandIntent.SKIP);
    });

    it('should add completed turn to history', () => {
      session.startDialogTurn('fact 1', 1000);
      session.startListening();
      const command1 = VoiceCommand.create(CommandIntent.CONTINUE, 'continue', 0.9);
      session.recordUserResponse(command1);

      expect(session.getTurnCount()).toBe(1);
      expect(session.getLastTurn()).toBeDefined();
      expect(session.getLastTurn()?.factText).toBe('fact 1');
    });

    it('should handle multiple dialog turns in sequence', () => {
      // Turn 1
      session.startDialogTurn('fact 1', 1000);
      session.startListening();
      session.recordUserResponse(VoiceCommand.create(CommandIntent.CONTINUE, 'continue', 0.9));

      // Turn 2
      session.startSpeaking();
      session.startDialogTurn('fact 2', 1200);
      session.startListening();
      session.recordUserResponse(VoiceCommand.create(CommandIntent.SKIP, 'skip', 0.9));

      expect(session.getTurnCount()).toBe(2);
      const history = session.getDialogHistory();
      expect(history[0].factText).toBe('fact 1');
      expect(history[1].factText).toBe('fact 2');
    });

    it('should throw error when responding without active turn', () => {
      const command = VoiceCommand.create(CommandIntent.CONTINUE, 'continue', 0.9);
      expect(() => session.recordUserResponse(command)).toThrow();
    });
  });

  describe('Session Timeout', () => {
    it('should not timeout immediately after creation', () => {
      expect(session.hasTimedOut()).toBe(false);
    });

    it('should timeout after specified duration', (done) => {
      const shortTimeout = 100; // 100ms
      const shortSession = VoiceSession.create(shortTimeout);
      shortSession.startSpeaking();

      expect(shortSession.hasTimedOut()).toBe(false);

      setTimeout(() => {
        expect(shortSession.hasTimedOut()).toBe(true);
        done();
      }, 150);
    });

    it('should update remaining time correctly', (done) => {
      const shortTimeout = 200;
      const shortSession = VoiceSession.create(shortTimeout);
      shortSession.startSpeaking();

      const remaining1 = shortSession.getRemainingTimeMs();
      expect(remaining1).toBeGreaterThan(0);
      expect(remaining1).toBeLessThanOrEqual(200);

      setTimeout(() => {
        const remaining2 = shortSession.getRemainingTimeMs();
        expect(remaining2).toBeLessThan(remaining1);
        done();
      }, 100);
    });
  });

  describe('Statistics and Export', () => {
    it('should return correct statistics', () => {
      session.startSpeaking();
      const stats = session.getStatistics();

      expect(stats.sessionId).toBe(session.id);
      expect(stats.state).toBe(VoiceSessionState.SPEAKING);
      expect(stats.totalTurns).toBe(0);
      expect(stats.isActive).toBe(true);
      expect(stats.hasTimedOut).toBe(false);
    });

    it('should calculate average response time', () => {
      session.startSpeaking();
      session.startDialogTurn('fact 1', 1000);
      session.startListening();
      session.recordUserResponse(VoiceCommand.create(CommandIntent.CONTINUE, 'c', 0.9));

      session.startSpeaking();
      session.startDialogTurn('fact 2', 1000);
      session.startListening();
      session.recordUserResponse(VoiceCommand.create(CommandIntent.CONTINUE, 'c', 0.9));

      const stats = session.getStatistics();
      expect(stats.totalTurns).toBe(2);
      expect(stats.averageResponseTimeMs).toBeDefined();
      expect(stats.averageResponseTimeMs).toBeGreaterThan(0);
    });

    it('should export session data', () => {
      session.startSpeaking();
      session.startDialogTurn('test fact', 1500);
      session.startListening();
      session.recordUserResponse(VoiceCommand.create(CommandIntent.SKIP, 'skip', 0.9));

      const exported = session.export();

      expect(exported.id).toBe(session.id);
      expect(exported.state).toBe(VoiceSessionState.LISTENING);
      expect(exported.dialogHistory).toHaveLength(1);
      expect(exported.sessionTimeoutMs).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long fact text', () => {
      session.startSpeaking();
      const longText = 'A'.repeat(10000);
      const turn = session.startDialogTurn(longText, 5000);
      expect(turn.factText).toBe(longText);
    });

    it('should handle rapid state changes', () => {
      session.startSpeaking();
      session.pause();
      session.resume();
      session.pause();
      session.resume();
      expect(session.getState()).toBe(VoiceSessionState.LISTENING);
    });

    it('should preserve session ID across operations', () => {
      const originalId = session.id;
      session.startSpeaking();
      session.startDialogTurn('fact', 1000);
      session.startListening();
      session.recordUserResponse(VoiceCommand.create(CommandIntent.CONTINUE, 'c', 0.9));
      expect(session.id).toBe(originalId);
    });
  });
});
