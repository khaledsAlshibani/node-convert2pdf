import { access } from 'node:fs/promises';

import { input, select } from '@inquirer/prompts';

import type { CompressionLevel } from '../types.js';
import { COMPRESSION_LEVELS } from '../types.js';
import {
  defaultOutputPath,
  getInputKind,
  isSupportedInputFile,
  normalizeInputPath,
  type InputKind,
} from '../utils/paths.js';
import { theme } from './theme.js';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function promptInputFile(): Promise<string> {
  const raw = await input({
    message: theme.primary('Select a file (.pptx, .ppt, or .pdf)'),
    validate: async (value) => {
      const trimmed = normalizeInputPath(value);
      if (!trimmed) {
        return 'Please enter a file path.';
      }

      if (!isSupportedInputFile(trimmed)) {
        return 'Unsupported file type. Use .pptx, .ppt, or .pdf files.';
      }

      if (!(await fileExists(trimmed))) {
        return 'File not found. Check the path and try again.';
      }

      return true;
    },
  });

  return normalizeInputPath(raw);
}

export async function promptCompressionLevel(
  inputKind: InputKind,
): Promise<CompressionLevel> {
  const levels =
    inputKind === 'pdf'
      ? COMPRESSION_LEVELS.filter((level) => level.value !== 'none')
      : COMPRESSION_LEVELS;

  return select<CompressionLevel>({
    message: theme.primary(
      inputKind === 'pdf' ? 'Compression level (required)' : 'Compression level',
    ),
    choices: levels.map((level) => {
      const recommended = level.value === 'ebook' ? theme.success(' [recommended]') : '';
      const label = `${level.label} — ${level.description} (${level.dpi})${recommended}`;

      return {
        name: label,
        value: level.value,
        description: level.description,
      };
    }),
    default: 'ebook',
  });
}

export async function promptOutputPath(
  inputPath: string,
  inputKind: InputKind,
): Promise<string> {
  const suggested = defaultOutputPath(inputPath, inputKind);

  const raw = await input({
    message: theme.primary('Output path'),
    default: suggested,
    validate: (value) => {
      const trimmed = normalizeInputPath(value);
      if (!trimmed) {
        return 'Please enter an output path.';
      }

      if (!trimmed.toLowerCase().endsWith('.pdf')) {
        return 'Output path must end with .pdf';
      }

      if (trimmed === normalizeInputPath(inputPath)) {
        return 'Output path must differ from the input file.';
      }

      return true;
    },
  });

  return normalizeInputPath(raw);
}

export function describeInputKind(inputPath: string): InputKind {
  const kind = getInputKind(inputPath);
  if (!kind) {
    throw new Error('Unsupported input file type.');
  }

  return kind;
}
