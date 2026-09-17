import type { ClockPort, IdPort } from '@somnus/domain';

export const systemClock: ClockPort = {
  now: () => Date.now(),
  /**
   * A Night is dated by the evening it began, in the device's own timezone —
   * so a session starting at 00:30 belongs to the previous day's entry, which
   * is how the user thinks about it and how the journal is keyed.
   */
  nightDate: () => {
    const d = new Date();
    if (d.getHours() < 12) d.setDate(d.getDate() - 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  timezoneOffsetMinutes: () => new Date().getTimezoneOffset(),
};

export const browserIds: IdPort = {
  newId: () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
};
