import multer, { type FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import type { Request } from 'express';

// Define and ensure upload directory exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 25 Megabytes in bytes
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.txt']);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/octet-stream', // Fallback for some OS/browser docx/doc attachments
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    cb(new Error(`Unsupported file type: "${ext}". Please upload a PDF, DOC, DOCX, or TXT file.`));
    return;
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype) && !file.mimetype.startsWith('text/')) {
    cb(new Error(`Unsupported MIME type: "${file.mimetype}". Please upload a valid document file.`));
    return;
  }

  cb(null, true);
}

export const documentUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter,
});

/**
 * Safely removes a file from disk given its path.
 */
export async function removeFileIfExists(filePath: string): Promise<void> {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error(`[File Storage Error] Failed to delete file at "${filePath}":`, err);
  }
}
