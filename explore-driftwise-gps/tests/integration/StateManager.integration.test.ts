import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppState, StateManager } from '@domains/config/StateManager';

describe('StateManager Integration', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  afterEach(() => {
    stateManager.stopPolling();
  });

  describe('State Transitions', () => {
    it('should transition between states', () => {
      const transitions: AppState[] = [];

      stateManager.onStateChange((state) => {
        transitions.push(state);
      });

      stateManager.setState(AppState.LOCATING);
      stateManager.setState(AppState.GEOCODING);
      stateManager.setState(AppState.RESEARCHING);
      stateManager.setState(AppState.SPEAKING);
      stateManager.setState(AppState.IDLE);

      expect(transitions).toEqual([
        AppState.LOCATING,
        AppState.GEOCODING,
        AppState.RESEARCHING,
        AppState.SPEAKING,
        AppState.IDLE,
      ]);
    });

    it('should notify multiple listeners on state change', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      stateManager.onStateChange(listener1);
      stateManager.onStateChange(listener2);
      stateManager.onStateChange(listener3);

      stateManager.setState(AppState.LOCATING);

      expect(listener1).toHaveBeenCalledWith(AppState.LOCATING);
      expect(listener2).toHaveBeenCalledWith(AppState.LOCATING);
      expect(listener3).toHaveBeenCalledWith(AppState.LOCATING);
    });

    it('should allow unsubscribing from state changes', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = stateManager.onStateChange(listener1);
      stateManager.onStateChange(listener2);

      stateManager.setState(AppState.LOCATING);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsubscribe1();
      stateManager.setState(AppState.GEOCODING);
      expect(listener1).toHaveBeenCalledTimes(1); // Not called again
      expect(listener2).toHaveBeenCalledTimes(2);
    });
  });

  describe('Polling Mechanism', () => {
    it('should call poll tick at configured interval', () => {
      const pollTick = vi.fn();
      stateManager.setPollingInterval(100); // 100ms for quick test

      stateManager.startPolling(pollTick);

      return new Promise((resolve) => {
        setTimeout(() => {
          stateManager.stopPolling();
          expect(pollTick.mock.calls.length).toBeGreaterThan(0);
          resolve(undefined);
        }, 350); // Wait for 3-4 poll cycles
      });
    });

    it('should only poll when in IDLE state', () => {
      const pollTick = vi.fn();
      stateManager.setPollingInterval(100);

      stateManager.startPolling(pollTick);

      // Start polling in IDLE state
      return new Promise((resolve) => {
        setTimeout(() => {
          const callsInIdle = pollTick.mock.calls.length;

          // Transition to LOCATING
          stateManager.setState(AppState.LOCATING);

          setTimeout(() => {
            const callsInLocating = pollTick.mock.calls.length;
            expect(callsInLocating).toBe(callsInIdle); // No additional calls

            // Return to IDLE
            stateManager.setState(AppState.IDLE);

            setTimeout(() => {
              stateManager.stopPolling();
              expect(pollTick.mock.calls.length).toBeGreaterThan(callsInIdle);
              resolve(undefined);
            }, 150);
          }, 150);
        }, 150);
      });
    });

    it('should respect polling interval bounds', () => {
      const minInterval = 2 * 60 * 1000;
      const maxInterval = 15 * 60 * 1000;

      // Try to set below minimum
      stateManager.setPollingInterval(1000);
      expect(stateManager.getPollingInterval()).not.toBe(1000);

      // Try to set above maximum
      stateManager.setPollingInterval(20 * 60 * 1000);
      expect(stateManager.getPollingInterval()).not.toBe(20 * 60 * 1000);

      // Valid interval should be set
      stateManager.setPollingInterval(5 * 60 * 1000);
      expect(stateManager.getPollingInterval()).toBe(5 * 60 * 1000);
    });

    it('should stop polling cleanly', () => {
      const pollTick = vi.fn();
      stateManager.setPollingInterval(100);

      stateManager.startPolling(pollTick);

      return new Promise((resolve) => {
        setTimeout(() => {
          const callsBeforeStop = pollTick.mock.calls.length;
          stateManager.stopPolling();

          setTimeout(() => {
            const callsAfterStop = pollTick.mock.calls.length;
            expect(callsAfterStop).toBe(callsBeforeStop); // No more calls
            resolve(undefined);
          }, 150);
        }, 150);
      });
    });
  });

  describe('Polling Interval Adjustment', () => {
    it('should allow changing polling interval', () => {
      stateManager.setPollingInterval(3 * 60 * 1000);
      expect(stateManager.getPollingInterval()).toBe(3 * 60 * 1000);

      stateManager.setPollingInterval(10 * 60 * 1000);
      expect(stateManager.getPollingInterval()).toBe(10 * 60 * 1000);
    });

    it('should clamp interval to valid bounds', () => {
      stateManager.setPollingInterval(1 * 60 * 1000); // Below minimum
      expect(stateManager.getPollingInterval()).not.toBe(1 * 60 * 1000);

      stateManager.setPollingInterval(20 * 60 * 1000); // Above maximum
      expect(stateManager.getPollingInterval()).not.toBe(20 * 60 * 1000);
    });
  });
});
