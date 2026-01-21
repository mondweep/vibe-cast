import { Logger } from '@shared/utils/Logger';

/**
 * Application state types
 */
export enum AppState {
  IDLE = 'IDLE',
  LOCATING = 'LOCATING',
  GEOCODING = 'GEOCODING',
  RESEARCHING = 'RESEARCHING',
  SPEAKING = 'SPEAKING',
  LISTENING = 'LISTENING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

/**
 * State transition event
 */
export interface StateTransition {
  from: AppState;
  to: AppState;
  timestamp: number;
}

/**
 * StateManager: Manages application state machine and polling
 */
export class StateManager {
  private currentState: AppState = AppState.IDLE;
  private logger: Logger;
  private stateListeners: ((state: AppState) => void)[] = [];
  private pollingInterval: number = 5 * 60 * 1000; // 5 minutes default
  private pollingTimer?: NodeJS.Timeout;

  constructor() {
    this.logger = new Logger('StateManager');
  }

  /**
   * Get current application state
   */
  getState(): AppState {
    return this.currentState;
  }

  /**
   * Transition to a new state
   */
  setState(newState: AppState): void {
    const oldState = this.currentState;
    this.currentState = newState;
    this.logger.info(`State transition: ${oldState} → ${newState}`);
    this.notifyStateListeners(newState);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: AppState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Set polling interval
   */
  setPollingInterval(intervalMs: number): void {
    const minInterval = 2 * 60 * 1000; // 2 minutes
    const maxInterval = 15 * 60 * 1000; // 15 minutes

    if (intervalMs < minInterval || intervalMs > maxInterval) {
      this.logger.warn(
        `Polling interval ${intervalMs}ms is outside valid range [${minInterval}, ${maxInterval}]`
      );
      return;
    }

    this.pollingInterval = intervalMs;
    this.logger.info(`Polling interval set to ${intervalMs}ms`);
  }

  /**
   * Get polling interval
   */
  getPollingInterval(): number {
    return this.pollingInterval;
  }

  /**
   * Start polling cycles (simplified for testing)
   */
  startPolling(onPollTick: () => void): void {
    this.logger.info(`Starting polling with interval ${this.pollingInterval}ms`);
    this.pollingTimer = setInterval(() => {
      if (this.currentState === AppState.IDLE) {
        onPollTick();
      }
    }, this.pollingInterval);
  }

  /**
   * Stop polling cycles
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
      this.logger.info('Polling stopped');
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateListeners(state: AppState): void {
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (error) {
        this.logger.error('Error in state listener', error);
      }
    }
  }
}
