import msoffice2pdfImport from 'msoffice2pdf';

type Msoffice2Pdf = (
  inputPath: string,
  outputPath: string,
  options?: { libreOfficeBinaryPath?: string; language?: string },
) => Promise<void>;

const msoffice2pdf = msoffice2pdfImport as unknown as Msoffice2Pdf;

export async function convertPptxToPdf(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  await msoffice2pdf(inputPath, outputPath);
}
