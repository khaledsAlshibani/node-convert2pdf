import { writeFile } from 'node:fs/promises';

import { compress } from 'compress-pdf';

import type { CompressionLevel } from './types.js';
import { COMPRESSION_LEVELS } from './types.js';
import { resolveGhostscriptPath } from './utils/ghostscript.js';

export type CompressPdfResult = {
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  durationMs: number;
};

export function getResolutionForLevel(level: CompressionLevel) {
  const info = COMPRESSION_LEVELS.find((entry) => entry.value === level);
  return info?.resolution;
}

export async function compressPdfFile(
  inputPath: string,
  outputPath: string,
  level: CompressionLevel,
  gsModule?: string,
): Promise<CompressPdfResult> {
  const resolution = getResolutionForLevel(level);
  if (!resolution) {
    throw new Error(`Invalid compression level: ${level}`);
  }

  const ghostscriptPath = gsModule ?? (await resolveGhostscriptPath());
  if (!ghostscriptPath) {
    throw new Error('Ghostscript not found');
  }

  const result = await compress(inputPath, {
    resolution,
    gsModule: ghostscriptPath,
  });
  await writeFile(outputPath, result);

  return {
    outputPath,
    originalSize: result.originalSize,
    compressedSize: result.compressedSize,
    compressionRatio: result.compressionRatio,
    durationMs: result.duration,
  };
}
