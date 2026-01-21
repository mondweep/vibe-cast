import { describe, it, expect, beforeEach } from 'vitest';
import { CommandHandler } from '@/application/CommandHandler';
import { AppState, StateManager } from '@domains/config/StateManager';
import { EventBus } from '@/application/events/EventBus';
import { VoiceCommand } from '@domains/voice/VoiceCommand';
import { CommandIntent } from '@domains/voice/CommandIntent';

describe('CommandHandler', () => {
  let commandHandler: CommandHandler;
  let stateManager: StateManager;
  let eventBus: EventBus;

  beforeEach(() => {
    stateManager = new StateManager();
    eventBus = new EventBus();
    commandHandler = new CommandHandler(stateManager, eventBus);
  });

  describe('PAUSE command', () => {
    it('should transition to PAUSED state', async () => {
      const command = new VoiceCommand(CommandIntent.PAUSE, 'pause', 0.95);
      const result = await commandHandler.handle(command);

      expect(result.isOk()).toBe(true);
      expect(stateManager.getState()).toBe(AppState.PAUSED);
      expect(result.value?.type).toBe('pause');
    });
  });

  describe('CONTINUE command', () => {
    it('should return to SPEAKING from PAUSED', async () => {
      stateManager.setState(AppState.PAUSED);

      const command = new VoiceCommand(CommandIntent.CONTINUE, 'continue', 0.95);
      const result = await commandHandler.handle(command);

      expect(result.isOk()).toBe(true);
      expect(stateManager.getState()).toBe(AppState.SPEAKING);
      expect(result.value?.type).toBe('continue');
    });

    it('should log warning if not in PAUSED state', async () => {
      stateManager.setState(AppState.IDLE);

      const command = new VoiceCommand(CommandIntent.CONTINUE, 'continue', 0.95);
      const result = await commandHandler.handle(command);

      expect(result.isOk()).toBe(true);
      expect(stateManager.getState()).toBe(AppState.IDLE);
    });
  });

  describe('SKIP command', () => {
    it('should return to IDLE state', async () => {
      stateManager.setState(AppState.SPEAKING);

      const command = new VoiceCommand(CommandIntent.SKIP, 'skip', 0.95);
      const result = await commandHandler.handle(command);

      expect(result.isOk()).toBe(true);
      expect(stateManager.getState()).toBe(AppState.IDLE);
      expect(result.value?.type).toBe('skip');
    });
  });

  describe('MORE_OFTEN command', () => {
    it('should reduce polling interval by 25%', async () => {
      const originalInterval = stateManager.getPollingInterval();
      const command = new VoiceCommand(CommandIntent.MORE_OFTEN, 'more often', 0.95);
      const result = await commandHandler.handle(command);

      expect(result.isOk()).toBe(true);
      const newInterval = stateManager.getPollingInterval();
      expect(newInterval).toBeLessThan(originalInterval);
      expect(newInterval).toBe(Math.floor(originalInterval * 0.75));
      expect(result.value?.type).toBe('adjust_frequency');
    });

    it('should respect minimum interval of 2 minutes', async () => {
      stateManager.setPollingInterval(2 * 60 * 1000 + 1000);
      const command = new VoiceCommand(CommandIntent.MORE_OFTEN, 'more often', 0.95);
      const result = await commandHandler.handle(command);

      expect(result.isOk()).toBe(true);
      expect(stateManager.getPollingInterval()).toBe(2 * 60 * 1000);
    });
  });

  describe('LESS_OFTEN command', () => {
    it('should increase polling interval by 25%', async () => {
      const originalInterval = stateManager.getPollingInterval();
      const command = new VoiceCommand(CommandIntent.LESS_OFTEN, 'less often', 0.95);
      const result = await commandHandler.handle(command);

      expect(result.isOk()).toBe(true);
      const newInterval = stateManager.getPollingInterval();
      expect(newInterval).toBeGreaterThan(originalInterval);
      expect(newInterval).toBe(Math.floor(originalInterval * 1.25));
      expect(result.value?.type).toBe('adjust_frequency');
    });

    it('should respect maximum interval of 15 minutes', async () => {
      stateManager.setPollingInterval(15 * 60 * 1000 - 1000);
      const command = new VoiceCommand(CommandIntent.LESS_OFTEN, 'less often', 0.95);
      const result = await commandHandler.handle(command);

      expect(result.isOk()).toBe(true);
      expect(stateManager.getPollingInterval()).toBe(15 * 60 * 1000);
    });
  });

  describe('FOLLOW_UP_QUESTION command', () => {
    it('should handle follow-up questions', async () => {
      const transcript = 'Tell me more about the Civil War';
      const command = new VoiceCommand(CommandIntent.FOLLOW_UP_QUESTION, transcript, 0.92);
      const result = await commandHandler.handle(command);

      expect(result.isOk()).toBe(true);
      expect(result.value?.type).toBe('follow_up');
      expect(result.value?.data?.question).toBe(transcript);
    });
  });

  describe('Event Publishing', () => {
    it('should publish CommandReceivedEvent', (done) => {
      eventBus.subscribe('CommandReceived', (event) => {
        expect(event.getEventName()).toBe('CommandReceived');
        done();
      });

      const command = new VoiceCommand(CommandIntent.SKIP, 'skip', 0.95);
      commandHandler.handle(command);
    });
  });
});
