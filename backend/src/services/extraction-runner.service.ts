import { extractDocumentText, ExtractionError } from './extraction.service.js';
import { updateDocumentStatus, saveExtractionResult } from './document.service.js';

/**
 * Runs text extraction for a single document and persists the result.
 *
 * This is intentionally fire-and-forget from the controller's perspective:
 * the upload/retry response returns immediately, and the frontend polls
 * GET /api/documents/:id to observe the outcome.
 *
 * On success: extractedText/pages/words are saved; the document remains in
 * 'Processing' (AI analysis, added in a later milestone, is what ultimately
 * moves it to 'Ready').
 * On failure: the document moves to 'Needs attention' with a human-readable
 * processingError persisted -- it never appears "Ready", and it is never
 * silently stuck in 'Processing' forever.
 */
export async function runTextExtraction(
  documentId: string,
  storagePath: string,
  originalFileName: string
): Promise<void> {
  try {
    const extraction = await extractDocumentText(storagePath, originalFileName);
    await saveExtractionResult(documentId, {
      extractedText: extraction.text,
      pages: extraction.pages,
      words: extraction.words,
    });
  } catch (error) {
    const message = error instanceof ExtractionError ? error.message : 'Failed to extract text from this document.';
    console.error(`[Extraction Runner] Document ${documentId}: extraction failed:`, error);
    await updateDocumentStatus(documentId, 'Needs attention', message);
  }
}
