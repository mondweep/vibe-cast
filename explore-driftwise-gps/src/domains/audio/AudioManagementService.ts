import { Logger } from '@shared/utils/Logger';
import { Result, ok, err } from '@shared/types/Result';
import { AudioFocus } from './AudioFocus';
import { FocusType } from './FocusType';
import { AudioFocusError, InvalidAudioFocusState } from '@shared/errors/DomainError';

/**
 * Audio management service interface for adapters
 */
export interface IAudioAdapter {
  requestAudioFocus(focusType: FocusType): Promise<Result<void>>;
  releaseAudioFocus(): Promise<Result<void>>;
  isAvailable(): boolean;
}

/**
 * AudioManagementService: Orchestrates audio focus lifecycle
 *
 * Responsibilities:
 * - Request audio focus before voice delivery
 * - Release audio focus after voice delivery
 * - Integrate with platform-specific audio adapters (Android, Web)
 * - Enforce domain invariants (only one permanent focus)
 */
export class AudioManagementService {
  private logger: Logger;
  private adapter: IAudioAdapter;
  private activeFocus?: AudioFocus;
  private permanentFocusHeld = false;

  constructor(adapter: IAudioAdapter) {
    this.logger = new Logger('AudioManagementService');
    this.adapter = adapter;
  }

  /**
   * Request audio focus for voice delivery
   *
   * @param focusType - Type of focus to request (default: TRANSIENT_MAY_DUCK)
   * @returns Result with AudioFocus instance on success
   */
  async requestAudioFocus(focusType: FocusType = FocusType.TRANSIENT_MAY_DUCK): Promise<Result<AudioFocus>> {
    try {
      // Validate domain invariant: only one permanent focus
      if (focusType === FocusType.PERMANENT && this.permanentFocusHeld) {
        const error = new InvalidAudioFocusState(
          'Cannot request permanent audio focus: another permanent focus is already held'
        );
        this.logger.error('Permanent focus invariant violation', error);
        return err(error);
      }

      // Check adapter availability
      if (!this.adapter.isAvailable()) {
        const error = new AudioFocusError('Audio adapter is not available');
        this.logger.warn(error.message);
        // For web/non-Android platforms, we allow graceful degradation
        // Create focus instance but don't enforce on adapter
      }

      // Create focus instance
      const focus = new AudioFocus(focusType);

      // Request focus through adapter
      const adapterResult = await this.adapter.requestAudioFocus(focusType);
      if (adapterResult.isErr()) {
        this.logger.warn(`Adapter failed to request focus: ${adapterResult.error.message}`);
        // Continue anyway - graceful degradation for non-critical platform features
      }

      // Mark focus as active
      focus.request();

      // Track permanent focus
      if (focusType === FocusType.PERMANENT) {
        this.permanentFocusHeld = true;
      }

      this.activeFocus = focus;
      this.logger.info(`Audio focus requested (${focusType})`);

      return ok(focus);
    } catch (error) {
      const domainError = new AudioFocusError(
        `Failed to request audio focus: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(domainError.message, error);
      return err(domainError);
    }
  }

  /**
   * Release audio focus after voice delivery
   *
   * @param focus - The AudioFocus instance to release
   * @returns Result indicating success or failure
   */
  async releaseAudioFocus(focus: AudioFocus): Promise<Result<void>> {
    try {
      // Validate the focus is currently held
      if (!focus.isActive()) {
        const error = new InvalidAudioFocusState('Cannot release inactive audio focus');
        this.logger.error(error.message);
        return err(error);
      }

      // Release through adapter
      const adapterResult = await this.adapter.releaseAudioFocus();
      if (adapterResult.isErr()) {
        this.logger.warn(`Adapter failed to release focus: ${adapterResult.error.message}`);
        // Continue with release - we want to clean up locally regardless
      }

      // Release focus instance
      focus.release();

      // Untrack permanent focus
      if (focus.isPermanent()) {
        this.permanentFocusHeld = false;
      }

      // Clear active focus if this was it
      if (this.activeFocus === focus) {
        this.activeFocus = undefined;
      }

      this.logger.info(`Audio focus released (duration: ${focus.getDuration()}ms)`);

      return ok(undefined);
    } catch (error) {
      const domainError = new AudioFocusError(
        `Failed to release audio focus: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(domainError.message, error);
      return err(domainError);
    }
  }

  /**
   * Get currently held focus (if any)
   */
  getActiveFocus(): AudioFocus | undefined {
    return this.activeFocus;
  }

  /**
   * Check if permanent focus is currently held
   */
  hasPermanentFocus(): boolean {
    return this.permanentFocusHeld;
  }
}
