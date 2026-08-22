import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  createDocument,
  getDocumentsByUserId,
  getDocumentByIdAndUser,
  deleteDocumentByIdAndUser,
  updateDocumentStatus,
} from '../services/document.service.js';
import { toSafeDocument } from '../models/document.model.js';
import { removeFileIfExists } from '../middleware/upload.middleware.js';
import { runTextExtraction } from '../services/extraction-runner.service.js';

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
    // in its initial 'Processing' state. Real text extraction happens
    // asynchronously and updates extractedText/pages/words on success, or
    // moves the document to 'Needs attention' with a persisted error on
    // failure. The document does NOT move to 'Ready' here -- that terminal
    // transition happens once AI analysis is wired up in a later milestone.
    void runTextExtraction(document._id.toHexString(), file.path, file.originalname);
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
      // Extraction already succeeded; resume at the analyzing stage.
      // TODO(Milestone 5): trigger the AI analysis runner here instead of
      // leaving the document parked at 'analyzing'.
      await updateDocumentStatus(id, 'Processing', undefined, 'analyzing');
      res.status(200).json({ success: true, message: 'Reprocessing resumed from analysis.' });
      return;
    }

    await updateDocumentStatus(id, 'Processing', undefined, 'uploaded');

    res.status(200).json({
      success: true,
      message: 'Reprocessing started.',
    });

    void runTextExtraction(id, document.storagePath, document.originalFileName);
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
