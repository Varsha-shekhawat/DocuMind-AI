import fs from 'fs';
import path from 'path';
// pdf-parse and mammoth ship no ESM types friendly to `import x from`, so we
// use the documented require-style default import.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export interface ExtractionResult {
  text: string;
  pages: number;
  words: number;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Extracts plain text (and a page count, where applicable) from a stored
 * document file based on its extension. Throws ExtractionError with a
 * user-safe message on any failure (corrupted file, unsupported content,
 * empty file, etc.) so the caller can mark the document 'Needs attention'
 * instead of silently storing placeholder text.
 */
export async function extractDocumentText(filePath: string, originalFileName: string): Promise<ExtractionResult> {
  const ext = path.extname(originalFileName).toLowerCase();

  let buffer: Buffer;
  try {
    buffer = await fs.promises.readFile(filePath);
  } catch (_err) {
    throw new ExtractionError('Could not read the uploaded file from storage.');
  }

  if (buffer.length === 0) {
    throw new ExtractionError('The uploaded file is empty.');
  }

  try {
    if (ext === '.pdf') {
      const parsed = await pdfParse(buffer);
      const text = (parsed.text || '').trim();
      if (!text) {
        throw new ExtractionError('No extractable text was found in this PDF (it may be a scanned image without OCR).');
      }
      return { text, pages: parsed.numpages || 1, words: countWords(text) };
    }

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      if (!text) {
        throw new ExtractionError('No extractable text was found in this document.');
      }
      // DOCX has no reliable page count without full layout; estimate from length.
      const estimatedPages = Math.max(1, Math.ceil(countWords(text) / 500));
      return { text, pages: estimatedPages, words: countWords(text) };
    }

    if (ext === '.doc') {
      // Legacy binary .doc is not reliably parseable without a native
      // converter. We accept the upload (per file validation) but flag it
      // clearly rather than pretending to extract garbage binary text.
      throw new ExtractionError('Legacy .doc files are not supported for text extraction yet. Please re-save as .docx or .pdf.');
    }

    if (ext === '.txt') {
      const text = buffer.toString('utf-8').trim();
      if (!text) {
        throw new ExtractionError('The uploaded text file is empty.');
      }
      const estimatedPages = Math.max(1, Math.ceil(countWords(text) / 500));
      return { text, pages: estimatedPages, words: countWords(text) };
    }

    throw new ExtractionError(`Unsupported file extension "${ext}" for text extraction.`);
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    console.error('[Extraction Error]', error);
    throw new ExtractionError('Failed to extract text from this document. It may be corrupted or in an unsupported format.');
  }
}
