/**
 * Audio focus types as per Android AudioManager specification
 * https://developer.android.com/reference/android/media/AudioManager#audiofocus_types
 */
export enum FocusType {
  /**
   * Permanent audio focus: application needs audio focus and will not release it until explicitly released
   * Only one application can have permanent focus at a time
   */
  PERMANENT = 'PERMANENT',

  /**
   * Transient audio focus: application needs audio focus for a short time (e.g., notification)
   * Other applications' audio should be paused, but not ducked
   */
  TRANSIENT = 'TRANSIENT',

  /**
   * Transient with ducking: application needs audio focus for a short time
   * Other applications' audio should be ducked (volume reduced) rather than paused
   * This is ideal for voice applications like navigation or Driftwise
   */
  TRANSIENT_MAY_DUCK = 'TRANSIENT_MAY_DUCK',
}
