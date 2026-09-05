/** Time, as a port, so scheduling tests are not at the mercy of the wall clock. */
export interface Clock {
  now(): Date
}

export const systemClock: Clock = { now: () => new Date() }

export const fixedClock = (start: Date): Clock & { advanceDays(days: number): void } => {
  let current = new Date(start)
  return {
    now: () => new Date(current),
    advanceDays: (days) => {
      current = new Date(current.getTime() + days * 86_400_000)
    },
  }
}
