import type { WakeLockPort } from '@somnus/domain';

type SentinelLike = { release: () => Promise<void>; addEventListener: (t: string, f: () => void) => void };

/**
 * Screen Wake Lock (FR-C3).
 *
 * ADR-003 names this as the mitigation for the PWA's biggest weakness. It is
 * best-effort by nature: the OS can take the lock back, so acquisition
 * failure and mid-night loss are both reported rather than swallowed.
 */
export class BrowserWakeLock implements WakeLockPort {
  private sentinel: SentinelLike | null = null;
  private lost = false;

  get isHeld(): boolean {
    return this.sentinel !== null && !this.lost;
  }

  async acquire(): Promise<boolean> {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<SentinelLike> } };
    if (nav.wakeLock === undefined) return false;
    try {
      this.sentinel = await nav.wakeLock.request('screen');
      this.lost = false;
      this.sentinel.addEventListener('release', () => {
        this.lost = true;
      });
      return true;
    } catch {
      return false;
    }
  }

  async release(): Promise<void> {
    await this.sentinel?.release();
    this.sentinel = null;
  }
}
