import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  createDocument,
  getDocumentsByUserId,
  getDocumentByIdAndUser,
  deleteDocumentByIdAndUser,
  updateDocumentStatus,
  addDocumentNote,
  updateDocumentNote,
  deleteDocumentNote,
  getDocumentNotes,
  getDocumentSharingStatus,
  enableDocumentSharing,
  disableDocumentSharing,
} from '../services/document.service.js';
import { toSafeDocument } from '../models/document.model.js';
import { removeFileIfExists } from '../middleware/upload.middleware.js';
import { runDocumentPipeline, runAiAnalysisPipeline } from '../services/extraction-runner.service.js';
import { answerDocumentQuestion, AiQaError } from '../services/ai-qa.service.js';
import { generateMarkdownExport } from '../services/export.service.js';

/**
 * Handle document upload: POST /api/documents/upload
 */
export async function uploadDocument(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required.',
        statusCode: 401,
      },
    });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({
      success: false,
      error: {
        message: 'No file uploaded. Please select a valid document file.',
        statusCode: 400,
      },
    });
    return;
  }

  const rawName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const documentName = rawName || file.originalname;

  try {
    const document = await createDocument({
      userId: req.user.id,
      name: documentName,
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storagePath: file.path,
      pages: 1,
      words: 0,
      description: `Uploaded document: ${file.originalname}`,
    });

    const safeDoc = toSafeDocument(document);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully.',
      document: safeDoc,
    });

    // Fire-and-forget: the response has already been sent with the document
    // in its initial 'Processing' state. Real text extraction and AI analysis
    // happen asynchronously and update summary/keyPoints/mainIdeas/suggestions
    // on success (stage -> 'ready', status -> 'Ready'), or move the document
    // to 'Needs attention' with a persisted error on failure.
    void runDocumentPipeline(document._id.toHexString(), file.path, file.originalname);
  } catch (error) {
    // Clean up uploaded file if database insertion failed
    await removeFileIfExists(file.path);
    console.error('[Document Controller Error] Failed to persist uploaded document:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to save document metadata.',
        statusCode: 500,
      },
    });
  }
}

/**
 * Handle fetching all documents for current user: GET /api/documents
 */
export async function getDocuments(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required.',
        statusCode: 401,
      },
    });
    return;
  }

  try {
    const documents = await getDocumentsByUserId(req.user.id);
    const safeDocuments = documents.map(toSafeDocument);

    res.status(200).json({
      success: true,
      documents: safeDocuments,
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to fetch documents:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve document library.',
        statusCode: 500,
      },
    });
  }
}

/**
 * Handle fetching a single document by ID: GET /api/documents/:id
 */
export async function getDocumentById(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required.',
        statusCode: 401,
      },
    });
    return;
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid document ID format.',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const document = await getDocumentByIdAndUser(id, req.user.id);
    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Document not found.',
          statusCode: 404,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      document: toSafeDocument(document),
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to fetch document by ID:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve document.',
        statusCode: 500,
      },
    });
  }
}

/**
 * Handle re-running text extraction on a document stuck in 'Needs attention':
 * POST /api/documents/:id/retry
 *
 * Scoped to extraction only for now -- once AI analysis exists, this will
 * also re-trigger analysis, but the route/contract stays the same.
 */
/**
 * Handle re-running the pipeline on a document stuck in 'Needs attention':
 * POST /api/documents/:id/retry
 *
 * Stage-aware: if extraction already succeeded previously (extractedText is
 * present) but a later stage failed, retry resumes from 'analyzing' instead
 * of wastefully re-extracting the file. Today, extraction is the only stage
 * that can fail, so this branch is a no-op placeholder until AI analysis (a
 * later milestone) adds a stage that actually consumes 'analyzing' -- but
 * the retry contract already supports it without another endpoint change.
 */
export async function retryDocumentProcessing(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 },
    });
    return;
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid document ID format.', statusCode: 400 },
    });
    return;
  }

  try {
    const document = await getDocumentByIdAndUser(id, req.user.id);
    if (!document) {
      res.status(404).json({
        success: false,
        error: { message: 'Document not found.', statusCode: 404 },
      });
      return;
    }

    const alreadyExtracted = Boolean(document.extractedText && document.extractedText.trim().length > 0);

    if (alreadyExtracted) {
      // Extraction already succeeded; resume directly at the analyzing stage.
      await updateDocumentStatus(id, 'Processing', undefined, 'analyzing');
      res.status(200).json({ success: true, message: 'Reprocessing resumed from analysis.' });
      void runAiAnalysisPipeline(id, document.extractedText);
      return;
    }

    await updateDocumentStatus(id, 'Processing', undefined, 'uploaded');

    res.status(200).json({
      success: true,
      message: 'Reprocessing started.',
    });

    void runDocumentPipeline(id, document.storagePath, document.originalFileName);
  } catch (error) {
    console.error('[Document Controller Error] Failed to retry extraction:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to restart processing.', statusCode: 500 },
    });
  }
}

/**
 * Handle document deletion: DELETE /api/documents/:id
 */
export async function deleteDocument(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required.',
        statusCode: 401,
      },
    });
    return;
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid document ID format.',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const deletedDoc = await deleteDocumentByIdAndUser(id, req.user.id);
    if (!deletedDoc) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Document not found or permission denied.',
          statusCode: 404,
        },
      });
      return;
    }

    // Clean up physical file
    await removeFileIfExists(deletedDoc.storagePath);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to delete document:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete document.',
        statusCode: 500,
      },
    });
  }
}

/**
 * Handle asking a question grounded in a specific document:
 * POST /api/documents/:id/ask
 */
export async function askDocumentQuestion(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required.',
        statusCode: 401,
      },
    });
    return;
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid document ID format.',
        statusCode: 400,
      },
    });
    return;
  }

  const rawQuestion = typeof req.body.question === 'string' ? req.body.question.trim() : '';
  if (!rawQuestion) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Please provide a non-empty question.',
        statusCode: 400,
      },
    });
    return;
  }

  if (rawQuestion.length > 1000) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Question is too long (maximum 1,000 characters).',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const document = await getDocumentByIdAndUser(id, req.user.id);
    if (!document) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Document not found or permission denied.',
          statusCode: 404,
        },
      });
      return;
    }

    if (!document.extractedText || !document.extractedText.trim()) {
      res.status(400).json({
        success: false,
        error: {
          message: 'This document has no extracted text available for Q&A.',
          statusCode: 400,
        },
      });
      return;
    }

    if (document.status === 'Needs attention') {
      res.status(400).json({
        success: false,
        error: {
          message: 'This document encountered a processing error. Please retry processing first.',
          statusCode: 400,
        },
      });
      return;
    }

    const summaryText =
      document.summary?.medium || document.summary?.short || document.description;

    const result = await answerDocumentQuestion({
      documentText: document.extractedText,
      documentName: document.name,
      question: rawQuestion,
      summaryContext: summaryText,
    });

    res.status(200).json({
      success: true,
      documentId: id,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    const message =
      error instanceof AiQaError
        ? error.message
        : 'Failed to generate answer for your question.';
    console.error('[Document Controller Error] Q&A failure:', error);
    res.status(500).json({
      success: false,
      error: {
        message,
        statusCode: 500,
      },
    });
  }
}

/**
 * Handle document export (Markdown, JSON):
 * GET /api/documents/:id/export?format=markdown|json
 */
export async function exportDocument(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 },
    });
    return;
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid document ID format.', statusCode: 400 },
    });
    return;
  }

  const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'markdown';

  try {
    const document = await getDocumentByIdAndUser(id, req.user.id);
    if (!document) {
      res.status(404).json({
        success: false,
        error: { message: 'Document not found or permission denied.', statusCode: 404 },
      });
      return;
    }

    if (format === 'json') {
      res.status(200).json({
        success: true,
        document: toSafeDocument(document),
      });
      return;
    }

    // Default to Markdown
    const markdown = generateMarkdownExport(document);
    const cleanFileName = document.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}-unfold-summary.md"`);
    res.status(200).send(markdown);
  } catch (error) {
    console.error('[Document Controller Error] Export failure:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to export document.', statusCode: 500 },
    });
  }
}

/**
 * Handle retrieving notes for a document:
 * GET /api/documents/:id/notes
 */
export async function getNotes(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 },
    });
    return;
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid document ID format.', statusCode: 400 },
    });
    return;
  }

  try {
    const notes = await getDocumentNotes(id, req.user.id);
    if (notes === null) {
      res.status(404).json({
        success: false,
        error: { message: 'Document not found or permission denied.', statusCode: 404 },
      });
      return;
    }

    res.status(200).json({
      success: true,
      notes,
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to fetch notes:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve document notes.', statusCode: 500 },
    });
  }
}

/**
 * Handle adding a new note to a document:
 * POST /api/documents/:id/notes
 */
export async function addNote(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 },
    });
    return;
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid document ID format.', statusCode: 400 },
    });
    return;
  }

  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  if (!content) {
    res.status(400).json({
      success: false,
      error: { message: 'Note content cannot be empty.', statusCode: 400 },
    });
    return;
  }

  const excerpt = typeof req.body.excerpt === 'string' ? req.body.excerpt.trim() : undefined;
  const color = ['ochre', 'terracotta', 'sage', 'bluegreen', 'plum'].includes(req.body.color)
    ? req.body.color
    : 'ochre';

  try {
    const createdNote = await addDocumentNote(id, req.user.id, {
      content,
      excerpt,
      color,
    });

    if (!createdNote) {
      res.status(404).json({
        success: false,
        error: { message: 'Document not found or permission denied.', statusCode: 404 },
      });
      return;
    }

    res.status(201).json({
      success: true,
      note: createdNote,
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to add note:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to save note.', statusCode: 500 },
    });
  }
}

/**
 * Handle updating an existing note:
 * PATCH /api/documents/:id/notes/:noteId
 */
export async function updateNote(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 },
    });
    return;
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const rawNoteId = req.params.noteId;
  const noteId = Array.isArray(rawNoteId) ? rawNoteId[0] : rawNoteId;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id) || !noteId) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid document or note ID format.', statusCode: 400 },
    });
    return;
  }

  const content = typeof req.body.content === 'string' ? req.body.content.trim() : undefined;
  const excerpt = typeof req.body.excerpt === 'string' ? req.body.excerpt.trim() : undefined;
  const color = ['ochre', 'terracotta', 'sage', 'bluegreen', 'plum'].includes(req.body.color)
    ? req.body.color
    : undefined;

  try {
    const updatedNote = await updateDocumentNote(id, req.user.id, noteId, {
      content,
      excerpt,
      color,
    });

    if (!updatedNote) {
      res.status(404).json({
        success: false,
        error: { message: 'Note or document not found or permission denied.', statusCode: 404 },
      });
      return;
    }

    res.status(200).json({
      success: true,
      note: updatedNote,
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to update note:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update note.', statusCode: 500 },
    });
  }
}

/**
 * Handle deleting a note:
 * DELETE /api/documents/:id/notes/:noteId
 */
export async function deleteNote(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 },
    });
    return;
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const rawNoteId = req.params.noteId;
  const noteId = Array.isArray(rawNoteId) ? rawNoteId[0] : rawNoteId;

  if (!id || typeof id !== 'string' || !ObjectId.isValid(id) || !noteId) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid document or note ID format.', statusCode: 400 },
    });
    return;
  }

  try {
    const deleted = await deleteDocumentNote(id, req.user.id, noteId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { message: 'Note not found or permission denied.', statusCode: 404 },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully.',
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to delete note:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete note.', statusCode: 500 },
    });
  }
}

/**
 * Get document sharing status: GET /api/documents/:id/share
 */
export async function getShareStatus(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 },
    });
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid document ID format.', statusCode: 400 },
    });
    return;
  }

  try {
    const status = await getDocumentSharingStatus(id, req.user.id);
    if (!status) {
      res.status(404).json({
        success: false,
        error: { message: 'Document not found or access denied.', statusCode: 404 },
      });
      return;
    }

    res.status(200).json({
      success: true,
      sharing: status,
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to get share status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve sharing status.', statusCode: 500 },
    });
  }
}

/**
 * Enable document public sharing: POST /api/documents/:id/share
 */
export async function enableShare(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 },
    });
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid document ID format.', statusCode: 400 },
    });
    return;
  }

  try {
    const result = await enableDocumentSharing(id, req.user.id);
    if (!result) {
      res.status(404).json({
        success: false,
        error: { message: 'Document not found or access denied.', statusCode: 404 },
      });
      return;
    }

    res.status(200).json({
      success: true,
      sharing: result,
      shareUrl: `/shared/${result.shareToken}`,
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to enable sharing:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to enable document sharing.', statusCode: 500 },
    });
  }
}

/**
 * Disable / revoke document public sharing: DELETE /api/documents/:id/share
 */
export async function disableShare(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', statusCode: 401 },
    });
    return;
  }

  const { id } = req.params;
  if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      error: { message: 'Invalid document ID format.', statusCode: 400 },
    });
    return;
  }

  try {
    const disabled = await disableDocumentSharing(id, req.user.id);
    if (!disabled) {
      res.status(404).json({
        success: false,
        error: { message: 'Document not found or access denied.', statusCode: 404 },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Document sharing revoked successfully.',
      sharing: {
        isPublic: false,
      },
    });
  } catch (error) {
    console.error('[Document Controller Error] Failed to disable sharing:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to revoke document sharing.', statusCode: 500 },
    });
  }
}



