/**
 * The only place in the codebase permitted to call `new Date()` (ADR-0001).
 *
 * Everything else takes a `Clock`, which is what keeps the domain and the
 * application layer deterministic under test.
 */

import type { Clock } from '../../application/ports';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** A fixed clock, for tests and for replaying a bulletin at a known instant. */
export class FixedClock implements Clock {
  private readonly instant: Date;

  constructor(instant: Date) {
    this.instant = instant;
  }

  now(): Date {
    return new Date(this.instant.getTime());
  }
}
