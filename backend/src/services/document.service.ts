import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../db/connection.js';
import type { DocumentDocument, DocumentStatus } from '../models/document.model.js';
import { getRandomAccent } from '../models/document.model.js';

const DOCUMENTS_COLLECTION = 'documents';

export function getDocumentsCollection(): Collection<DocumentDocument> {
  return getDb().collection<DocumentDocument>(DOCUMENTS_COLLECTION);
}

/**
 * Initializes database indexes for the documents collection.
 */
export async function initDocumentIndexes(): Promise<void> {
  try {
    const collection = getDocumentsCollection();
    await collection.createIndex(
      { userId: 1, createdAt: -1 },
      { name: 'idx_user_documents_created' }
    );
    console.log('[Database] Documents collection indexes verified.');
  } catch (error) {
    console.error('[Database Error] Failed to initialize document indexes:', error);
  }
}

export interface CreateDocumentInput {
  userId: string;
  name: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  pages?: number;
  words?: number;
  description?: string;
}

/**
 * Inserts a new document record scoped to the authenticated user.
 */
export async function createDocument(input: CreateDocumentInput): Promise<DocumentDocument> {
  if (!ObjectId.isValid(input.userId)) {
    throw new Error('Invalid user ID provided for document creation');
  }

  const now = new Date();
  const doc: Omit<DocumentDocument, '_id'> = {
    userId: new ObjectId(input.userId),
    name: input.name.trim(),
    originalFileName: input.originalFileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    storagePath: input.storagePath,
    status: 'Processing',
    pages: input.pages || 1,
    words: input.words || 0,
    description: input.description || 'Document uploaded and ready for processing.',
    extractedText: '',
    summary: {
      short: '',
      medium: '',
      long: '',
    },
    keyPoints: [],
    mainIdeas: [],
    suggestions: [],
    accent: getRandomAccent(),
    createdAt: now,
    updatedAt: now,
  };

  const collection = getDocumentsCollection();
  const result = await collection.insertOne(doc as DocumentDocument);

  return {
    _id: result.insertedId,
    ...doc,
  };
}

/**
 * Updates just the processing status (and optional error message) for a document.
 * Used when text extraction (or, in a later milestone, AI analysis) succeeds
 * or fails, to move a document between Processing / Ready / Needs attention.
 */
export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  processingError?: string
): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const collection = getDocumentsCollection();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        updatedAt: new Date(),
        ...(processingError !== undefined ? { processingError } : {}),
      },
      ...(status !== 'Needs attention' ? { $unset: { processingError: '' } } : {}),
    }
  );
}

export interface ExtractionResultInput {
  extractedText: string;
  pages: number;
  words: number;
}

/**
 * Persists successfully extracted text and derived metadata (page/word count)
 * for a document. This intentionally does NOT change the document's status
 * to 'Ready' -- extraction is only the first stage of the pipeline. The
 * document stays in 'Processing' until AI analysis (a later milestone)
 * completes, at which point it becomes 'Ready'. This keeps the "no document
 * appears Ready before it's actually ready" guarantee intact even though
 * analysis isn't wired up yet.
 */
export async function saveExtractionResult(id: string, input: ExtractionResultInput): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const collection = getDocumentsCollection();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        extractedText: input.extractedText,
        pages: input.pages,
        words: input.words,
        updatedAt: new Date(),
      },
      $unset: { processingError: '' },
    }
  );
}

/**
 * Retrieves all documents belonging to a specific user, sorted by most recent first.
 */
export async function getDocumentsByUserId(userId: string): Promise<DocumentDocument[]> {
  if (!ObjectId.isValid(userId)) {
    return [];
  }

  const collection = getDocumentsCollection();
  return collection
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Retrieves a single document by its ID, ensuring it belongs to the authenticated user.
 */
export async function getDocumentByIdAndUser(
  id: string,
  userId: string
): Promise<DocumentDocument | null> {
  if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
    return null;
  }

  const collection = getDocumentsCollection();
  return collection.findOne({
    _id: new ObjectId(id),
    userId: new ObjectId(userId),
  });
}

/**
 * Deletes a document by its ID and user ownership.
 */
export async function deleteDocumentByIdAndUser(
  id: string,
  userId: string
): Promise<DocumentDocument | null> {
  if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
    return null;
  }

  const collection = getDocumentsCollection();
  const existing = await collection.findOne({
    _id: new ObjectId(id),
    userId: new ObjectId(userId),
  });

  if (!existing) {
    return null;
  }

  await collection.deleteOne({
    _id: new ObjectId(id),
    userId: new ObjectId(userId),
  });

  return existing;
}
