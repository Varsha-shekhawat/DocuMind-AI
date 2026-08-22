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

export interface DocumentNote {
  id: string;
  content: string;
  excerpt?: string;
  color: DocumentAccent;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeDocumentNote {
  id: string;
  content: string;
  excerpt?: string;
  color: DocumentAccent;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSharing {
  isPublic: boolean;
  shareToken?: string;
  sharedAt?: Date;
  revokedAt?: Date;
}

export interface SafeDocumentSharing {
  isPublic: boolean;
  shareToken?: string;
  sharedAt?: string;
}

export interface PublicSharedDocument {
  title: string;
  originalFileName: string;
  pages: number;
  words: string;
  date: string;
  status: DocumentStatus;
  summary: string;
  summaryVariants: DocumentSummary;
  keyPoints: string[];
  mainIdeas: MainIdea[];
  suggestions: string[];
  accent: DocumentAccent;
  sharedAt: string;
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
  notes?: DocumentNote[];
  sharing?: DocumentSharing;
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
  notes: SafeDocumentNote[];
  sharing?: SafeDocumentSharing;
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
    notes: (doc.notes || []).map((n) => ({
      id: n.id,
      content: n.content,
      excerpt: n.excerpt,
      color: n.color || 'ochre',
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
      updatedAt: n.updatedAt instanceof Date ? n.updatedAt.toISOString() : String(n.updatedAt),
    })),
    sharing: doc.sharing
      ? {
          isPublic: !!doc.sharing.isPublic,
          shareToken: doc.sharing.shareToken,
          sharedAt: doc.sharing.sharedAt ? doc.sharing.sharedAt.toISOString() : undefined,
        }
      : undefined,
    accent: doc.accent || 'ochre',
    processingError: doc.processingError,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Transforms a database DocumentDocument into a sanitized, public-safe DTO.
 * Guarantees zero leakage of internal IDs, user identity, private notes, or extracted text.
 */
export function toPublicSharedDocument(doc: DocumentDocument): PublicSharedDocument {
  const summaryText = doc.summary?.medium || doc.summary?.short || doc.summary?.long || doc.description || '';
  const dateStr = doc.createdAt
    ? new Date(doc.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  return {
    title: doc.name.replace(/\.[^/.]+$/, ''),
    originalFileName: doc.originalFileName,
    pages: doc.pages || 1,
    words: doc.words ? doc.words.toLocaleString() : '—',
    date: dateStr,
    status: doc.status,
    summary: summaryText,
    summaryVariants: doc.summary || { short: '', medium: '', long: '' },
    keyPoints: doc.keyPoints || [],
    mainIdeas: doc.mainIdeas || [],
    suggestions: doc.suggestions || [],
    accent: doc.accent || 'ochre',
    sharedAt: doc.sharing?.sharedAt ? doc.sharing.sharedAt.toISOString() : new Date().toISOString(),
  };
}
