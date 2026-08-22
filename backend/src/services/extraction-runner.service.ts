import { extractDocumentText, ExtractionError } from './extraction.service.js';
import { updateDocumentStatus, saveExtractionResult, markStage } from './document.service.js';

/**
 * Runs text extraction for a single document and persists the result.
 *
 * This is intentionally fire-and-forget from the controller's perspective:
 * the upload/retry response returns immediately, and the frontend polls
 * GET /api/documents/:id to observe the outcome via `stage` and `status`.
 *
 * Stage transitions:
 *   uploaded -> extracting -> analyzing   (success; status stays 'Processing')
 *   uploaded -> extracting -> failed      (failure; status becomes 'Needs attention')
 *
 * On success: extractedText/pages/words are saved and stage advances to
 * 'analyzing'. Nothing currently advances a document out of 'analyzing' --
 * that happens once AI analysis (a later milestone) is wired in, mirroring
 * this same success/failure pattern.
 * On failure: the document moves to 'Needs attention' / stage 'failed' with
 * a human-readable processingError persisted -- it never appears "Ready",
 * and it is never silently stuck in 'Processing' with no explanation.
 */
export async function runTextExtraction(
  documentId: string,
  storagePath: string,
  originalFileName: string
): Promise<void> {
  await markStage(documentId, 'extracting');
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
    await updateDocumentStatus(documentId, 'Needs attention', message, 'failed');
  }
}
