import { describe, expect, it } from 'vitest';

import {
  defaultOutputPath,
  getInputKind,
  isPdfFile,
  isSupportedInputFile,
  isSupportedPowerPointFile,
  normalizeInputPath,
} from '../../src/utils/paths.js';

describe('normalizeInputPath', () => {
  it('trims whitespace and surrounding quotes', () => {
    expect(normalizeInputPath("  '/tmp/file.pptx'  ")).toBe('/tmp/file.pptx');
    expect(normalizeInputPath('"/tmp/file.pdf"')).toBe('/tmp/file.pdf');
  });

  it('removes embedded newlines from pasted paths', () => {
    expect(normalizeInputPath('/tmp/my\nfile.pptx')).toBe('/tmp/myfile.pptx');
  });
});

describe('getInputKind', () => {
  it('detects powerpoint and pdf extensions', () => {
    expect(getInputKind('slides.pptx')).toBe('powerpoint');
    expect(getInputKind('slides.PPT')).toBe('powerpoint');
    expect(getInputKind('report.pdf')).toBe('pdf');
    expect(getInputKind('notes.txt')).toBeNull();
  });

  it('handles quoted paths with unicode characters', () => {
    const path = "'/Users/khaled/محاضرات/file.pptx'";
    expect(getInputKind(path)).toBe('powerpoint');
    expect(isSupportedInputFile(path)).toBe(true);
  });
});

describe('defaultOutputPath', () => {
  it('replaces powerpoint extension with .pdf', () => {
    expect(defaultOutputPath('/tmp/slides.pptx')).toBe('/tmp/slides.pdf');
  });

  it('appends -compressed for pdf inputs', () => {
    expect(defaultOutputPath('/tmp/report.pdf')).toBe('/tmp/report-compressed.pdf');
  });
});

describe('type guards', () => {
  it('classifies supported file types', () => {
    expect(isSupportedPowerPointFile('a.pptx')).toBe(true);
    expect(isPdfFile('a.pdf')).toBe(true);
    expect(isSupportedPowerPointFile('a.pdf')).toBe(false);
  });
});
