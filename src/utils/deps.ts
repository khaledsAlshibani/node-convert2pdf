import { access, constants } from 'node:fs/promises';
import { platform } from 'node:os';

const LIBREOFFICE_PATHS: Record<string, string[]> = {
  darwin: ['/Applications/LibreOffice.app/Contents/MacOS/soffice'],
  linux: [
    '/usr/bin/libreoffice',
    '/usr/bin/soffice',
    '/snap/bin/libreoffice',
  ],
  win32: [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ],
};

export type DependencyCheckResult = {
  ok: boolean;
  libreOfficePath?: string;
  installHint: string;
};

function getInstallHint(): string {
  const os = platform();

  switch (os) {
    case 'darwin':
      return 'Install LibreOffice: brew install --cask libreoffice';
    case 'linux':
      return 'Install LibreOffice: sudo apt install -y libreoffice  (or use your distro package manager)';
    case 'win32':
      return 'Install LibreOffice: https://www.libreoffice.org/download/download/';
    default:
      return 'Install LibreOffice from https://www.libreoffice.org/download/download/';
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function checkLibreOffice(): Promise<DependencyCheckResult> {
  const installHint = getInstallHint();
  const candidates = LIBREOFFICE_PATHS[platform()] ?? [];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return { ok: true, libreOfficePath: candidate, installHint };
    }
  }

  return { ok: false, installHint };
}
