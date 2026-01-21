import { AudioManagementService, IAudioAdapter } from '@domains/audio/AudioManagementService';
import { FocusType } from '@domains/audio/FocusType';
import { AudioFocus } from '@domains/audio/AudioFocus';
import { Result, ok, err } from '@shared/types/Result';
import { AudioFocusError, InvalidAudioFocusState } from '@shared/errors/DomainError';

/**
 * Mock audio adapter for testing
 */
class MockAudioAdapter implements IAudioAdapter {
  private requestCalls: FocusType[] = [];
  private releaseCalls: number = 0;
  private shouldFailRequest = false;
  private shouldFailRelease = false;
  private available = true;

  async requestAudioFocus(focusType: FocusType): Promise<Result<void>> {
    this.requestCalls.push(focusType);
    if (this.shouldFailRequest) {
      return err(new Error('Mock adapter: request failed'));
    }
    return ok(undefined);
  }

  async releaseAudioFocus(): Promise<Result<void>> {
    this.releaseCalls++;
    if (this.shouldFailRelease) {
      return err(new Error('Mock adapter: release failed'));
    }
    return ok(undefined);
  }

  isAvailable(): boolean {
    return this.available;
  }

  getRequestCalls(): FocusType[] {
    return [...this.requestCalls];
  }

  getReleaseCalls(): number {
    return this.releaseCalls;
  }

  setRequestFailure(shouldFail: boolean): void {
    this.shouldFailRequest = shouldFail;
  }

  setReleaseFailure(shouldFail: boolean): void {
    this.shouldFailRelease = shouldFail;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }
}

describe('AudioManagementService', () => {
  let service: AudioManagementService;
  let adapter: MockAudioAdapter;

  beforeEach(() => {
    adapter = new MockAudioAdapter();
    service = new AudioManagementService(adapter);
  });

  describe('Focus Request', () => {
    it('should request audio focus successfully', async () => {
      const result = await service.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);

      expect(result.isOk()).toBe(true);
      const focus = result._unsafeUnwrap();
      expect(focus).toBeInstanceOf(AudioFocus);
      expect(focus.isActive()).toBe(true);
      expect(focus.allowsDucking()).toBe(true);
    });

    it('should use default TRANSIENT_MAY_DUCK focus type', async () => {
      const result = await service.requestAudioFocus();

      expect(result.isOk()).toBe(true);
      const focus = result._unsafeUnwrap();
      expect(focus.allowsDucking()).toBe(true);
    });

    it('should request permanent focus', async () => {
      const result = await service.requestAudioFocus(FocusType.PERMANENT);

      expect(result.isOk()).toBe(true);
      const focus = result._unsafeUnwrap();
      expect(focus.isPermanent()).toBe(true);
    });

    it('should call adapter with correct focus type', async () => {
      await service.requestAudioFocus(FocusType.TRANSIENT);

      expect(adapter.getRequestCalls()).toContain(FocusType.TRANSIENT);
    });

    it('should return active focus on success', async () => {
      const result = await service.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);

      expect(result.isOk()).toBe(true);
      const focus = result._unsafeUnwrap();
      expect(service.getActiveFocus()).toBe(focus);
    });
  });

  describe('Focus Release', () => {
    it('should release audio focus successfully', async () => {
      const requestResult = await service.requestAudioFocus(FocusType.TRANSIENT);
      const focus = requestResult._unsafeUnwrap();

      const releaseResult = await service.releaseAudioFocus(focus);

      expect(releaseResult.isOk()).toBe(true);
      expect(focus.isActive()).toBe(false);
      expect(adapter.getReleaseCalls()).toBe(1);
    });

    it('should fail when releasing inactive focus', async () => {
      const focus = new AudioFocus(FocusType.TRANSIENT);

      const result = await service.releaseAudioFocus(focus);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(AudioFocusError);
    });

    it('should clear active focus on release', async () => {
      const requestResult = await service.requestAudioFocus(FocusType.TRANSIENT);
      const focus = requestResult._unsafeUnwrap();

      await service.releaseAudioFocus(focus);

      expect(service.getActiveFocus()).toBeUndefined();
    });
  });

  describe('Domain Invariants - Permanent Focus', () => {
    it('should enforce only one permanent focus', async () => {
      // Request first permanent focus
      const firstResult = await service.requestAudioFocus(FocusType.PERMANENT);
      expect(firstResult.isOk()).toBe(true);

      // Attempt second permanent focus
      const secondResult = await service.requestAudioFocus(FocusType.PERMANENT);
      expect(secondResult.isErr()).toBe(true);
      expect(secondResult._unsafeUnwrapErr()).toBeInstanceOf(InvalidAudioFocusState);
    });

    it('should allow permanent focus after previous is released', async () => {
      // Request and release first permanent focus
      const firstResult = await service.requestAudioFocus(FocusType.PERMANENT);
      const firstFocus = firstResult._unsafeUnwrap();
      await service.releaseAudioFocus(firstFocus);

      // Now second permanent focus should succeed
      const secondResult = await service.requestAudioFocus(FocusType.PERMANENT);
      expect(secondResult.isOk()).toBe(true);
    });

    it('should allow multiple transient focuses', async () => {
      const first = (await service.requestAudioFocus(FocusType.TRANSIENT))._unsafeUnwrap();
      const second = (await service.requestAudioFocus(FocusType.TRANSIENT))._unsafeUnwrap();

      expect(first.isActive()).toBe(true);
      expect(second.isActive()).toBe(true);
    });
  });

  describe('Adapter Failures', () => {
    it('should handle adapter request failure gracefully', async () => {
      adapter.setRequestFailure(true);

      const result = await service.requestAudioFocus(FocusType.TRANSIENT);

      // Should still succeed at service level (graceful degradation)
      expect(result.isOk()).toBe(true);
    });

    it('should handle adapter release failure gracefully', async () => {
      const focus = (await service.requestAudioFocus(FocusType.TRANSIENT))._unsafeUnwrap();
      adapter.setReleaseFailure(true);

      const result = await service.releaseAudioFocus(focus);

      // Should still succeed at service level
      expect(result.isOk()).toBe(true);
      expect(focus.isActive()).toBe(false);
    });

    it('should handle unavailable adapter gracefully', async () => {
      adapter.setAvailable(false);

      const result = await service.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);

      expect(result.isOk()).toBe(true);
      const focus = result._unsafeUnwrap();
      expect(focus.isActive()).toBe(true);
    });
  });

  describe('State Tracking', () => {
    it('should track active focus', async () => {
      expect(service.getActiveFocus()).toBeUndefined();

      const result = await service.requestAudioFocus(FocusType.TRANSIENT);
      const focus = result._unsafeUnwrap();

      expect(service.getActiveFocus()).toBe(focus);
    });

    it('should track permanent focus state', async () => {
      expect(service.hasPermanentFocus()).toBe(false);

      const result = await service.requestAudioFocus(FocusType.PERMANENT);
      const focus = result._unsafeUnwrap();

      expect(service.hasPermanentFocus()).toBe(true);

      await service.releaseAudioFocus(focus);
      expect(service.hasPermanentFocus()).toBe(false);
    });

    it('should not affect permanent tracking with transient focus', async () => {
      await service.requestAudioFocus(FocusType.TRANSIENT);

      expect(service.hasPermanentFocus()).toBe(false);
    });
  });

  describe('Complete Lifecycle', () => {
    it('should handle full request/release cycle', async () => {
      const requestResult = await service.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      expect(requestResult.isOk()).toBe(true);
      const focus = requestResult._unsafeUnwrap();
      expect(focus.isActive()).toBe(true);

      const releaseResult = await service.releaseAudioFocus(focus);
      expect(releaseResult.isOk()).toBe(true);
      expect(focus.isActive()).toBe(false);
      expect(service.getActiveFocus()).toBeUndefined();
    });

    it('should handle multiple sequential cycles', async () => {
      for (let i = 0; i < 3; i++) {
        const requestResult = await service.requestAudioFocus(FocusType.TRANSIENT);
        const focus = requestResult._unsafeUnwrap();
        expect(focus.isActive()).toBe(true);

        const releaseResult = await service.releaseAudioFocus(focus);
        expect(releaseResult.isOk()).toBe(true);
        expect(focus.isActive()).toBe(false);
      }

      expect(service.getActiveFocus()).toBeUndefined();
    });
  });
});
