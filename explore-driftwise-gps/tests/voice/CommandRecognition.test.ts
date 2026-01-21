import { describe, it, expect, beforeEach } from '@jest/globals';
import { CommandRecognitionService } from '../../src/domains/voice/CommandRecognitionService';
import { CommandIntent } from '../../src/domains/voice/CommandIntent';

describe('CommandRecognitionService', () => {
  let service: CommandRecognitionService;

  beforeEach(() => {
    service = new CommandRecognitionService();
  });

  describe('PAUSE Intent Recognition', () => {
    it('should recognize "pause" command', () => {
      const command = service.recognizeCommand('pause');
      expect(command.intent).toBe(CommandIntent.PAUSE);
      expect(command.isHighConfidence()).toBe(true);
    });

    it('should recognize "stop" command', () => {
      const command = service.recognizeCommand('stop');
      expect(command.intent).toBe(CommandIntent.PAUSE);
    });

    it('should recognize "hold on" command', () => {
      const command = service.recognizeCommand('hold on');
      expect(command.intent).toBe(CommandIntent.PAUSE);
    });

    it('should recognize case-insensitive pause', () => {
      const command = service.recognizeCommand('PAUSE');
      expect(command.intent).toBe(CommandIntent.PAUSE);
    });

    it('should recognize pause in sentence', () => {
      const command = service.recognizeCommand('hey please pause this');
      expect(command.intent).toBe(CommandIntent.PAUSE);
    });
  });

  describe('CONTINUE Intent Recognition', () => {
    it('should recognize "continue" command', () => {
      const command = service.recognizeCommand('continue');
      expect(command.intent).toBe(CommandIntent.CONTINUE);
      expect(command.isHighConfidence()).toBe(true);
    });

    it('should recognize "resume" command', () => {
      const command = service.recognizeCommand('resume');
      expect(command.intent).toBe(CommandIntent.CONTINUE);
    });

    it('should recognize "keep going" command', () => {
      const command = service.recognizeCommand('keep going');
      expect(command.intent).toBe(CommandIntent.CONTINUE);
    });

    it('should recognize "more" command', () => {
      const command = service.recognizeCommand('more');
      expect(command.intent).toBe(CommandIntent.CONTINUE);
    });

    it('should recognize "next" command as continue', () => {
      const command = service.recognizeCommand('next');
      expect(command.intent).toBe(CommandIntent.CONTINUE);
    });
  });

  describe('SKIP Intent Recognition', () => {
    it('should recognize "skip" command', () => {
      const command = service.recognizeCommand('skip');
      expect(command.intent).toBe(CommandIntent.SKIP);
      expect(command.isHighConfidence()).toBe(true);
    });

    it('should recognize "skip this" command', () => {
      const command = service.recognizeCommand('skip this');
      expect(command.intent).toBe(CommandIntent.SKIP);
    });

    it('should recognize "next one" command', () => {
      const command = service.recognizeCommand('next one');
      expect(command.intent).toBe(CommandIntent.SKIP);
    });

    it('should recognize "different" command', () => {
      const command = service.recognizeCommand('different');
      expect(command.intent).toBe(CommandIntent.SKIP);
    });
  });

  describe('MORE_OFTEN Intent Recognition', () => {
    it('should recognize "more often" command', () => {
      const command = service.recognizeCommand('more often');
      expect(command.intent).toBe(CommandIntent.MORE_OFTEN);
    });

    it('should recognize "increase" command', () => {
      const command = service.recognizeCommand('increase frequency');
      expect(command.intent).toBe(CommandIntent.MORE_OFTEN);
    });

    it('should recognize "speed up" command', () => {
      const command = service.recognizeCommand('speed up');
      expect(command.intent).toBe(CommandIntent.MORE_OFTEN);
    });

    it('should recognize "faster" command', () => {
      const command = service.recognizeCommand('faster');
      expect(command.intent).toBe(CommandIntent.MORE_OFTEN);
    });
  });

  describe('LESS_OFTEN Intent Recognition', () => {
    it('should recognize "less often" command', () => {
      const command = service.recognizeCommand('less often');
      expect(command.intent).toBe(CommandIntent.LESS_OFTEN);
    });

    it('should recognize "decrease" command', () => {
      const command = service.recognizeCommand('decrease frequency');
      expect(command.intent).toBe(CommandIntent.LESS_OFTEN);
    });

    it('should recognize "slow down" command', () => {
      const command = service.recognizeCommand('slow down');
      expect(command.intent).toBe(CommandIntent.LESS_OFTEN);
    });

    it('should recognize "fewer" command', () => {
      const command = service.recognizeCommand('fewer facts');
      expect(command.intent).toBe(CommandIntent.LESS_OFTEN);
    });
  });

  describe('FOLLOW_UP Intent Recognition', () => {
    it('should recognize "what" command', () => {
      const command = service.recognizeCommand('what does that mean');
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP);
    });

    it('should recognize "why" command', () => {
      const command = service.recognizeCommand('why is that');
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP);
    });

    it('should recognize "how" command', () => {
      const command = service.recognizeCommand('how did that happen');
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP);
    });

    it('should recognize "tell me" command', () => {
      const command = service.recognizeCommand('tell me more');
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP);
    });

    it('should recognize "explain" command', () => {
      const command = service.recognizeCommand('explain that');
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for exact phrase matches', () => {
      const command = service.recognizeCommand('pause');
      expect(command.isHighConfidence()).toBe(true);
      expect(command.confidence).toBeGreaterThan(0.8);
    });

    it('should have medium/high confidence for common words', () => {
      const command = service.recognizeCommand('what is this');
      expect(command.confidence).toBeGreaterThan(0.5);
    });

    it('should have lower confidence for unclear transcripts', () => {
      const command = service.recognizeCommand('xyzabc123');
      expect(command.confidence).toBeLessThan(0.7);
    });

    it('should track confidence in command object', () => {
      const command = service.recognizeCommand('pause');
      expect(command.confidence).toBeGreaterThanOrEqual(0);
      expect(command.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Fuzzy Matching', () => {
    it('should recognize commands with typos', () => {
      const command = service.recognizeCommandFuzzy('pauze'); // typo
      expect(command.intent).toBe(CommandIntent.PAUSE);
    });

    it('should handle close spelling variations', () => {
      const command = service.recognizeCommandFuzzy('contineu'); // typo
      // Should match continue even with typo
      expect(command.confidence).toBeGreaterThan(0.5);
    });

    it('should respect similarity threshold', () => {
      // Very different word should not match
      const command = service.recognizeCommandFuzzy('xyzabc', 0.95);
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP); // Default fallback
    });

    it('should fall back to follow-up for ambiguous input', () => {
      const command = service.recognizeCommandFuzzy('blah blah blah');
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transcript', () => {
      const command = service.recognizeCommand('');
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP);
      expect(command.confidence).toBeLessThan(0.5);
    });

    it('should handle whitespace-only transcript', () => {
      const command = service.recognizeCommand('   ');
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP);
    });

    it('should handle very long transcript', () => {
      const longText = 'pause ' + 'word '.repeat(1000);
      const command = service.recognizeCommand(longText);
      expect(command.intent).toBe(CommandIntent.PAUSE);
    });

    it('should handle mixed case with punctuation', () => {
      const command = service.recognizeCommand('PAUSE!!!');
      expect(command.intent).toBe(CommandIntent.PAUSE);
    });

    it('should handle Unicode characters', () => {
      const command = service.recognizeCommand('pause café');
      expect(command.intent).toBe(CommandIntent.PAUSE);
    });
  });

  describe('Transcript Recording', () => {
    it('should record the original transcript', () => {
      const original = 'pause this thing';
      const command = service.recognizeCommand(original);
      expect(command.transcript).toBe(original);
    });

    it('should include recognized at timestamp', () => {
      const before = new Date();
      const command = service.recognizeCommand('pause');
      const after = new Date();

      expect(command.recognizedAt).toBeInstanceOf(Date);
      expect(command.recognizedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(command.recognizedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Multi-Intent Scenarios', () => {
    it('should choose best match when multiple intents possible', () => {
      const command = service.recognizeCommand('more facts');
      // "more" could be CONTINUE or MORE_OFTEN
      // MORE_OFTEN is more specific, so should win
      expect(command.intent).toBe(CommandIntent.MORE_OFTEN);
    });

    it('should handle conflicting keywords', () => {
      // "next" could be CONTINUE or SKIP, depending on context
      const command = service.recognizeCommand('next fact');
      expect([CommandIntent.CONTINUE, CommandIntent.SKIP]).toContain(command.intent);
    });
  });

  describe('Real-World Transcripts', () => {
    it('should handle speech-to-text output with pauses', () => {
      const command = service.recognizeCommand('can you please skip this');
      expect(command.intent).toBe(CommandIntent.SKIP);
    });

    it('should handle imprecise speech commands', () => {
      const command = service.recognizeCommand('go on then');
      expect(command.intent).toBe(CommandIntent.CONTINUE);
    });

    it('should handle questions as follow-up', () => {
      const command = service.recognizeCommand('but wait, when did this happen');
      expect(command.intent).toBe(CommandIntent.FOLLOW_UP);
    });

    it('should handle affirmative responses', () => {
      const command = service.recognizeCommand('yeah continue that');
      expect(command.intent).toBe(CommandIntent.CONTINUE);
    });
  });
});
