import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateInputFile } from '../../src/pipeline.js';

describe('validateInputFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'convert2pdf-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns null for an existing supported file', async () => {
    const filePath = join(tempDir, 'slides.pptx');
    await writeFile(filePath, 'test');

    await expect(validateInputFile(filePath)).resolves.toBeNull();
  });

  it('returns an error when the file is missing', async () => {
    await expect(validateInputFile(join(tempDir, 'missing.pptx'))).resolves.toMatch(
      /File not found/,
    );
  });

  it('returns an error for unsupported extensions', async () => {
    const filePath = join(tempDir, 'notes.txt');
    await writeFile(filePath, 'test');

    await expect(validateInputFile(filePath)).resolves.toMatch(
      /Unsupported file type/,
    );
  });

  it('enforces compress-only for non-pdf files', async () => {
    const filePath = join(tempDir, 'slides.pptx');
    await writeFile(filePath, 'test');

    await expect(
      validateInputFile(filePath, { compressOnly: true }),
    ).resolves.toMatch(/Compress-only mode requires a \.pdf file/);
  });
});
