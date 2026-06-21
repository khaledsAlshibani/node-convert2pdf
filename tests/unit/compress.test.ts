import { describe, expect, it } from 'vitest';

import { getResolutionForLevel } from '../../src/compress.js';

describe('getResolutionForLevel', () => {
  it('maps compression levels to ghostscript presets', () => {
    expect(getResolutionForLevel('screen')).toBe('screen');
    expect(getResolutionForLevel('ebook')).toBe('ebook');
    expect(getResolutionForLevel('printer')).toBe('printer');
    expect(getResolutionForLevel('prepress')).toBe('prepress');
  });

  it('returns undefined for none', () => {
    expect(getResolutionForLevel('none')).toBeUndefined();
  });
});
