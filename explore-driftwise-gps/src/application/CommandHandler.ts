import { Logger } from '@shared/utils/Logger';
import { Result, ok, err } from '@shared/types/Result';
import { CommandIntent } from '@domains/voice/CommandIntent';
import { VoiceCommand } from '@domains/voice/VoiceCommand';
import { AppState, StateManager } from '@domains/config/StateManager';
import { CommandReceivedEvent, EventPublisher } from './events/DomainEvent';

/**
 * Interface for command effects
 */
export interface CommandEffect {
  type: 'pause' | 'continue' | 'skip' | 'adjust_frequency' | 'follow_up';
  data?: Record<string, unknown>;
}

/**
 * CommandHandler: Processes voice commands and applies state transitions
 */
export class CommandHandler {
  private logger: Logger;
  private stateManager: StateManager;
  private eventPublisher: EventPublisher;

  constructor(stateManager: StateManager, eventPublisher: EventPublisher) {
    this.logger = new Logger('CommandHandler');
    this.stateManager = stateManager;
    this.eventPublisher = eventPublisher;
  }

  /**
   * Handle a voice command and return the effect
   */
  async handle(command: VoiceCommand): Promise<Result<CommandEffect>> {
    this.logger.info(`Handling command: ${command.intent}`, {
      transcript: command.transcript,
      confidence: command.confidence,
    });

    // Publish command received event
    this.eventPublisher.publish(
      new CommandReceivedEvent(command.intent, command.transcript)
    );

    try {
      const effect = this.applyCommandEffect(command);
      this.logger.info(`Command handled successfully: ${command.intent}`, effect);
      return ok(effect);
    } catch (error) {
      this.logger.error(`Error handling command: ${command.intent}`, error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Apply the command effect based on intent
   */
  private applyCommandEffect(command: VoiceCommand): CommandEffect {
    switch (command.intent) {
      case CommandIntent.PAUSE:
        return this.handlePause();

      case CommandIntent.CONTINUE:
        return this.handleContinue();

      case CommandIntent.SKIP:
        return this.handleSkip();

      case CommandIntent.MORE_OFTEN:
        return this.handleMoreOften();

      case CommandIntent.LESS_OFTEN:
        return this.handleLessOften();

      case CommandIntent.FOLLOW_UP_QUESTION:
        return this.handleFollowUpQuestion(command.transcript);

      default:
        throw new Error(`Unknown command intent: ${command.intent}`);
    }
  }

  /**
   * PAUSE: Pause current speech (keep session open, wait for CONTINUE)
   */
  private handlePause(): CommandEffect {
    this.stateManager.setState(AppState.PAUSED);
    this.logger.info('Speech paused');
    return { type: 'pause' };
  }

  /**
   * CONTINUE: Resume speech from paused state
   */
  private handleContinue(): CommandEffect {
    const currentState = this.stateManager.getState();
    if (currentState === AppState.PAUSED) {
      this.stateManager.setState(AppState.SPEAKING);
      this.logger.info('Speech resumed');
    } else {
      this.logger.warn(`Cannot continue from state: ${currentState}`);
    }
    return { type: 'continue' };
  }

  /**
   * SKIP: End current voice session and return to IDLE
   */
  private handleSkip(): CommandEffect {
    this.stateManager.setState(AppState.IDLE);
    this.logger.info('Session skipped, returning to IDLE');
    return { type: 'skip' };
  }

  /**
   * MORE_OFTEN: Reduce polling interval (increase frequency)
   * Decreases interval by 25% but respects minimum 2 minutes
   */
  private handleMoreOften(): CommandEffect {
    const currentInterval = this.stateManager.getPollingInterval();
    const reducedInterval = Math.max(2 * 60 * 1000, Math.floor(currentInterval * 0.75));
    this.stateManager.setPollingInterval(reducedInterval);

    this.logger.info(`Polling frequency increased: ${currentInterval}ms → ${reducedInterval}ms`);
    return {
      type: 'adjust_frequency',
      data: { direction: 'increase', newInterval: reducedInterval },
    };
  }

  /**
   * LESS_OFTEN: Increase polling interval (decrease frequency)
   * Increases interval by 25% but respects maximum 15 minutes
   */
  private handleLessOften(): CommandEffect {
    const currentInterval = this.stateManager.getPollingInterval();
    const increasedInterval = Math.min(15 * 60 * 1000, Math.floor(currentInterval * 1.25));
    this.stateManager.setPollingInterval(increasedInterval);

    this.logger.info(
      `Polling frequency decreased: ${currentInterval}ms → ${increasedInterval}ms`
    );
    return {
      type: 'adjust_frequency',
      data: { direction: 'decrease', newInterval: increasedInterval },
    };
  }

  /**
   * FOLLOW_UP_QUESTION: Send transcript to Gemini for context-aware response
   * (Will be implemented when VoiceDeliveryEngine is integrated)
   */
  private handleFollowUpQuestion(transcript: string): CommandEffect {
    this.logger.info(`Follow-up question received: ${transcript}`);
    // TODO: Send to Gemini Live API for context-aware response
    // For now, just log it
    return {
      type: 'follow_up',
      data: { question: transcript },
    };
  }
}
