import { ObjectId } from 'mongodb';

export type DocumentStatus = 'Processing' | 'Ready' | 'Needs attention';
export type DocumentAccent = 'ochre' | 'terracotta' | 'sage' | 'bluegreen' | 'plum';

/**
 * Fine-grained pipeline position, independent of the coarse `status` field
 * that the document library's filters (All/Ready/Processing/Needs attention)
 * already depend on. `stage` exists purely so the Processing page can show
 * real, specific progress ("Extracting text..." vs "Analyzing content...")
 * instead of a single opaque "Processing" blob.
 *
 *   uploaded -> extracting -> analyzing -> ready
 *                   \             \
 *                    -> failed <--
 *
 * 'analyzing' is entered once text extraction succeeds. Nothing currently
 * advances a document out of 'analyzing' -- that transition is added when
 * AI analysis is implemented, which will call markStage('ready') /
 * status 'Ready' on success, or stage 'failed' / status 'Needs attention'
 * on failure, mirroring exactly how extraction does it today.
 */
export type DocumentStage = 'uploaded' | 'extracting' | 'analyzing' | 'ready' | 'failed';

export interface DocumentSummary {
  short: string;
  medium: string;
  long: string;
}

export interface MainIdea {
  title: string;
  body: string;
}

export interface DocumentDocument {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  status: DocumentStatus;
  stage: DocumentStage;
  pages: number;
  words: number;
  description: string;
  extractedText: string;
  summary: DocumentSummary;
  keyPoints: string[];
  mainIdeas: MainIdea[];
  suggestions: string[];
  accent: DocumentAccent;
  processingError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeDocument {
  id: string;
  userId: string;
  name: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  stage: DocumentStage;
  pages: number;
  words: string;
  description: string;
  summary: string;
  summaryVariants: DocumentSummary;
  keyPoints: string[];
  mainIdeas: MainIdea[];
  suggestions: string[];
  accent: DocumentAccent;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

const ACCENT_PALETTE: DocumentAccent[] = ['ochre', 'terracotta', 'sage', 'bluegreen', 'plum'];

export function getRandomAccent(): DocumentAccent {
  const randomIndex = Math.floor(Math.random() * ACCENT_PALETTE.length);
  return ACCENT_PALETTE[randomIndex] ?? 'ochre';
}

/**
 * Transforms a database DocumentDocument into a client-safe SafeDocument object.
 */
export function toSafeDocument(doc: DocumentDocument): SafeDocument {
  const summaryText = doc.summary?.medium || doc.summary?.short || doc.summary?.long || doc.description || '';

  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    name: doc.name,
    originalFileName: doc.originalFileName,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    status: doc.status,
    stage: doc.stage || (doc.status === 'Ready' ? 'ready' : doc.status === 'Needs attention' ? 'failed' : 'uploaded'),
    pages: doc.pages || 1,
    words: doc.words ? doc.words.toLocaleString() : '—',
    description: doc.description || 'Document uploaded and awaiting reading.',
    summary: summaryText,
    summaryVariants: doc.summary || { short: '', medium: '', long: '' },
    keyPoints: doc.keyPoints || [],
    mainIdeas: doc.mainIdeas || [],
    suggestions: doc.suggestions || [],
    accent: doc.accent || 'ochre',
    processingError: doc.processingError,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
