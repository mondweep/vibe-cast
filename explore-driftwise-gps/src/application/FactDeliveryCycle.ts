import { Logger } from '@shared/utils/Logger';
import { Result, ok, err } from '@shared/types/Result';
import { AppState, StateManager } from '@domains/config/StateManager';
import {
  LocationAcquiredEvent,
  FactGeneratedEvent,
  VoiceSessionStartedEvent,
  CycleCompletedEvent,
  CycleFailedEvent,
  EventPublisher,
} from './events/DomainEvent';

/**
 * FactDeliveryCycle Result
 */
export interface CycleResult {
  success: boolean;
  duration: number;
  factDelivered?: string;
  location?: { latitude: number; longitude: number; placeName?: string };
  error?: Error;
  stage: 'idle' | 'locate' | 'geocode' | 'generate' | 'voice' | 'listen' | 'error';
}

/**
 * Adapters/Services required by FactDeliveryCycle
 */
export interface LocationService {
  acquireLocation(): Promise<Result<{ latitude: number; longitude: number }>>;
}

export interface GeocodeService {
  geocode(lat: number, lon: number): Promise<Result<string>>;
}

export interface FactService {
  generateFact(location: string): Promise<Result<string>>;
}

export interface VoiceService {
  deliverFact(fact: string): Promise<Result<string>>;
}

export interface CommandListener {
  listenForCommand(): Promise<Result<{ intent: string; transcript: string }>>;
}

/**
 * FactDeliveryCycle: Orchestrates the complete fact delivery cycle
 * Sequence: GPS → Geocode → Generate Fact → Voice Delivery → Listen for Commands
 * Error Recovery: Skip cycle on any failure, emit domain events
 */
export class FactDeliveryCycle {
  private logger: Logger;
  private stateManager: StateManager;
  private eventPublisher: EventPublisher;
  private locationService: LocationService;
  private geocodeService: GeocodeService;
  private factService: FactService;
  private voiceService: VoiceService;
  private commandListener: CommandListener;

  constructor(
    stateManager: StateManager,
    eventPublisher: EventPublisher,
    locationService: LocationService,
    geocodeService: GeocodeService,
    factService: FactService,
    voiceService: VoiceService,
    commandListener: CommandListener
  ) {
    this.logger = new Logger('FactDeliveryCycle');
    this.stateManager = stateManager;
    this.eventPublisher = eventPublisher;
    this.locationService = locationService;
    this.geocodeService = geocodeService;
    this.factService = factService;
    this.voiceService = voiceService;
    this.commandListener = commandListener;
  }

  /**
   * Execute a complete fact delivery cycle
   * Returns result with details of what happened
   */
  async execute(): Promise<CycleResult> {
    const startTime = Date.now();

    try {
      // STAGE 1: Acquire GPS location
      this.stateManager.setState(AppState.LOCATING);
      const locationResult = await this.locationService.acquireLocation();

      if (locationResult.isErr()) {
        const error = locationResult.error;
        this.handleCycleFailure('locate', error, startTime);
        return {
          success: false,
          duration: Date.now() - startTime,
          error,
          stage: 'locate',
        };
      }

      const { latitude, longitude } = locationResult.value;
      this.logger.info(`Location acquired: ${latitude}, ${longitude}`);
      this.eventPublisher.publish(new LocationAcquiredEvent(latitude, longitude));

      // STAGE 2: Geocode coordinates to place name
      this.stateManager.setState(AppState.GEOCODING);
      const geocodeResult = await this.geocodeService.geocode(latitude, longitude);

      if (geocodeResult.isErr()) {
        const error = geocodeResult.error;
        this.handleCycleFailure('geocode', error, startTime);
        return {
          success: false,
          duration: Date.now() - startTime,
          location: { latitude, longitude },
          error,
          stage: 'geocode',
        };
      }

      const placeName = geocodeResult.value;
      this.logger.info(`Location geocoded: ${placeName}`);

      // STAGE 3: Generate fact from Gemini
      this.stateManager.setState(AppState.RESEARCHING);
      const factResult = await this.factService.generateFact(placeName);

      if (factResult.isErr()) {
        const error = factResult.error;
        this.handleCycleFailure('generate', error, startTime);
        return {
          success: false,
          duration: Date.now() - startTime,
          location: { latitude, longitude, placeName },
          error,
          stage: 'generate',
        };
      }

      const fact = factResult.value;
      this.logger.info(`Fact generated: "${fact.substring(0, 50)}..."`);
      this.eventPublisher.publish(
        new FactGeneratedEvent(fact, placeName, 0.85) // confidence placeholder
      );

      // STAGE 4: Voice delivery via Gemini Live API
      this.stateManager.setState(AppState.SPEAKING);
      const voiceResult = await this.voiceService.deliverFact(fact);

      if (voiceResult.isErr()) {
        const error = voiceResult.error;
        this.handleCycleFailure('voice', error, startTime);
        return {
          success: false,
          duration: Date.now() - startTime,
          location: { latitude, longitude, placeName },
          factDelivered: fact,
          error,
          stage: 'voice',
        };
      }

      const sessionId = voiceResult.value;
      this.logger.info(`Voice session started: ${sessionId}`);
      this.eventPublisher.publish(new VoiceSessionStartedEvent(sessionId));

      // STAGE 5: Listen for commands (simplified for now)
      // In production, this would be an async listener during the voice session
      this.stateManager.setState(AppState.LISTENING);
      this.logger.info('Listening for commands...');

      // Return to IDLE after cycle completes
      this.stateManager.setState(AppState.IDLE);

      const duration = Date.now() - startTime;
      this.logger.info(`Cycle completed successfully in ${duration}ms`);

      // Emit success event
      this.eventPublisher.publish(new CycleCompletedEvent(true, duration));

      return {
        success: true,
        duration,
        factDelivered: fact,
        location: { latitude, longitude, placeName },
        stage: 'idle',
      };
    } catch (error) {
      const cycleError = error instanceof Error ? error : new Error(String(error));
      this.handleCycleFailure('error', cycleError, startTime);
      return {
        success: false,
        duration: Date.now() - startTime,
        error: cycleError,
        stage: 'error',
      };
    }
  }

  /**
   * Handle cycle failure with proper cleanup and event emission
   */
  private handleCycleFailure(stage: string, error: Error, startTime: number): void {
    this.logger.error(`Cycle failed at stage: ${stage}`, error);

    // Reset state to IDLE
    this.stateManager.setState(AppState.IDLE);

    // Emit failure event
    this.eventPublisher.publish(
      new CycleFailedEvent(stage, error, false) // recovered=false for now, could implement retry
    );
  }
}
