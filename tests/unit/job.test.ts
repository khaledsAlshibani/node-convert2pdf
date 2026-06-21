import { describe, expect, it } from 'vitest';

import { prepareConversionOptions } from '../../src/job.js';

describe('prepareConversionOptions', () => {
  it('prepares powerpoint conversion with default compression', () => {
    const options = prepareConversionOptions({
      inputPath: './slides.pptx',
    });

    expect(options).toEqual({
      inputPath: './slides.pptx',
      outputPath: './slides.pdf',
      compressionLevel: 'ebook',
      inputKind: 'powerpoint',
    });
  });

  it('auto-detects pdf compress mode', () => {
    const options = prepareConversionOptions({
      inputPath: './report.pdf',
      compressionLevel: 'screen',
    });

    expect(options.inputKind).toBe('pdf');
    expect(options.outputPath).toBe('./report-compressed.pdf');
    expect(options.compressionLevel).toBe('screen');
  });

  it('allows powerpoint convert-only', () => {
    const options = prepareConversionOptions({
      inputPath: './slides.pptx',
      noCompress: true,
    });

    expect(options.compressionLevel).toBe('none');
    expect(options.inputKind).toBe('powerpoint');
  });

  it('rejects unsupported extensions', () => {
    expect(() =>
      prepareConversionOptions({ inputPath: './file.docx' }),
    ).toThrow('Unsupported file type');
  });

  it('rejects compress-only for powerpoint files', () => {
    expect(() =>
      prepareConversionOptions({
        inputPath: './slides.pptx',
        compressOnly: true,
      }),
    ).toThrow('Compress-only mode requires a .pdf file');
  });

  it('rejects pdf without compression', () => {
    expect(() =>
      prepareConversionOptions({
        inputPath: './report.pdf',
        noCompress: true,
      }),
    ).toThrow('PDF inputs require compression');
  });
});
