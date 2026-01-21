import { InvariantViolationError, EntityCreationError } from '@/shared/errors/DomainError';

/**
 * PollingInterval: manages polling frequency (2-15 minutes)
 */
export class PollingInterval {
  private constructor(readonly minutes: number) {}

  static MIN_MINUTES = 2;
  static MAX_MINUTES = 15;
  static DEFAULT = new PollingInterval(5);

  static create(minutes: number): PollingInterval {
    if (minutes < this.MIN_MINUTES || minutes > this.MAX_MINUTES) {
      throw new InvariantViolationError(
        `Polling interval must be between ${this.MIN_MINUTES} and ${this.MAX_MINUTES} minutes`
      );
    }
    return new PollingInterval(minutes);
  }

  increaseFrequency(): PollingInterval {
    const newMinutes = Math.max(this.minutes - 1, PollingInterval.MIN_MINUTES);
    return new PollingInterval(newMinutes);
  }

  decreaseFrequency(): PollingInterval {
    const newMinutes = Math.min(this.minutes + 1, PollingInterval.MAX_MINUTES);
    return new PollingInterval(newMinutes);
  }

  toMilliseconds(): number {
    return this.minutes * 60 * 1000;
  }
}

/**
 * InterestThreshold: minimum confidence threshold for facts (0-100)
 */
export enum InterestThreshold {
  LOW = 30,
  MEDIUM = 50,
  HIGH = 70,
  VERY_HIGH = 90,
}

/**
 * VoicePreset: voice configuration
 */
export class VoicePreset {
  constructor(
    readonly name: string,
    readonly speed: number = 1.0, // 0.5 to 2.0
    readonly pitch: number = 1.0 // 0.5 to 2.0
  ) {
    if (speed < 0.5 || speed > 2.0) {
      throw new InvariantViolationError('Speed must be between 0.5 and 2.0');
    }
    if (pitch < 0.5 || pitch > 2.0) {
      throw new InvariantViolationError('Pitch must be between 0.5 and 2.0');
    }
  }

  static DEFAULT = new VoicePreset('default', 1.0, 1.0);
}

/**
 * UserPreferences: aggregate root for user configuration
 */
export class UserPreferences {
  constructor(
    readonly pollingInterval: PollingInterval,
    readonly interestThreshold: InterestThreshold = InterestThreshold.MEDIUM,
    readonly voicePreset: VoicePreset = VoicePreset.DEFAULT,
    readonly createdAt: Date = new Date(),
    readonly updatedAt: Date = new Date()
  ) {}

  /**
   * Create default preferences
   */
  static createDefault(): UserPreferences {
    return new UserPreferences(
      PollingInterval.DEFAULT,
      InterestThreshold.MEDIUM,
      VoicePreset.DEFAULT
    );
  }

  /**
   * Update polling interval
   */
  updatePollingInterval(interval: PollingInterval): UserPreferences {
    return new UserPreferences(
      interval,
      this.interestThreshold,
      this.voicePreset,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update interest threshold
   */
  updateInterestThreshold(threshold: InterestThreshold): UserPreferences {
    return new UserPreferences(
      this.pollingInterval,
      threshold,
      this.voicePreset,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update voice preset
   */
  updateVoicePreset(preset: VoicePreset): UserPreferences {
    return new UserPreferences(
      this.pollingInterval,
      this.interestThreshold,
      preset,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Increase polling frequency (decrease interval)
   */
  increaseFrequency(): UserPreferences {
    return this.updatePollingInterval(this.pollingInterval.increaseFrequency());
  }

  /**
   * Decrease polling frequency (increase interval)
   */
  decreaseFrequency(): UserPreferences {
    return this.updatePollingInterval(this.pollingInterval.decreaseFrequency());
  }
}
