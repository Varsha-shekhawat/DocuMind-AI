import { extractDocumentText, ExtractionError } from './extraction.service.js';
import {
  updateDocumentStatus,
  saveExtractionResult,
  saveAnalysisResult,
  markStage,
} from './document.service.js';
import { analyzeDocumentText, AiAnalysisError } from './ai-analysis.service.js';

/**
 * Runs standalone AI analysis on previously extracted text.
 *
 * Stage transitions:
 *   analyzing -> ready    (success; status becomes 'Ready')
 *   analyzing -> failed   (failure; status becomes 'Needs attention')
 */
export async function runAiAnalysisPipeline(
  documentId: string,
  extractedText: string
): Promise<void> {
  await markStage(documentId, 'analyzing');
  try {
    const analysis = await analyzeDocumentText(extractedText);
    await saveAnalysisResult(documentId, analysis);
    console.log(`[Pipeline Runner] Document ${documentId}: AI analysis completed successfully.`);
  } catch (error) {
    const message =
      error instanceof AiAnalysisError
        ? error.message
        : error instanceof Error
        ? error.message
        : 'Failed to generate AI analysis for this document.';
    console.error(`[Pipeline Runner] Document ${documentId}: AI analysis failed:`, error);
    await updateDocumentStatus(documentId, 'Needs attention', message, 'failed');
  }
}

/**
 * Runs the complete document processing pipeline:
 *   1. Text extraction from physical storage file (PDF, DOCX, TXT, or image OCR via Tesseract)
 *   2. Structured AI analysis via Google Gemini 3.6 Flash
 *
 * Stage transitions:
 *   uploaded -> extracting -> analyzing -> ready
 *                   \             \
 *                    -> failed <--
 */
export async function runDocumentPipeline(
  documentId: string,
  storagePath: string,
  originalFileName: string
): Promise<void> {
  await markStage(documentId, 'extracting');
  let text = '';
  try {
    const extraction = await extractDocumentText(storagePath, originalFileName);
    text = extraction.text;
    await saveExtractionResult(documentId, {
      extractedText: extraction.text,
      pages: extraction.pages,
      words: extraction.words,
    });
  } catch (error) {
    const message =
      error instanceof ExtractionError
        ? error.message
        : 'Failed to extract text from this document.';
    console.error(`[Pipeline Runner] Document ${documentId}: extraction failed:`, error);
    await updateDocumentStatus(documentId, 'Needs attention', message, 'failed');
    return;
  }

  // Proceed immediately to AI analysis
  await runAiAnalysisPipeline(documentId, text);
}

// Backward-compatible alias
export const runTextExtraction = runDocumentPipeline;

