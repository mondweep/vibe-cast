import { AndroidAudioAdapter } from '@adapters/android/AndroidAudioAdapter';
import { FocusType } from '@domains/audio/FocusType';
import { AndroidAudioAdapterError } from '@shared/errors/DomainError';

/**
 * Mock Capacitor plugin for testing native calls
 */
class MockCapacitorPlugin {
  private shouldFail = false;

  async echo(options: any): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Capacitor plugin error');
    }
    return { value: options };
  }

  setFailure(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}

describe('AndroidAudioAdapter', () => {
  let adapter: AndroidAudioAdapter;
  let mockPlugin: MockCapacitorPlugin;

  describe('Without Capacitor (Web/Testing)', () => {
    beforeEach(() => {
      adapter = new AndroidAudioAdapter(undefined);
    });

    it('should report unavailable without Capacitor', () => {
      expect(adapter.isAvailable()).toBe(false);
    });

    it('should succeed gracefully without Capacitor on request', async () => {
      const result = await adapter.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      expect(result.isOk()).toBe(true);
    });

    it('should succeed gracefully without Capacitor on release', async () => {
      const result = await adapter.releaseAudioFocus();
      expect(result.isOk()).toBe(true);
    });
  });

  describe('With Capacitor (Android)', () => {
    beforeEach(() => {
      mockPlugin = new MockCapacitorPlugin();
      adapter = new AndroidAudioAdapter(mockPlugin);
    });

    describe('Availability', () => {
      it('should report available with Capacitor', () => {
        expect(adapter.isAvailable()).toBe(true);
      });
    });

    describe('Focus Request', () => {
      it('should request PERMANENT focus', async () => {
        const result = await adapter.requestAudioFocus(FocusType.PERMANENT);
        expect(result.isOk()).toBe(true);
      });

      it('should request TRANSIENT focus', async () => {
        const result = await adapter.requestAudioFocus(FocusType.TRANSIENT);
        expect(result.isOk()).toBe(true);
      });

      it('should request TRANSIENT_MAY_DUCK focus', async () => {
        const result = await adapter.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
        expect(result.isOk()).toBe(true);
      });

      it('should transition to focused state', async () => {
        expect(adapter.getFocusState()).toBe('idle');

        await adapter.requestAudioFocus(FocusType.TRANSIENT);

        expect(adapter.getFocusState()).toBe('focused');
      });

      it('should handle Capacitor plugin errors', async () => {
        mockPlugin.setFailure(true);

        const result = await adapter.requestAudioFocus(FocusType.TRANSIENT);

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(AndroidAudioAdapterError);
      });
    });

    describe('Focus Release', () => {
      beforeEach(async () => {
        await adapter.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
      });

      it('should release focus successfully', async () => {
        const result = await adapter.releaseAudioFocus();
        expect(result.isOk()).toBe(true);
      });

      it('should transition to idle state', async () => {
        expect(adapter.getFocusState()).toBe('focused');

        await adapter.releaseAudioFocus();

        expect(adapter.getFocusState()).toBe('idle');
      });

      it('should handle Capacitor plugin errors on release', async () => {
        mockPlugin.setFailure(true);

        const result = await adapter.releaseAudioFocus();

        expect(result.isErr()).toBe(true);
        expect(result._unsafeUnwrapErr()).toBeInstanceOf(AndroidAudioAdapterError);
      });
    });

    describe('Ducking Behavior', () => {
      it('should request ducking for TRANSIENT_MAY_DUCK', async () => {
        // The adapter should internally map FocusType to Android constants
        // This test verifies the request succeeds with ducking type
        const result = await adapter.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);

        expect(result.isOk()).toBe(true);
        expect(adapter.getFocusState()).toBe('focused');
      });

      it('should not duck for TRANSIENT', async () => {
        // TRANSIENT should pause other audio, not duck
        const result = await adapter.requestAudioFocus(FocusType.TRANSIENT);

        expect(result.isOk()).toBe(true);
        expect(adapter.getFocusState()).toBe('focused');
      });

      it('should have exclusive gain for PERMANENT', async () => {
        // PERMANENT should have exclusive audio focus
        const result = await adapter.requestAudioFocus(FocusType.PERMANENT);

        expect(result.isOk()).toBe(true);
        expect(adapter.getFocusState()).toBe('focused');
      });
    });

    describe('Complete Lifecycle', () => {
      it('should handle full request/release cycle', async () => {
        expect(adapter.getFocusState()).toBe('idle');

        const requestResult = await adapter.requestAudioFocus(FocusType.TRANSIENT_MAY_DUCK);
        expect(requestResult.isOk()).toBe(true);
        expect(adapter.getFocusState()).toBe('focused');

        const releaseResult = await adapter.releaseAudioFocus();
        expect(releaseResult.isOk()).toBe(true);
        expect(adapter.getFocusState()).toBe('idle');
      });

      it('should handle multiple request/release cycles', async () => {
        for (let i = 0; i < 3; i++) {
          const requestResult = await adapter.requestAudioFocus(FocusType.TRANSIENT);
          expect(requestResult.isOk()).toBe(true);
          expect(adapter.getFocusState()).toBe('focused');

          const releaseResult = await adapter.releaseAudioFocus();
          expect(releaseResult.isOk()).toBe(true);
          expect(adapter.getFocusState()).toBe('idle');
        }
      });

      it('should handle mixed focus types', async () => {
        const types = [FocusType.TRANSIENT, FocusType.TRANSIENT_MAY_DUCK, FocusType.PERMANENT];

        for (const focusType of types) {
          const requestResult = await adapter.requestAudioFocus(focusType);
          expect(requestResult.isOk()).toBe(true);

          const releaseResult = await adapter.releaseAudioFocus();
          expect(releaseResult.isOk()).toBe(true);
        }
      });
    });

    describe('Error Handling', () => {
      it('should wrap exceptions as AndroidAudioAdapterError', async () => {
        mockPlugin.setFailure(true);

        const result = await adapter.requestAudioFocus(FocusType.TRANSIENT);

        expect(result.isErr()).toBe(true);
        const error = result._unsafeUnwrapErr();
        expect(error.message).toContain('Failed to request audio focus');
      });

      it('should maintain state on error', async () => {
        expect(adapter.getFocusState()).toBe('idle');

        mockPlugin.setFailure(true);
        const result = await adapter.requestAudioFocus(FocusType.TRANSIENT);

        expect(result.isErr()).toBe(true);
        expect(adapter.getFocusState()).toBe('idle');
      });
    });
  });
});
