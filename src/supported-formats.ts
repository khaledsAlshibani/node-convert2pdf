export const SUPPORTED_FORMATS = {
  convertToPdf: ['.pptx', '.ppt'] as const,
  compressPdf: ['.pdf'] as const,
};

export const SUPPORTED_FORMATS_LINES = [
  '.pptx, .ppt  to  PDF',
  '.pdf         to  compressed PDF',
] as const;

export function getSupportedFormatsText(): string {
  return `Currently supported:\n  ${SUPPORTED_FORMATS_LINES.join('\n  ')}`;
}

export const CLI_SHORT_DESCRIPTION =
  'Convert files to PDF and compress PDFs from the terminal';

export const BANLINE_TAGLINE = 'Convert to PDF · Compress PDFs';

export const BANNER_SUPPORTED_LINE = `Currently: ${SUPPORTED_FORMATS_LINES.join(' · ')}`;
