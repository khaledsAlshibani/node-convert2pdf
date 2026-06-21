import boxen from 'boxen';

import { BANLINE_TAGLINE, BANNER_SUPPORTED_LINE } from '../supported-formats.js';
import { theme } from './theme.js';

export function showBanner(version: string): void {
  const title = theme.bold(theme.primary('convert2pdf')) + theme.dim(`  v${version}`);
  const tagline = theme.dim(BANLINE_TAGLINE);
  const supported = theme.dim(BANNER_SUPPORTED_LINE);

  const content = `${title}\n${tagline}\n${supported}`;

  console.log(
    boxen(content, {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
    }),
  );
}
