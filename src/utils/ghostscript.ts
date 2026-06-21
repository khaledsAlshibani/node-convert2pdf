import { createRequire } from 'node:module';
import { access, constants } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { platform } from 'node:os';

import { getBinPath } from 'compress-pdf';

const require = createRequire(import.meta.url);

export type GhostscriptCheckResult = {
  ok: boolean;
  path?: string;
  installHint: string;
};

function getGhostscriptInstallHint(): string {
  const os = platform();

  switch (os) {
    case 'darwin':
      return 'Install Ghostscript: brew install ghostscript';
    case 'linux':
      return 'Install Ghostscript: sudo apt install -y ghostscript  (or use your distro package manager)';
    case 'win32':
      return 'Install Ghostscript: choco install ghostscript  or download from https://ghostscript.com/releases/gsdnld.html';
    default:
      return 'Install Ghostscript from https://ghostscript.com/releases/gsdnld.html';
  }
}

function getBundledCandidates(): string[] {
  const packageRoot = dirname(require.resolve('compress-pdf/package.json'));
  const binDir = join(packageRoot, 'bin', 'gs');

  if (platform() === 'win32') {
    return [
      join(binDir, 'bin', 'gswin64c.exe'),
      join(binDir, 'gswin64c.exe'),
    ];
  }

  return [join(binDir, 'bin', 'gs'), join(binDir, 'gs')];
}

function getSystemCandidates(): string[] {
  switch (platform()) {
    case 'darwin':
      return ['/opt/homebrew/bin/gs', '/usr/local/bin/gs'];
    case 'linux':
      return ['/usr/bin/gs', '/usr/local/bin/gs'];
    case 'win32':
      return [
        'C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe',
        'C:\\Program Files (x86)\\gs\\gs10.04.0\\bin\\gswin32c.exe',
      ];
    default:
      return [];
  }
}

async function isExecutable(filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function resolveGhostscriptPath(): Promise<string | null> {
  const candidates = [
    process.env.COMPRESS_PDF_BIN_PATH,
    ...getBundledCandidates(),
    ...getSystemCandidates(),
    getBinPath(platform()),
  ].filter((candidate): candidate is string => Boolean(candidate));

  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);

    if (await isExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function checkGhostscript(): Promise<GhostscriptCheckResult> {
  const installHint = getGhostscriptInstallHint();
  const gsPath = await resolveGhostscriptPath();

  if (gsPath) {
    return { ok: true, path: gsPath, installHint };
  }

  return { ok: false, installHint };
}
