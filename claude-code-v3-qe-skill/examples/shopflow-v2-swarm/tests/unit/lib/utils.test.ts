/**
 * Utility Functions Unit Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  slugify,
  truncate,
  randomString,
  debounce,
  safeJsonParse,
  groupBy,
} from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('should merge Tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(29.99)).toBe('$29.99');
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('should handle other currencies', () => {
      expect(formatCurrency(29.99, 'EUR')).toContain('29.99');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should accept string dates', () => {
      const formatted = formatDate('2024-06-01');
      expect(formatted).toContain('Jun');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for recent times', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should return minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('5 minutes ago');
    });

    it('should return hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('3 hours ago');
    });

    it('should return days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(date)).toBe('2 days ago');
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short text', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('randomString', () => {
    it('should generate string of correct length', () => {
      expect(randomString(10)).toHaveLength(10);
      expect(randomString(5)).toHaveLength(5);
    });

    it('should generate alphanumeric characters', () => {
      const str = randomString(100);
      expect(str).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should generate unique strings', () => {
      const str1 = randomString(20);
      const str2 = randomString(20);
      expect(str1).not.toBe(str2);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      expect(safeJsonParse('{"foo": "bar"}', {})).toEqual({ foo: 'bar' });
    });

    it('should return fallback for invalid JSON', () => {
      expect(safeJsonParse('invalid', { default: true })).toEqual({ default: true });
    });
  });

  describe('groupBy', () => {
    it('should group items by key', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ];

      const grouped = groupBy(items, (item) => item.category);

      expect(grouped).toEqual({
        A: [
          { category: 'A', value: 1 },
          { category: 'A', value: 3 },
        ],
        B: [{ category: 'B', value: 2 }],
      });
    });
  });
});
