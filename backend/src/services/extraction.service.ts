import fs from 'fs';
import path from 'path';
// pdf-parse and mammoth ship no ESM types friendly to `import x from`, so we
// use the documented require-style default import.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';

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
 * Runs Optical Character Recognition (OCR) on an image buffer using local Tesseract.
 */
export async function performOcr(imageBuffer: Buffer): Promise<string> {
  let worker;
  try {
    worker = await createWorker('eng');
    const {
      data: { text },
    } = await worker.recognize(imageBuffer);
    return (text || '').trim();
  } catch (err) {
    console.error('[OCR Recognition Error]', err);
    throw new ExtractionError('Optical Character Recognition (OCR) failed to process this image.');
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Extracts plain text (and a page count, where applicable) from a stored
 * document file based on its extension. Supports PDF, DOCX, TXT, and image
 * formats (PNG, JPG, JPEG, WEBP) via OCR.
 *
 * Throws ExtractionError with a user-safe message on any failure (corrupted file,
 * empty content, unreadable OCR, etc.) so the caller can mark the document
 * 'Needs attention' and permit clean retry.
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
    // 1. Image OCR extraction (.png, .jpg, .jpeg, .webp)
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      console.log(`[Extraction Service] Performing OCR on image: ${originalFileName}`);
      const text = await performOcr(buffer);
      if (!text) {
        throw new ExtractionError(
          'No readable text could be recognized in this image via OCR. Please ensure the image contains clear, legible text.'
        );
      }
      return {
        text,
        pages: 1,
        words: countWords(text),
      };
    }

    // 2. PDF parsing
    if (ext === '.pdf') {
      let parsed;
      try {
        parsed = await pdfParse(buffer);
      } catch (pdfErr) {
        throw new ExtractionError('Failed to parse PDF document structure. The file may be damaged.');
      }

      const text = (parsed.text || '').trim();
      if (!text) {
        throw new ExtractionError(
          'No extractable text layer was found in this PDF (it appears to be a scanned document without an embedded text stream). Please upload the document as a high-resolution image (.png, .jpg) or OCR-processed PDF.'
        );
      }
      return { text, pages: parsed.numpages || 1, words: countWords(text) };
    }

    // 3. Word DOCX extraction
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      if (!text) {
        throw new ExtractionError('No extractable text was found in this Word document.');
      }
      // DOCX has no reliable page count without full layout; estimate from length.
      const estimatedPages = Math.max(1, Math.ceil(countWords(text) / 500));
      return { text, pages: estimatedPages, words: countWords(text) };
    }

    // 4. Legacy .doc warning
    if (ext === '.doc') {
      throw new ExtractionError(
        'Legacy .doc files are not supported for text extraction yet. Please re-save as .docx, .pdf, or .png.'
      );
    }

    // 5. Plain text files
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
