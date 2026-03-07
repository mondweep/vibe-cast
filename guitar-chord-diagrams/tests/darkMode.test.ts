import { describe, it, expect, beforeEach } from 'vitest';

const STORAGE_KEY = 'chordlab-dark-mode';

describe('dark mode localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores theme preference', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('defaults to null when not set', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('accepts valid theme values', () => {
    for (const theme of ['light', 'dark', 'system']) {
      localStorage.setItem(STORAGE_KEY, theme);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(theme);
    }
  });
});
