# convert2pdf

Convert PowerPoint (`.pptx`, `.ppt`) to PDF and compress PDFs from the terminal — with an interactive wizard, live progress, and Ghostscript compression presets.

Built because I needed to convert large presentation files to PDF **locally and fast**, without uploading decks to online converters or waiting on slow cloud tools. Everything runs on your machine: convert with LibreOffice, then shrink the PDF with Ghostscript when you want a smaller file.

Fully built with [Cursor](https://cursor.com).

### Supported formats (current)

| Input | Output |
|-------|--------|
| `.pptx`, `.ppt` | PDF |
| `.pdf` | Compressed PDF |

Install globally:

```bash
npm install -g convert2pdf
```

Or install in a project:

```bash
npm install convert2pdf
```

Or run once with npx:

```bash
npx convert2pdf
```

## Features

- **.pptx / .ppt to PDF** via LibreOffice (headless)
- **PDF compression** via Ghostscript (`screen`, `ebook`, `printer`, `prepress`)
- **Compress-only mode** — pass a `.pdf` file (auto-detected) or use `--compress-only`
- **Interactive wizard** — guided prompts with descriptions
- **Live progress** — elapsed time and stage updates while converting/compressing
- **Programmatic API** — import in Node.js backends and wire progress to your own UI

## Prerequisites

| Tool | When needed | macOS install |
|------|-------------|---------------|
| **LibreOffice** | `.pptx` / `.ppt` conversion | `brew install --cask libreoffice` |
| **Ghostscript** | Any compression | `brew install ghostscript` |

### Ghostscript

| OS | Command |
|----|---------|
| macOS | `brew install ghostscript` |
| Ubuntu / Debian | `sudo apt install -y ghostscript` |
| Windows | `choco install ghostscript` or [download](https://ghostscript.com/releases/gsdnld.html) |

### LibreOffice

| OS | Command |
|----|---------|
| macOS | `brew install --cask libreoffice` |
| Ubuntu / Debian | `sudo apt install -y libreoffice` |
| Windows | [Download installer](https://www.libreoffice.org/download/download/) |

## Usage

### Interactive wizard (default)

```bash
convert2pdf
```

Accepts `.pptx`, `.ppt`, or `.pdf` paths. PDF inputs go straight to compression.

### .pptx / .ppt to PDF

```bash
convert2pdf slides.pptx
convert2pdf slides.pptx -o output.pdf -l screen
convert2pdf slides.pptx --no-compress
```

### Compress PDF only

Auto-detected when the input ends with `.pdf`:

```bash
convert2pdf document.pdf
convert2pdf document.pdf -o smaller.pdf -l ebook
```

Or explicitly:

```bash
convert2pdf document.pdf --compress-only -l screen
```

Default output for PDF compression: `document-compressed.pdf`

### Options

| Flag | Description |
|------|-------------|
| `[file]` | Input `.pptx`, `.ppt`, or `.pdf` (wizard if omitted) |
| `-o, --output <path>` | Output PDF path |
| `-l, --level <level>` | `none`, `screen`, `ebook`, `printer`, `prepress` (default: `ebook`) |
| `--no-compress` | Convert to PDF only — skip compression (`.pptx`, `.ppt`) |
| `--compress-only` | Compress a PDF (also auto-detected for `.pdf` inputs) |
| `-h, --help` | Show help |
| `-V, --version` | Show version |

## Compression levels

| Level | DPI | Best for |
|-------|-----|----------|
| `screen` | 72 | Smallest files — web, email |
| `ebook` | 150 | Balanced quality and size (recommended) |
| `printer` | 300 | Print-ready documents |
| `prepress` | 300 | Professional print workflows |

## Programmatic API

Install as a dependency:

```bash
npm install convert2pdf
```

Use it from **Node.js** (server, API route, Electron main process, etc.). Conversion requires LibreOffice and Ghostscript on the machine running your code — it does **not** run in the browser.

### Convert to PDF

```typescript
import {
  prepareConversionOptions,
  runConversion,
} from 'convert2pdf';

const options = prepareConversionOptions({
  inputPath: './slides.pptx',
  outputPath: './slides.pdf',
  compressionLevel: 'ebook',
});

const result = await runConversion({
  ...options,
  silent: true,
  onProgress: (event) => {
    console.log(event);
  },
});

console.log(result.outputPath, result.finalSize);
```

### Compress an existing PDF

```typescript
import { prepareConversionOptions, runConversion } from 'convert2pdf';

const result = await runConversion({
  ...prepareConversionOptions({
    inputPath: './large.pdf',
    compressionLevel: 'screen',
  }),
  silent: true,
});
```

PDF inputs are detected automatically — `compressOnly` is implied when the path ends with `.pdf`.

### Wire up a frontend UI

Call the library from your backend and stream progress to the client:

```typescript
// server.ts (Express example)
import express from 'express';
import { prepareConversionOptions, runConversion } from 'convert2pdf';

const app = express();

app.post('/convert', async (req, res) => {
  const { inputPath, outputPath, level } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');

  const result = await runConversion({
    ...prepareConversionOptions({
      inputPath,
      outputPath,
      compressionLevel: level ?? 'ebook',
    }),
    silent: true,
    onProgress: (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
  });

  res.write(`data: ${JSON.stringify({ type: 'result', result })}\n\n`);
  res.end();
});
```

Your React/Vue/Angular app uploads the file to the server, then listens to Server-Sent Events (or WebSockets) to show live progress in the UI.

### API reference

| Export | Description |
|--------|-------------|
| `runConversion(options)` | Full pipeline: convert and/or compress |
| `prepareConversionOptions(opts)` | Build options from paths and flags |
| `convertPptxToPdf(input, output)` | `.pptx` / `.ppt` to PDF only |
| `compressPdfFile(input, output, level)` | Compress a PDF only |
| `validateInputFile(path)` | Validate input before running |
| `checkLibreOffice()` | Check LibreOffice is installed |
| `checkGhostscript()` | Check Ghostscript is installed |
| `getSupportedFormatsText()` | Human-readable list of supported inputs |
| `SUPPORTED_FORMATS` | `.pptx`/`.ppt` (convert) and `.pdf` (compress) |
| `getInputKind(path)` | `'powerpoint'` \| `'pdf'` \| `null` |
| `defaultOutputPath(path)` | Suggest an output path |
| `COMPRESSION_LEVELS` | Preset metadata for UI dropdowns |

### Progress events

When `onProgress` is set, you receive:

```typescript
type ProgressEvent =
  | { type: 'start'; step: 'convert' | 'compress'; message: string; inputPath: string; inputSize?: number }
  | { type: 'stage'; step: 'convert' | 'compress'; message: string; elapsedMs: number; detail?: string }
  | { type: 'complete'; step: 'convert' | 'compress'; message: string; elapsedMs: number };
```

Use these to drive progress bars, status text, or logs in your own UI.

## License

ISC
