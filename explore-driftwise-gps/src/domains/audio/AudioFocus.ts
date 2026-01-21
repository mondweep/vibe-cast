import { FocusType } from './FocusType';
import { InvalidAudioFocusState } from '@shared/errors/DomainError';

/**
 * AudioFocus: Aggregate root for audio focus lifecycle
 *
 * Domain Invariants:
 * 1. Only one PERMANENT focus can exist at a time
 * 2. Multiple TRANSIENT focuses can coexist
 * 3. A focus cannot be released if not held
 */
export class AudioFocus {
  private focusType: FocusType;
  private isHeld: boolean = false;
  private createdAt: number;
  private releasedAt?: number;

  /**
   * Create a new AudioFocus instance
   */
  constructor(focusType: FocusType) {
    this.focusType = focusType;
    this.createdAt = Date.now();
  }

  /**
   * Request audio focus
   *
   * @throws InvalidAudioFocusState if focus is already held
   */
  request(): void {
    if (this.isHeld) {
      throw new InvalidAudioFocusState('Audio focus already requested');
    }
    this.isHeld = true;
  }

  /**
   * Release audio focus
   *
   * @throws InvalidAudioFocusState if focus is not held
   */
  release(): void {
    if (!this.isHeld) {
      throw new InvalidAudioFocusState('Audio focus not currently held');
    }
    this.isHeld = false;
    this.releasedAt = Date.now();
  }

  /**
   * Check if focus is currently held
   */
  isActive(): boolean {
    return this.isHeld;
  }

  /**
   * Get focus type
   */
  getType(): FocusType {
    return this.focusType;
  }

  /**
   * Get duration focus was held (in milliseconds)
   * Returns 0 if not yet released
   */
  getDuration(): number {
    const endTime = this.releasedAt || Date.now();
    return endTime - this.createdAt;
  }

  /**
   * Check if this is a permanent focus
   */
  isPermanent(): boolean {
    return this.focusType === FocusType.PERMANENT;
  }

  /**
   * Check if this is a transient focus
   */
  isTransient(): boolean {
    return this.focusType === FocusType.TRANSIENT;
  }

  /**
   * Check if this focus allows ducking
   */
  allowsDucking(): boolean {
    return this.focusType === FocusType.TRANSIENT_MAY_DUCK;
  }
}
