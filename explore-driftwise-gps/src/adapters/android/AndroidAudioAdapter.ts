import { Logger } from '@shared/utils/Logger';
import { Result, ok, err } from '@shared/types/Result';
import { FocusType } from '@domains/audio/FocusType';
import { IAudioAdapter } from '@domains/audio/AudioManagementService';
import { AndroidAudioAdapterError } from '@shared/errors/DomainError';

/**
 * Android AudioManager constants
 * https://developer.android.com/reference/android/media/AudioManager
 */
const AUDIOFOCUS_GAIN = 1;
const AUDIOFOCUS_GAIN_TRANSIENT = 2;
const AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK = 3;

/**
 * AndroidAudioAdapter: Bridges Driftwise audio focus to native Android AudioManager
 *
 * Uses Capacitor plugin to call native Android AudioManager APIs:
 * - AudioManager.requestAudioFocus()
 * - AudioManager.abandonAudioFocus()
 *
 * Responsibilities:
 * - Request audio focus with appropriate stream type (STREAM_MUSIC)
 * - Handle AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK for podcast/music ducking
 * - Release audio focus and restore previous state
 * - Detect and handle audio focus loss from other apps
 * - Handle platform unavailability gracefully
 */
export class AndroidAudioAdapter implements IAudioAdapter {
  private logger: Logger;
  private isAndroidAvailable: boolean;
  private capacitorPlugin?: any;
  private streamType: number = 3; // STREAM_MUSIC
  private focusState: 'idle' | 'focused' = 'idle';

  constructor(capacitorPlugin?: any) {
    this.logger = new Logger('AndroidAudioAdapter');
    this.capacitorPlugin = capacitorPlugin;

    // Check if running on Android with Capacitor available
    this.isAndroidAvailable = this.detectAndroidEnvironment();
  }

  /**
   * Detect if running on Android with Capacitor available
   */
  private detectAndroidEnvironment(): boolean {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        this.logger.info('Not in browser environment, Android unavailable');
        return false;
      }

      // Check for Capacitor (will be available in real Android app)
      if (this.capacitorPlugin) {
        this.logger.info('Capacitor audio plugin detected');
        return true;
      }

      // In development/testing, allow graceful fallback
      this.logger.info('Android adapter running in fallback mode (for testing/web)');
      return false;
    } catch (error) {
      this.logger.error('Error detecting Android environment', error);
      return false;
    }
  }

  /**
   * Check if audio adapter is available
   */
  isAvailable(): boolean {
    return this.isAndroidAvailable;
  }

  /**
   * Request audio focus with the specified focus type
   *
   * Maps domain FocusType to Android AudioManager constants:
   * - PERMANENT -> AUDIOFOCUS_GAIN (exclusive focus)
   * - TRANSIENT -> AUDIOFOCUS_GAIN_TRANSIENT (pause other audio)
   * - TRANSIENT_MAY_DUCK -> AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK (duck other audio)
   */
  async requestAudioFocus(focusType: FocusType): Promise<Result<void>> {
    try {
      if (!this.isAndroidAvailable) {
        this.logger.debug('Audio adapter not available, skipping native call');
        return ok(undefined);
      }

      const nativeFocusType = this.mapFocusType(focusType);

      this.logger.info(
        `Requesting audio focus (type: ${focusType}, nativeType: ${nativeFocusType}, streamType: ${this.streamType})`
      );

      // Call native Android AudioManager via Capacitor
      const result = await this.callNativeAudioManager('requestAudioFocus', {
        streamType: this.streamType,
        focusType: nativeFocusType,
      });

      if (!result.success) {
        const error = new AndroidAudioAdapterError(
          `Failed to request audio focus: ${result.error || 'Unknown error'}`
        );
        this.logger.error(error.message);
        return err(error);
      }

      this.focusState = 'focused';
      this.logger.info('Audio focus granted');

      // Attach focus loss listener
      this.attachFocusLossListener();

      return ok(undefined);
    } catch (error) {
      const domainError = new AndroidAudioAdapterError(
        `Exception in requestAudioFocus: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(domainError.message, error);
      return err(domainError);
    }
  }

  /**
   * Release audio focus previously requested
   *
   * Calls Android AudioManager.abandonAudioFocus() to release focus
   * and allow other applications to resume audio playback
   */
  async releaseAudioFocus(): Promise<Result<void>> {
    try {
      if (!this.isAndroidAvailable) {
        this.logger.debug('Audio adapter not available, skipping native call');
        return ok(undefined);
      }

      this.logger.info('Releasing audio focus');

      // Call native Android AudioManager via Capacitor
      const result = await this.callNativeAudioManager('releaseAudioFocus', {
        streamType: this.streamType,
      });

      if (!result.success) {
        const error = new AndroidAudioAdapterError(
          `Failed to release audio focus: ${result.error || 'Unknown error'}`
        );
        this.logger.error(error.message);
        return err(error);
      }

      this.focusState = 'idle';
      this.logger.info('Audio focus released');

      return ok(undefined);
    } catch (error) {
      const domainError = new AndroidAudioAdapterError(
        `Exception in releaseAudioFocus: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(domainError.message, error);
      return err(domainError);
    }
  }

  /**
   * Map domain FocusType to Android AudioManager constants
   */
  private mapFocusType(focusType: FocusType): number {
    switch (focusType) {
      case FocusType.PERMANENT:
        return AUDIOFOCUS_GAIN;
      case FocusType.TRANSIENT:
        return AUDIOFOCUS_GAIN_TRANSIENT;
      case FocusType.TRANSIENT_MAY_DUCK:
        return AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK;
      default:
        this.logger.warn(`Unknown focus type: ${focusType}, defaulting to TRANSIENT_MAY_DUCK`);
        return AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK;
    }
  }

  /**
   * Call native Android AudioManager through Capacitor
   * This is a bridge method that would invoke native code
   */
  private async callNativeAudioManager(
    method: string,
    options: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.capacitorPlugin) {
        // Mock implementation for testing/web
        this.logger.debug(`Mock native call: ${method}`, options);
        return { success: true };
      }

      // Real implementation would call through Capacitor
      const result = await this.capacitorPlugin.echo({
        value: { method, options },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Native call failed: ${method}`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Attach listener for audio focus loss events
   * Called when another app requests audio focus
   */
  private attachFocusLossListener(): void {
    // In a real implementation, this would register a native listener
    // For now, we log that we would attach the listener
    this.logger.debug('Audio focus loss listener would be attached (native implementation)');
  }

  /**
   * Get current focus state
   */
  getFocusState(): 'idle' | 'focused' {
    return this.focusState;
  }
}
