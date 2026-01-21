import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FactDeliveryCycle } from '@/application/FactDeliveryCycle';
import { AppState, StateManager } from '@domains/config/StateManager';
import { EventBus } from '@/application/events/EventBus';
import { ok, err } from '@shared/types/Result';

describe('FactDeliveryCycle', () => {
  let cycle: FactDeliveryCycle;
  let stateManager: StateManager;
  let eventBus: EventBus;

  // Mock services
  const mockLocationService = {
    acquireLocation: vi.fn(),
  };

  const mockGeocodeService = {
    geocode: vi.fn(),
  };

  const mockFactService = {
    generateFact: vi.fn(),
  };

  const mockVoiceService = {
    deliverFact: vi.fn(),
  };

  const mockCommandListener = {
    listenForCommand: vi.fn(),
  };

  beforeEach(() => {
    stateManager = new StateManager();
    eventBus = new EventBus();
    cycle = new FactDeliveryCycle(
      stateManager,
      eventBus,
      mockLocationService,
      mockGeocodeService,
      mockFactService,
      mockVoiceService,
      mockCommandListener
    );

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('successful cycle', () => {
    it('should complete full fact delivery cycle', async () => {
      mockLocationService.acquireLocation.mockResolvedValue(
        ok({ latitude: 40.7128, longitude: -74.006 })
      );
      mockGeocodeService.geocode.mockResolvedValue(ok('New York, NY'));
      mockFactService.generateFact.mockResolvedValue(
        ok('New York was founded in 1624...')
      );
      mockVoiceService.deliverFact.mockResolvedValue(ok('session-123'));

      const result = await cycle.execute();

      expect(result.success).toBe(true);
      expect(result.stage).toBe('idle');
      expect(result.factDelivered).toBe('New York was founded in 1624...');
      expect(result.location?.latitude).toBe(40.7128);
      expect(result.location?.longitude).toBe(-74.006);
      expect(result.location?.placeName).toBe('New York, NY');
      expect(stateManager.getState()).toBe(AppState.IDLE);
    });

    it('should call services in correct sequence', async () => {
      mockLocationService.acquireLocation.mockResolvedValue(
        ok({ latitude: 40.7128, longitude: -74.006 })
      );
      mockGeocodeService.geocode.mockResolvedValue(ok('New York, NY'));
      mockFactService.generateFact.mockResolvedValue(ok('Fact...'));
      mockVoiceService.deliverFact.mockResolvedValue(ok('session-123'));

      await cycle.execute();

      expect(mockLocationService.acquireLocation).toHaveBeenCalledTimes(1);
      expect(mockGeocodeService.geocode).toHaveBeenCalledWith(40.7128, -74.006);
      expect(mockFactService.generateFact).toHaveBeenCalledWith('New York, NY');
      expect(mockVoiceService.deliverFact).toHaveBeenCalledWith('Fact...');
    });

    it('should transition through all states correctly', async () => {
      mockLocationService.acquireLocation.mockResolvedValue(
        ok({ latitude: 40.7128, longitude: -74.006 })
      );
      mockGeocodeService.geocode.mockResolvedValue(ok('New York, NY'));
      mockFactService.generateFact.mockResolvedValue(ok('Fact...'));
      mockVoiceService.deliverFact.mockResolvedValue(ok('session-123'));

      const states: AppState[] = [];
      stateManager.onStateChange((state) => states.push(state));

      await cycle.execute();

      expect(states).toContain(AppState.LOCATING);
      expect(states).toContain(AppState.GEOCODING);
      expect(states).toContain(AppState.RESEARCHING);
      expect(states).toContain(AppState.SPEAKING);
      expect(states).toContain(AppState.LISTENING);
    });

    it('should measure cycle duration', async () => {
      mockLocationService.acquireLocation.mockResolvedValue(
        ok({ latitude: 40.7128, longitude: -74.006 })
      );
      mockGeocodeService.geocode.mockResolvedValue(ok('New York, NY'));
      mockFactService.generateFact.mockResolvedValue(ok('Fact...'));
      mockVoiceService.deliverFact.mockResolvedValue(ok('session-123'));

      const result = await cycle.execute();

      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(5000); // Should complete quickly
    });
  });

  describe('failure scenarios', () => {
    it('should handle location acquisition failure', async () => {
      const error = new Error('GPS unavailable');
      mockLocationService.acquireLocation.mockResolvedValue(err(error));

      const result = await cycle.execute();

      expect(result.success).toBe(false);
      expect(result.stage).toBe('locate');
      expect(result.error).toBe(error);
      expect(stateManager.getState()).toBe(AppState.IDLE);
    });

    it('should handle geocoding failure', async () => {
      mockLocationService.acquireLocation.mockResolvedValue(
        ok({ latitude: 40.7128, longitude: -74.006 })
      );
      const error = new Error('Geocoding service error');
      mockGeocodeService.geocode.mockResolvedValue(err(error));

      const result = await cycle.execute();

      expect(result.success).toBe(false);
      expect(result.stage).toBe('geocode');
      expect(result.error).toBe(error);
      expect(stateManager.getState()).toBe(AppState.IDLE);
    });

    it('should handle fact generation failure', async () => {
      mockLocationService.acquireLocation.mockResolvedValue(
        ok({ latitude: 40.7128, longitude: -74.006 })
      );
      mockGeocodeService.geocode.mockResolvedValue(ok('New York, NY'));
      const error = new Error('Gemini API error');
      mockFactService.generateFact.mockResolvedValue(err(error));

      const result = await cycle.execute();

      expect(result.success).toBe(false);
      expect(result.stage).toBe('generate');
      expect(result.error).toBe(error);
      expect(stateManager.getState()).toBe(AppState.IDLE);
    });

    it('should handle voice delivery failure', async () => {
      mockLocationService.acquireLocation.mockResolvedValue(
        ok({ latitude: 40.7128, longitude: -74.006 })
      );
      mockGeocodeService.geocode.mockResolvedValue(ok('New York, NY'));
      mockFactService.generateFact.mockResolvedValue(ok('Fact...'));
      const error = new Error('Voice delivery error');
      mockVoiceService.deliverFact.mockResolvedValue(err(error));

      const result = await cycle.execute();

      expect(result.success).toBe(false);
      expect(result.stage).toBe('voice');
      expect(result.error).toBe(error);
      expect(stateManager.getState()).toBe(AppState.IDLE);
    });
  });

  describe('Event Publishing', () => {
    it('should publish LocationAcquiredEvent on success', (done) => {
      mockLocationService.acquireLocation.mockResolvedValue(
        ok({ latitude: 40.7128, longitude: -74.006 })
      );
      mockGeocodeService.geocode.mockResolvedValue(ok('New York, NY'));
      mockFactService.generateFact.mockResolvedValue(ok('Fact...'));
      mockVoiceService.deliverFact.mockResolvedValue(ok('session-123'));

      eventBus.subscribe('LocationAcquired', (event) => {
        expect(event.getEventName()).toBe('LocationAcquired');
        done();
      });

      cycle.execute();
    });

    it('should publish CycleCompletedEvent on success', (done) => {
      mockLocationService.acquireLocation.mockResolvedValue(
        ok({ latitude: 40.7128, longitude: -74.006 })
      );
      mockGeocodeService.geocode.mockResolvedValue(ok('New York, NY'));
      mockFactService.generateFact.mockResolvedValue(ok('Fact...'));
      mockVoiceService.deliverFact.mockResolvedValue(ok('session-123'));

      eventBus.subscribe('CycleCompleted', (event) => {
        expect(event.getEventName()).toBe('CycleCompleted');
        done();
      });

      cycle.execute();
    });

    it('should publish CycleFailedEvent on failure', (done) => {
      mockLocationService.acquireLocation.mockResolvedValue(
        err(new Error('GPS unavailable'))
      );

      eventBus.subscribe('CycleFailed', (event) => {
        expect(event.getEventName()).toBe('CycleFailed');
        done();
      });

      cycle.execute();
    });
  });
});
