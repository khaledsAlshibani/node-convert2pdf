#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command } from 'commander';

import {
  ensureOutputReady,
  runConversion,
  validateInputFile,
} from './pipeline.js';
import type { CompressionLevel } from './types.js';
import { showBanner } from './ui/banner.js';
import {
  describeInputKind,
  promptCompressionLevel,
  promptInputFile,
  promptOutputPath,
} from './ui/prompts.js';
import { showError, showSuccessSummary } from './ui/summary.js';
import {
  CLI_SHORT_DESCRIPTION,
  getSupportedFormatsText,
} from './supported-formats.js';
import { checkLibreOffice } from './utils/deps.js';
import { checkGhostscript } from './utils/ghostscript.js';
import {
  defaultOutputPath,
  getInputKind,
  isPdfFile,
  normalizeInputPath,
} from './utils/paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  version: string;
};

const COMPRESSION_LEVEL_VALUES = [
  'none',
  'screen',
  'ebook',
  'printer',
  'prepress',
] as const;

type CliOptions = {
  output?: string;
  level?: CompressionLevel;
  noCompress?: boolean;
  compressOnly?: boolean;
};

function resolveInputKind(inputPath: string, compressOnly: boolean) {
  const inputKind = getInputKind(inputPath);

  if (!inputKind) {
    return null;
  }

  if (compressOnly && inputKind !== 'pdf') {
    return 'invalid-compress-only' as const;
  }

  return inputKind;
}

async function ensureDependencies(
  inputKind: 'powerpoint' | 'pdf',
  compressionLevel: CompressionLevel,
): Promise<void> {
  if (inputKind === 'powerpoint') {
    const deps = await checkLibreOffice();
    if (!deps.ok) {
      showError(
        'LibreOffice is not installed or could not be found.',
        deps.installHint,
      );
      process.exit(1);
    }
  }

  const needsGhostscript =
    inputKind === 'pdf' || (inputKind === 'powerpoint' && compressionLevel !== 'none');

  if (needsGhostscript) {
    const ghostscript = await checkGhostscript();
    if (!ghostscript.ok) {
      showError(
        'Ghostscript is not installed or could not be found.',
        ghostscript.installHint,
      );
      process.exit(1);
    }
  }
}

function resolveCompressionLevel(
  inputKind: 'powerpoint' | 'pdf',
  options: CliOptions,
): CompressionLevel {
  if (inputKind === 'pdf' || options.compressOnly) {
    if (options.noCompress) {
      throw new Error(
        'PDF compress mode requires compression. Omit --no-compress and choose a level with -l.',
      );
    }

    return options.level ?? 'ebook';
  }

  return options.noCompress ? 'none' : (options.level ?? 'ebook');
}

async function runInteractiveWizard(): Promise<void> {
  const inputPath = await promptInputFile();
  const inputKind = describeInputKind(inputPath);
  const compressionLevel = await promptCompressionLevel(inputKind);
  const outputPath = await promptOutputPath(inputPath, inputKind);

  await ensureDependencies(inputKind, compressionLevel);
  await ensureOutputReady(inputPath, outputPath);

  const result = await runConversion({
    inputPath,
    outputPath,
    compressionLevel,
    inputKind,
  });

  showSuccessSummary(result);
}

async function runDirect(
  inputPath: string,
  options: CliOptions,
): Promise<void> {
  const normalizedInput = normalizeInputPath(inputPath);
  const inputKind = resolveInputKind(
    normalizedInput,
    Boolean(options.compressOnly),
  );

  if (inputKind === null) {
    showError('Unsupported file type. Use .pptx, .ppt, or .pdf files.');
    process.exit(1);
  }

  if (inputKind === 'invalid-compress-only') {
    showError(
      '--compress-only requires a .pdf file.',
      'Pass a PDF path or omit --compress-only for .pptx/.ppt files.',
    );
    process.exit(1);
  }

  const validationError = await validateInputFile(normalizedInput, {
    ...(options.compressOnly ? { compressOnly: true } : {}),
  });
  if (validationError) {
    showError(validationError);
    process.exit(1);
  }

  let compressionLevel: CompressionLevel;
  try {
    compressionLevel = resolveCompressionLevel(inputKind, options);
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Invalid options.');
    process.exit(1);
  }

  const effectiveKind =
    options.compressOnly || isPdfFile(normalizedInput) ? 'pdf' : inputKind;

  await ensureDependencies(effectiveKind, compressionLevel);

  const outputPath = options.output
    ? normalizeInputPath(options.output)
    : defaultOutputPath(normalizedInput, effectiveKind);

  await ensureOutputReady(normalizedInput, outputPath);

  const result = await runConversion({
    inputPath: normalizedInput,
    outputPath,
    compressionLevel,
    inputKind: effectiveKind,
  });

  showSuccessSummary(result);
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('convert2pdf')
    .description(CLI_SHORT_DESCRIPTION)
    .addHelpText('after', `\n${getSupportedFormatsText()}\n`)
    .version(version)
    .argument('[file]', 'Input file — .pptx, .ppt, or .pdf')
    .option('-o, --output <path>', 'Output PDF path')
    .option(
      '-l, --level <level>',
      'Compression level: none, screen, ebook, printer, prepress',
      'ebook',
    )
    .option('--no-compress', 'Convert to PDF only — skip compression (.pptx, .ppt)')
    .option(
      '--compress-only',
      'Compress an existing PDF only (also auto-detected for .pdf inputs)',
    )
    .action(async (file: string | undefined, options: CliOptions) => {
      showBanner(version);

      if (options.level && !COMPRESSION_LEVEL_VALUES.includes(options.level)) {
        showError(
          `Invalid compression level: ${options.level}`,
          `Use one of: ${COMPRESSION_LEVEL_VALUES.join(', ')}`,
        );
        process.exit(1);
      }

      try {
        if (!file) {
          await runInteractiveWizard();
          return;
        }

        await runDirect(file, options);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'An unexpected error occurred.';
        showError(message);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred.';
  showError(message);
  process.exit(1);
});
