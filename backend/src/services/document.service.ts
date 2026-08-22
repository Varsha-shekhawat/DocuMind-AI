import { Collection, ObjectId } from 'mongodb';
import crypto from 'node:crypto';
import { getDb } from '../db/connection.js';
import type {
  DocumentDocument,
  DocumentStatus,
  DocumentStage,
  DocumentSummary,
  MainIdea,
  DocumentNote,
  SafeDocumentNote,
  DocumentAccent,
} from '../models/document.model.js';
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
    stage: 'uploaded',
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
 * Updates just the processing status (and optional stage/error message) for
 * a document. Used at each pipeline transition -- moving into 'extracting',
 * into 'analyzing' (via saveExtractionResult below), or into a terminal
 * 'Ready'/'Needs attention' state.
 */
export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  processingError?: string,
  stage?: DocumentStage
): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const collection = getDocumentsCollection();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        updatedAt: new Date(),
        ...(stage !== undefined ? { stage } : {}),
        ...(processingError !== undefined ? { processingError } : {}),
      },
      ...(status !== 'Needs attention' ? { $unset: { processingError: '' } } : {}),
    }
  );
}

/**
 * Marks a document as actively in a given pipeline stage without touching
 * its coarse status (e.g. moving into 'extracting' while status stays
 * 'Processing'). Lets the Processing page show real, specific progress.
 */
export async function markStage(id: string, stage: DocumentStage): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const collection = getDocumentsCollection();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { stage, updatedAt: new Date() } }
  );
}

export interface ExtractionResultInput {
  extractedText: string;
  pages: number;
  words: number;
}

/**
 * Persists successfully extracted text and derived metadata (page/word count)
 * for a document, and advances its stage to 'analyzing'. This intentionally
 * does NOT change the document's status to 'Ready' -- extraction is only the
 * first stage of the pipeline. The document stays in status 'Processing'
 * (now at stage 'analyzing') until AI analysis (a later milestone) completes,
 * at which point it becomes 'Ready'. This keeps the "no document appears
 * Ready before it's actually ready" guarantee intact even though analysis
 * isn't wired up yet.
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
        stage: 'analyzing',
        updatedAt: new Date(),
      },
      $unset: { processingError: '' },
    }
  );
}

export interface AnalysisResultInput {
  summary: DocumentSummary;
  keyPoints: string[];
  mainIdeas: MainIdea[];
  suggestions: string[];
}

/**
 * Persists successfully generated AI analysis results (summary variants,
 * key points, main ideas, and suggestions) and advances the document's
 * stage to 'ready' and status to 'Ready'.
 */
export async function saveAnalysisResult(id: string, input: AnalysisResultInput): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const collection = getDocumentsCollection();
  await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        summary: input.summary,
        description: input.summary.short || input.summary.medium || 'Document processed and ready for reading.',
        keyPoints: input.keyPoints,
        mainIdeas: input.mainIdeas,
        suggestions: input.suggestions,
        stage: 'ready',
        status: 'Ready',
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

export interface AddNoteInput {
  content: string;
  excerpt?: string;
  color?: DocumentAccent;
}

export interface UpdateNoteInput {
  content?: string;
  excerpt?: string;
  color?: DocumentAccent;
}

/**
 * Adds a new note/annotation to a document.
 */
export async function addDocumentNote(
  documentId: string,
  userId: string,
  input: AddNoteInput
): Promise<SafeDocumentNote | null> {
  if (!ObjectId.isValid(documentId) || !ObjectId.isValid(userId)) {
    return null;
  }

  const now = new Date();
  const newNote: DocumentNote = {
    id: crypto.randomUUID(),
    content: input.content.trim(),
    excerpt: input.excerpt?.trim() || undefined,
    color: input.color || 'ochre',
    createdAt: now,
    updatedAt: now,
  };

  const collection = getDocumentsCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(documentId), userId: new ObjectId(userId) },
    {
      $push: { notes: newNote },
      $set: { updatedAt: now },
    },
    { returnDocument: 'after' }
  );

  if (!result) {
    return null;
  }

  return {
    id: newNote.id,
    content: newNote.content,
    excerpt: newNote.excerpt,
    color: newNote.color,
    createdAt: newNote.createdAt.toISOString(),
    updatedAt: newNote.updatedAt.toISOString(),
  };
}

/**
 * Updates an existing note on a document.
 */
export async function updateDocumentNote(
  documentId: string,
  userId: string,
  noteId: string,
  input: UpdateNoteInput
): Promise<SafeDocumentNote | null> {
  if (!ObjectId.isValid(documentId) || !ObjectId.isValid(userId) || !noteId) {
    return null;
  }

  const now = new Date();
  const collection = getDocumentsCollection();
  const doc = await collection.findOne({
    _id: new ObjectId(documentId),
    userId: new ObjectId(userId),
  });

  if (!doc || !doc.notes) {
    return null;
  }

  const noteIndex = doc.notes.findIndex((n) => n.id === noteId);
  if (noteIndex === -1) {
    return null;
  }

  const existingNote = doc.notes[noteIndex];
  if (!existingNote) {
    return null;
  }

  const updatedNote: DocumentNote = {
    ...existingNote,
    content: input.content !== undefined ? input.content.trim() : existingNote.content,
    excerpt: input.excerpt !== undefined ? input.excerpt.trim() : existingNote.excerpt,
    color: input.color || existingNote.color,
    updatedAt: now,
  };

  await collection.updateOne(
    { _id: new ObjectId(documentId), userId: new ObjectId(userId), 'notes.id': noteId },
    {
      $set: {
        'notes.$': updatedNote,
        updatedAt: now,
      },
    }
  );

  return {
    id: updatedNote.id,
    content: updatedNote.content,
    excerpt: updatedNote.excerpt,
    color: updatedNote.color,
    createdAt: updatedNote.createdAt instanceof Date ? updatedNote.createdAt.toISOString() : String(updatedNote.createdAt),
    updatedAt: updatedNote.updatedAt.toISOString(),
  };
}

/**
 * Deletes a note from a document.
 */
export async function deleteDocumentNote(
  documentId: string,
  userId: string,
  noteId: string
): Promise<boolean> {
  if (!ObjectId.isValid(documentId) || !ObjectId.isValid(userId) || !noteId) {
    return false;
  }

  const collection = getDocumentsCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(documentId), userId: new ObjectId(userId) },
    {
      $pull: { notes: { id: noteId } },
      $set: { updatedAt: new Date() },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Retrieves all notes for a specific document.
 */
export async function getDocumentNotes(
  documentId: string,
  userId: string
): Promise<SafeDocumentNote[] | null> {
  if (!ObjectId.isValid(documentId) || !ObjectId.isValid(userId)) {
    return null;
  }

  const collection = getDocumentsCollection();
  const doc = await collection.findOne({
    _id: new ObjectId(documentId),
    userId: new ObjectId(userId),
  });

  if (!doc) {
    return null;
  }

  return (doc.notes || []).map((n) => ({
    id: n.id,
    content: n.content,
    excerpt: n.excerpt,
    color: n.color || 'ochre',
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
    updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : String(n.updatedAt),
  }));
}

