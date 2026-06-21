import { extname } from 'node:path';

export type InputKind = 'powerpoint' | 'pdf';

export function normalizeInputPath(filePath: string): string {
  return filePath
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/[\r\n]+/g, '');
}

export function getInputKind(filePath: string): InputKind | null {
  const normalized = normalizeInputPath(filePath).toLowerCase();

  if (normalized.endsWith('.pptx') || normalized.endsWith('.ppt')) {
    return 'powerpoint';
  }

  if (normalized.endsWith('.pdf')) {
    return 'pdf';
  }

  return null;
}

export function isSupportedInputFile(filePath: string): boolean {
  return getInputKind(filePath) !== null;
}

export function isSupportedPowerPointFile(filePath: string): boolean {
  return getInputKind(filePath) === 'powerpoint';
}

export function isPdfFile(filePath: string): boolean {
  return getInputKind(filePath) === 'pdf';
}

export function defaultOutputPath(inputPath: string, inputKind?: InputKind): string {
  const normalized = normalizeInputPath(inputPath);
  const kind = inputKind ?? getInputKind(normalized);
  const extension = extname(normalized);

  if (!extension) {
    return kind === 'pdf' ? `${normalized}-compressed.pdf` : `${normalized}.pdf`;
  }

  const base = normalized.slice(0, -extension.length);

  if (kind === 'pdf') {
    return `${base}-compressed.pdf`;
  }

  return `${base}.pdf`;
}
