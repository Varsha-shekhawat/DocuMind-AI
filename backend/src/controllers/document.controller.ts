import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  createDocument,
  getDocumentsByUserId,
  getDocumentByIdAndUser,
  deleteDocumentByIdAndUser,
} from '../services/document.service.js';
import { toSafeDocument } from '../models/document.model.js';
import { removeFileIfExists } from '../middleware/upload.middleware.js';

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
