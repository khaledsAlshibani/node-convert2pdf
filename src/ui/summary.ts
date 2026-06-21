import boxen from 'boxen';

import type { ConversionResult } from '../types.js';
import { formatBytes, formatDuration, formatPercent } from '../utils/format.js';
import { theme } from './theme.js';

function describeMode(result: ConversionResult): string {
  if (result.converted && result.compressed) {
    return 'Convert + compress';
  }

  if (result.converted) {
    return 'Convert only';
  }

  return 'Compress only';
}

export function showSuccessSummary(result: ConversionResult): void {
  const savings =
    result.compressed && result.originalPdfSize > 0
      ? formatPercent(1 - result.finalSize / result.originalPdfSize)
      : null;

  const sizeLine = result.compressed
    ? `${formatBytes(result.originalPdfSize)} ${theme.dim('->')} ${formatBytes(result.finalSize)}${savings ? ` (${savings} saved)` : ''}`
    : formatBytes(result.finalSize);

  const lines = [
    `${theme.dim('Input:')}  ${result.inputPath}`,
    `${theme.dim('Output:')} ${theme.success(result.outputPath)}`,
    `${theme.dim('Mode:')}   ${describeMode(result)}`,
    `${theme.dim('Level:')}  ${result.compressionLevel}`,
    `${theme.dim('Size:')}   ${sizeLine}`,
    `${theme.dim('Time:')}   ${formatDuration(result.durationMs)}`,
  ];

  console.log(
    boxen(lines.join('\n'), {
      title: theme.success('Done'),
      titleAlignment: 'left',
      padding: 1,
      margin: { top: 1, bottom: 0, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'green',
    }),
  );
}

export function showError(message: string, hint?: string): void {
  console.error(`\n${theme.error('Error:')} ${message}`);
  if (hint) {
    console.error(`${theme.dim('Hint:')} ${hint}`);
  }
}
