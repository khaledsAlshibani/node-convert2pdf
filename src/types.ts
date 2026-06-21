import type { Resolution } from 'compress-pdf';

import type { InputKind } from './utils/paths.js';

export type CompressionLevel = 'none' | 'screen' | 'ebook' | 'printer' | 'prepress';

export type CompressionLevelInfo = {
  value: CompressionLevel;
  label: string;
  description: string;
  dpi: string;
  resolution?: Resolution;
};

export const COMPRESSION_LEVELS: CompressionLevelInfo[] = [
  {
    value: 'none',
    label: 'None',
    description: 'Keep original PDF quality — no compression',
    dpi: '—',
  },
  {
    value: 'screen',
    label: 'Screen',
    description: 'Smallest file size — best for web and email',
    dpi: '72 dpi',
    resolution: 'screen',
  },
  {
    value: 'ebook',
    label: 'eBook',
    description: 'Balanced quality and size — recommended',
    dpi: '150 dpi',
    resolution: 'ebook',
  },
  {
    value: 'printer',
    label: 'Printer',
    description: 'High quality — suitable for printing',
    dpi: '300 dpi',
    resolution: 'printer',
  },
  {
    value: 'prepress',
    label: 'Prepress',
    description: 'Highest quality — professional print workflows',
    dpi: '300 dpi',
    resolution: 'prepress',
  },
];

export type ConversionOptions = {
  inputPath: string;
  outputPath: string;
  compressionLevel: CompressionLevel;
  inputKind: InputKind;
  /** Skip terminal UI output. Use when importing as a library. */
  silent?: boolean;
  /** Receive progress updates for custom UIs (web apps, Electron, etc.). */
  onProgress?: (event: ProgressEvent) => void;
};

export type ProgressStep = 'convert' | 'compress';

export type ProgressEvent =
  | {
      type: 'start';
      step: ProgressStep;
      message: string;
      inputPath: string;
      inputSize?: number;
    }
  | {
      type: 'stage';
      step: ProgressStep;
      message: string;
      elapsedMs: number;
      detail?: string;
    }
  | {
      type: 'complete';
      step: ProgressStep;
      message: string;
      elapsedMs: number;
    };

export type ConversionResult = {
  inputPath: string;
  outputPath: string;
  inputKind: InputKind;
  compressionLevel: CompressionLevel;
  originalPdfSize: number;
  finalSize: number;
  durationMs: number;
  converted: boolean;
  compressed: boolean;
};
