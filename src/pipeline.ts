import { access, stat, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

import { compressPdfFile } from './compress.js';
import { convertPptxToPdf } from './convert.js';
import { runTaskWithProgress } from './task-runner.js';
import type { TaskContext } from './task-runner.js';
import type { ConversionOptions, ConversionResult } from './types.js';
import {
  infoLine,
  runWithLiveSpinner,
  stepLine,
  succeedSpinner,
} from './ui/progress.js';
import { formatBytes } from './utils/format.js';
import { checkGhostscript } from './utils/ghostscript.js';
import {
  getInputKind,
  normalizeInputPath,
  type InputKind,
} from './utils/paths.js';

const CONVERT_STAGES = [
  { afterMs: 0, text: 'Starting LibreOffice headless engine' },
  { afterMs: 3_000, text: 'Loading presentation and fonts' },
  { afterMs: 8_000, text: 'Rendering slides and layout' },
  { afterMs: 20_000, text: 'Writing PDF output' },
];

const COMPRESS_STAGES = [
  { afterMs: 0, text: 'Loading PDF into Ghostscript' },
  { afterMs: 2_000, text: 'Downsampling images and optimizing' },
  { afterMs: 8_000, text: 'Writing compressed output' },
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}

function createTempPdfPath(inputPath: string): string {
  const stamp = Date.now();
  const baseName = basename(inputPath, '.pptx').replace(/\.ppt$/i, '');
  return join(tmpdir(), `convert2pdf-${baseName}-${stamp}.pdf`);
}

async function ensureGhostscript(): Promise<string> {
  const ghostscript = await checkGhostscript();
  if (!ghostscript.ok) {
    throw new Error(
      `Ghostscript is not installed or could not be found. ${ghostscript.installHint}`,
    );
  }

  return ghostscript.path!;
}

function ensureCompressionEnabled(
  inputKind: InputKind,
  compressionLevel: ConversionOptions['compressionLevel'],
): void {
  if (inputKind === 'pdf' && compressionLevel === 'none') {
    throw new Error(
      'PDF compress mode requires a compression level. Choose screen, ebook, printer, or prepress.',
    );
  }
}

function getTaskContext(options: ConversionOptions): TaskContext {
  const context: TaskContext = {
    silent: options.silent ?? false,
  };

  if (options.onProgress) {
    context.onProgress = options.onProgress;
  }

  return context;
}

export async function runConversion(
  options: ConversionOptions,
): Promise<ConversionResult> {
  const startedAt = Date.now();
  const context = getTaskContext(options);
  ensureCompressionEnabled(options.inputKind, options.compressionLevel);

  const shouldCompress = options.compressionLevel !== 'none';
  const isCompressOnly = options.inputKind === 'pdf';

  if (isCompressOnly) {
    return runCompressOnly(options, startedAt, context);
  }

  const tempPdfPath = shouldCompress
    ? createTempPdfPath(options.inputPath)
    : options.outputPath;

  const ghostscriptPath = shouldCompress ? await ensureGhostscript() : undefined;
  const inputSize = await getFileSize(options.inputPath);

  if (!context.silent) {
    stepLine('Input', basename(options.inputPath));
    stepLine('Size', formatBytes(inputSize));
    stepLine('Mode', '.pptx/.ppt to PDF' + (shouldCompress ? ', then compress' : ''));
  }

  try {
    await runTaskWithProgress(
      context,
      {
        step: 'convert',
        title: 'Converting to PDF…',
        inputPath: options.inputPath,
        inputSize,
        stages: CONVERT_STAGES,
        detail: () => `${basename(options.inputPath)} (${formatBytes(inputSize)})`,
        runSpinner: async (task) => {
          const { spinner, result } = await runWithLiveSpinner(
            {
              title: 'Converting to PDF…',
              detail: () =>
                `${basename(options.inputPath)} (${formatBytes(inputSize)})`,
              stages: CONVERT_STAGES,
            },
            task,
          );
          const convertedSize = await getFileSize(tempPdfPath);
          succeedSpinner(
            spinner,
            `Converted ${basename(options.inputPath)} to PDF (${formatBytes(convertedSize)})`,
          );
          return result;
        },
        onSuccess: () =>
          `Converted ${basename(options.inputPath)} to PDF (${formatBytes(inputSize)})`,
      },
      () => convertPptxToPdf(options.inputPath, tempPdfPath),
    );
  } catch (error) {
    if (
      shouldCompress &&
      tempPdfPath !== options.outputPath &&
      (await fileExists(tempPdfPath))
    ) {
      await unlink(tempPdfPath).catch(() => undefined);
    }

    throw error;
  }

  const convertedSize = await getFileSize(tempPdfPath);

  if (!shouldCompress) {
    return {
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      inputKind: options.inputKind,
      compressionLevel: options.compressionLevel,
      originalPdfSize: convertedSize,
      finalSize: convertedSize,
      durationMs: Date.now() - startedAt,
      converted: true,
      compressed: false,
    };
  }

  try {
    const result = await runCompressionStep({
      context,
      inputPath: tempPdfPath,
      outputPath: options.outputPath,
      compressionLevel: options.compressionLevel,
      ghostscriptPath: ghostscriptPath!,
      label: basename(options.inputPath),
      originalSize: convertedSize,
    });

    return {
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      inputKind: options.inputKind,
      compressionLevel: options.compressionLevel,
      originalPdfSize: result.originalSize,
      finalSize: result.finalSize,
      durationMs: Date.now() - startedAt,
      converted: true,
      compressed: true,
    };
  } finally {
    if (tempPdfPath !== options.outputPath && (await fileExists(tempPdfPath))) {
      await unlink(tempPdfPath).catch(() => undefined);
    }
  }
}

async function runCompressOnly(
  options: ConversionOptions,
  startedAt: number,
  context: TaskContext,
): Promise<ConversionResult> {
  const ghostscriptPath = await ensureGhostscript();
  const inputSize = await getFileSize(options.inputPath);

  if (!context.silent) {
    stepLine('Input', basename(options.inputPath));
    stepLine('Size', formatBytes(inputSize));
    stepLine('Mode', `Compress PDF (${options.compressionLevel})`);
  }

  const result = await runCompressionStep({
    context,
    inputPath: options.inputPath,
    outputPath: options.outputPath,
    compressionLevel: options.compressionLevel,
    ghostscriptPath,
    label: basename(options.inputPath),
    originalSize: inputSize,
  });

  return {
    inputPath: options.inputPath,
    outputPath: options.outputPath,
    inputKind: options.inputKind,
    compressionLevel: options.compressionLevel,
    originalPdfSize: result.originalSize,
    finalSize: result.finalSize,
    durationMs: Date.now() - startedAt,
    converted: false,
    compressed: true,
  };
}

async function runCompressionStep(params: {
  context: TaskContext;
  inputPath: string;
  outputPath: string;
  compressionLevel: ConversionOptions['compressionLevel'];
  ghostscriptPath: string;
  label: string;
  originalSize: number;
}): Promise<{ originalSize: number; finalSize: number }> {
  const compressOutcome = await runTaskWithProgress(
    params.context,
    {
      step: 'compress',
      title: `Compressing with ${params.compressionLevel} preset…`,
      inputPath: params.inputPath,
      inputSize: params.originalSize,
      stages: COMPRESS_STAGES,
      detail: () =>
        `${params.label} (${formatBytes(params.originalSize)}) at ${params.compressionLevel}`,
      runSpinner: async (task) => {
        const { spinner, result } = await runWithLiveSpinner(
          {
            title: `Compressing with ${params.compressionLevel} preset…`,
            detail: () =>
              `${params.label} (${formatBytes(params.originalSize)}) at ${params.compressionLevel}`,
            stages: COMPRESS_STAGES,
          },
          task,
        );

        const savedPercent =
          result.originalSize > 0
            ? Math.round(
                (1 - result.compressedSize / result.originalSize) * 100,
              )
            : 0;

        succeedSpinner(
          spinner,
          `Compressed with ${params.compressionLevel} preset (${formatBytes(result.compressedSize)}, ${savedPercent}% smaller)`,
        );

        return result;
      },
      onSuccess: (result) =>
        `Compressed with ${params.compressionLevel} preset (${formatBytes(result.compressedSize)})`,
    },
    () =>
      compressPdfFile(
        params.inputPath,
        params.outputPath,
        params.compressionLevel,
        params.ghostscriptPath,
      ),
  );

  return {
    originalSize: compressOutcome.originalSize,
    finalSize: compressOutcome.compressedSize,
  };
}

export async function validateInputFile(
  inputPath: string,
  options?: { compressOnly?: boolean },
): Promise<string | null> {
  const normalized = normalizeInputPath(inputPath);
  const inputKind = getInputKind(normalized);

  if (!inputKind) {
    return 'Unsupported file type. Use .pptx, .ppt, or .pdf files.';
  }

  if (options?.compressOnly && inputKind !== 'pdf') {
    return 'Compress-only mode requires a .pdf file.';
  }

  if (!(await fileExists(normalized))) {
    return `File not found: ${normalized}`;
  }

  return null;
}

export async function ensureOutputReady(
  inputPath: string,
  outputPath: string,
  silent = false,
): Promise<void> {
  if (inputPath === outputPath) {
    throw new Error('Output path must differ from the input file.');
  }

  if (!silent && (await fileExists(outputPath))) {
    infoLine(`Overwriting existing file: ${outputPath}`);
  }
}
