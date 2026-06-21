import { describe, expect, it } from 'vitest';

import {
  formatBytes,
  formatDuration,
  formatPercent,
} from '../../src/utils/format.js';

describe('formatBytes', () => {
  it('formats common sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(32 * 1024 * 1024)).toBe('32.0 MB');
  });
});

describe('formatPercent', () => {
  it('clamps and rounds saved percentage', () => {
    expect(formatPercent(0.63)).toBe('63%');
    expect(formatPercent(1.5)).toBe('100%');
    expect(formatPercent(-0.1)).toBe('0%');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds and seconds', () => {
    expect(formatDuration(450)).toBe('450ms');
    expect(formatDuration(2500)).toBe('2.5s');
  });
});
