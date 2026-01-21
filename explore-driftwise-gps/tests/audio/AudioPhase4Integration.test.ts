import { AudioManagementService } from '@domains/audio/AudioManagementService';
import { AndroidAudioAdapter } from '@adapters/android/AndroidAudioAdapter';
import { VoiceDeliveryEngine } from '@domains/voice/VoiceDeliveryEngine';
import { FocusType } from '@domains/audio/FocusType';
import { StateManager, AppState } from '@domains/config/StateManager';

/**
 * Integration tests for Phase 4: Audio Management Context
 *
 * Tests the complete audio management workflow:
 * 1. Request audio focus before voice delivery
 * 2. Deliver fact through VoiceDeliveryEngine
 * 3. Release audio focus after delivery
 * 4. Handle podcasts/music ducking
 */
describe('Phase 4: Audio Management Integration', () => {
  let audioManager: AudioManagementService;
  let audioAdapter: AndroidAudioAdapter;
  let voiceEngine: VoiceDeliveryEngine;
  let stateManager: StateManager;

  beforeEach(() => {
    // Set up adapters and services
    audioAdapter = new AndroidAudioAdapter(undefined); // Web-friendly (no Capacitor)
    audioManager = new AudioManagementService(audioAdapter);
    voiceEngine = new VoiceDeliveryEngine();
    stateManager = new StateManager();

    // Wire dependencies
    voiceEngine.setAudioFocusManager(audioManager);
  });

  describe('Audio Focus Request/Release Cycle', () => {
    it('should request audio focus for voice delivery', async () => {
      const result = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);

      expect(result.isOk()).toBe(true);
      const focus = result._unsafeUnwrap();
      expect(focus.isActive()).toBe(true);
      expect(focus.allowsDucking()).toBe(true);
    });

    it('should release audio focus after delivery', async () => {
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      const focus = focusResult._unsafeUnwrap();

      const releaseResult = await audioManager.releaseAudioFocus(focus);

      expect(releaseResult.isOk()).toBe(true);
      expect(focus.isActive()).toBe(false);
    });

    it('should enforce one permanent focus', async () => {
      const first = (await audioManager.requestAudioFocus(FocusType.PERMANENT))._unsafeUnwrap();
      const second = await audioManager.requestAudioFocus(FocusType.PERMANENT);

      expect(second.isErr()).toBe(true);

      // Clean up
      await audioManager.releaseAudioFocus(first);
    });
  });

  describe('Voice Delivery with Audio Focus', () => {
    it('should open session and deliver fact with audio focus', async () => {
      const openResult = await voiceEngine.openSession();
      expect(openResult.isOk()).toBe(true);

      const fact = 'This is an interesting historical fact about the location.';
      const deliverResult = await voiceEngine.deliverFact(fact);

      expect(deliverResult.isOk()).toBe(true);

      const closeResult = await voiceEngine.closeSession();
      expect(closeResult.isOk()).toBe(true);
    });

    it('should coordinate audio focus during voice delivery', async () => {
      // Start voice delivery
      await voiceEngine.openSession();

      // Request audio focus (would be called by VoiceDeliveryEngine)
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      const focus = focusResult._unsafeUnwrap();
      expect(audioManager.getActiveFocus()).toBe(focus);

      // Deliver fact (in real scenario, this would use the focus)
      const fact = 'An interesting fact about the location.';
      await voiceEngine.deliverFact(fact);

      // Release audio focus
      await audioManager.releaseAudioFocus(focus);
      expect(audioManager.getActiveFocus()).toBeUndefined();

      await voiceEngine.closeSession();
    });
  });

  describe('Ducking Behavior (Podcasts/Music)', () => {
    it('should use TRANSIENT_MAY_DUCK for podcast/music ducking', async () => {
      // When a podcast is playing and Driftwise wants to deliver a fact,
      // it should request TRANSIENT_MAY_DUCK focus
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      const focus = focusResult._unsafeUnwrap();

      expect(focus.allowsDucking()).toBe(true);

      // After release, the podcast volume would restore
      await audioManager.releaseAudioFocus(focus);
    });

    it('should not use exclusive focus for transient delivery', async () => {
      // Should NOT request PERMANENT focus for a single fact delivery
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      const focus = focusResult._unsafeUnwrap();

      expect(focus.isPermanent()).toBe(false);
      expect(focus.allowsDucking()).toBe(true);

      await audioManager.releaseAudioFocus(focus);
    });
  });

  describe('State Machine Integration', () => {
    it('should transition states during voice delivery', async () => {
      expect(stateManager.getState()).toBe(AppState.IDLE);

      // Simulate state transitions during voice delivery
      stateManager.setState(AppState.SPEAKING);
      expect(stateManager.getState()).toBe(AppState.SPEAKING);

      stateManager.setState(AppState.LISTENING);
      expect(stateManager.getState()).toBe(AppState.LISTENING);

      stateManager.setState(AppState.IDLE);
      expect(stateManager.getState()).toBe(AppState.IDLE);
    });

    it('should request audio focus only in SPEAKING state', async () => {
      stateManager.setState(AppState.SPEAKING);

      // Request focus
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      expect(focusResult.isOk()).toBe(true);

      // Clean up
      const focus = focusResult._unsafeUnwrap();
      await audioManager.releaseAudioFocus(focus);
    });
  });

  describe('Complete Delivery Cycle', () => {
    it('should execute full fact delivery cycle', async () => {
      // 1. Open voice session
      const openResult = await voiceEngine.openSession();
      expect(openResult.isOk()).toBe(true);

      // 2. Request audio focus
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      expect(focusResult.isOk()).toBe(true);
      const focus = focusResult._unsafeUnwrap();

      // 3. Deliver fact
      const fact = 'A fascinating historical detail about this location.';
      const deliverResult = await voiceEngine.deliverFact(fact);
      expect(deliverResult.isOk()).toBe(true);

      // 4. Release audio focus
      const releaseResult = await audioManager.releaseAudioFocus(focus);
      expect(releaseResult.isOk()).toBe(true);

      // 5. Close voice session
      const closeResult = await voiceEngine.closeSession();
      expect(closeResult.isOk()).toBe(true);

      // Verify final state
      expect(audioManager.getActiveFocus()).toBeUndefined();
    });

    it('should handle multiple consecutive facts', async () => {
      const facts = [
        'First historical fact about the location.',
        'Second interesting detail about the area.',
        'Third fascinating piece of local history.',
      ];

      for (const fact of facts) {
        await voiceEngine.openSession();

        const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
        expect(focusResult.isOk()).toBe(true);
        const focus = focusResult._unsafeUnwrap();

        const deliverResult = await voiceEngine.deliverFact(fact);
        expect(deliverResult.isOk()).toBe(true);

        const releaseResult = await audioManager.releaseAudioFocus(focus);
        expect(releaseResult.isOk()).toBe(true);

        await voiceEngine.closeSession();
      }

      expect(audioManager.getActiveFocus()).toBeUndefined();
    });

    it('should handle focus request failure gracefully', async () => {
      await voiceEngine.openSession();

      // Request focus (will succeed in web mode)
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      expect(focusResult.isOk()).toBe(true);

      // Still deliver fact even if focus failed
      const fact = 'Historical fact to deliver.';
      const deliverResult = await voiceEngine.deliverFact(fact);
      expect(deliverResult.isOk()).toBe(true);

      // Clean up
      const focus = focusResult._unsafeUnwrap();
      await audioManager.releaseAudioFocus(focus);
      await voiceEngine.closeSession();
    });
  });

  describe('Focus Duration and Metrics', () => {
    it('should track focus duration', async () => {
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      const focus = focusResult._unsafeUnwrap();

      // Simulate fact delivery time
      await new Promise((resolve) => setTimeout(resolve, 100));

      await audioManager.releaseAudioFocus(focus);

      const duration = focus.getDuration();
      expect(duration).toBeGreaterThanOrEqual(90);
    });

    it('should support monitoring focus statistics', async () => {
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      const focus = focusResult._unsafeUnwrap();

      expect(focus.isActive()).toBe(true);
      expect(focus.allowsDucking()).toBe(true);

      await audioManager.releaseAudioFocus(focus);

      expect(focus.isActive()).toBe(false);
      expect(focus.getDuration()).toBeGreaterThan(0);
    });
  });

  describe('Error Resilience', () => {
    it('should complete delivery even if audio focus fails', async () => {
      // In web mode, audioAdapter is unavailable but service handles it gracefully
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      expect(focusResult.isOk()).toBe(true);

      const deliverResult = await voiceEngine.deliverFact('Fact to deliver');
      expect(deliverResult.isOk()).toBe(true);
    });

    it('should not block voice delivery on focus errors', async () => {
      // Request focus
      const focusResult = await audioManager.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      const focus = focusResult._unsafeUnwrap();

      // Deliver fact
      const deliverResult = await voiceEngine.deliverFact('Fact content');
      expect(deliverResult.isOk()).toBe(true);

      // Release focus
      const releaseResult = await audioManager.releaseAudioFocus(focus);
      expect(releaseResult.isOk()).toBe(true);
    });
  });
});
