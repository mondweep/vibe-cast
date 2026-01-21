import { AudioFocus } from '@domains/audio/AudioFocus';
import { FocusType } from '@domains/audio/FocusType';
import { InvalidAudioFocusState } from '@shared/errors/DomainError';

describe('AudioFocus Aggregate Root', () => {
  describe('Creation', () => {
    it('should create audio focus with specified type', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      expect(focus.getType()).toBe(FocusType.TRANSIENT_MAY_DUCK);
    });

    it('should start in inactive state', () => {
      const focus = new AudioFocus(FocusType.PERMANENT);
      expect(focus.isActive()).toBe(false);
    });
  });

  describe('Request Lifecycle', () => {
    it('should transition to active when requested', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT);
      focus.request();
      expect(focus.isActive()).toBe(true);
    });

    it('should throw when requesting already held focus', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT);
      focus.request();
      expect(() => focus.request()).toThrow(InvalidAudioFocusState);
    });

    it('should transition to inactive when released', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT);
      focus.request();
      focus.release();
      expect(focus.isActive()).toBe(false);
    });

    it('should throw when releasing inactive focus', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT);
      expect(() => focus.release()).toThrow(InvalidAudioFocusState);
    });
  });

  describe('Focus Type Predicates', () => {
    it('should identify permanent focus', () => {
      const focus = new AudioFocus(FocusType.PERMANENT);
      expect(focus.isPermanent()).toBe(true);
      expect(focus.isTransient()).toBe(false);
      expect(focus.allowsDucking()).toBe(false);
    });

    it('should identify transient focus', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT);
      expect(focus.isPermanent()).toBe(false);
      expect(focus.isTransient()).toBe(true);
      expect(focus.allowsDucking()).toBe(false);
    });

    it('should identify transient with ducking focus', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      expect(focus.isPermanent()).toBe(false);
      expect(focus.isTransient()).toBe(false);
      expect(focus.allowsDucking()).toBe(true);
    });
  });

  describe('Duration Tracking', () => {
    it('should calculate duration from creation to release', (done) => {
      const focus = new AudioFocus(FocusType.TRANSIENT);
      const before = Date.now();
      focus.request();

      setTimeout(() => {
        focus.release();
        const duration = focus.getDuration();

        expect(duration).toBeGreaterThanOrEqual(40);
        expect(duration).toBeLessThanOrEqual(100);
        done();
      }, 50);
    });

    it('should return elapsed time for active focus', (done) => {
      const focus = new AudioFocus(FocusType.TRANSIENT);
      focus.request();

      setTimeout(() => {
        const duration = focus.getDuration();
        expect(duration).toBeGreaterThanOrEqual(40);
        done();
      }, 50);
    });
  });

  describe('Domain Invariants', () => {
    it('should enforce single active request per focus', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT);
      focus.request();
      expect(() => focus.request()).toThrow();
    });

    it('should prevent release without request', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT);
      expect(() => focus.release()).toThrow();
    });

    it('should support multiple request/release cycles', () => {
      const focus = new AudioFocus(FocusType.TRANSIENT);

      focus.request();
      expect(focus.isActive()).toBe(true);

      focus.release();
      expect(focus.isActive()).toBe(false);

      focus.request();
      expect(focus.isActive()).toBe(true);

      focus.release();
      expect(focus.isActive()).toBe(false);
    });
  });
});
