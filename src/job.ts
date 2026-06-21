import type { CompressionLevel, ConversionOptions } from './types.js';
import {
  defaultOutputPath,
  getInputKind,
  normalizeInputPath,
  type InputKind,
} from './utils/paths.js';

export type PrepareConversionOptions = {
  inputPath: string;
  outputPath?: string;
  compressionLevel?: CompressionLevel;
  /** Force PDF compress-only mode. Auto-detected when input is `.pdf`. */
  compressOnly?: boolean;
  /** Skip compression for PowerPoint inputs. Not allowed for PDF inputs. */
  noCompress?: boolean;
};

export function prepareConversionOptions(
  options: PrepareConversionOptions,
): ConversionOptions {
  const inputPath = normalizeInputPath(options.inputPath);
  const detectedKind = getInputKind(inputPath);

  if (!detectedKind) {
    throw new Error('Unsupported file type. Use .pptx, .ppt, or .pdf files.');
  }

  const compressOnly = options.compressOnly ?? detectedKind === 'pdf';
  const inputKind: InputKind = compressOnly ? 'pdf' : detectedKind;

  if (compressOnly && detectedKind !== 'pdf') {
    throw new Error('Compress-only mode requires a .pdf file.');
  }

  let compressionLevel = options.compressionLevel ?? 'ebook';

  if (inputKind === 'pdf' && options.noCompress) {
    throw new Error(
      'PDF inputs require compression. Omit noCompress or choose a compression level.',
    );
  }

  if (inputKind === 'powerpoint' && options.noCompress) {
    compressionLevel = 'none';
  }

  if (inputKind === 'pdf' && compressionLevel === 'none') {
    throw new Error(
      'PDF compress mode requires a compression level. Choose screen, ebook, printer, or prepress.',
    );
  }

  return {
    inputPath,
    outputPath:
      options.outputPath ?? defaultOutputPath(inputPath, inputKind),
    compressionLevel,
    inputKind,
  };
}
