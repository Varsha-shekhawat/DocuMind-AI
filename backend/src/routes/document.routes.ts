import { Router } from 'express';
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  retryDocumentProcessing,
  askDocumentQuestion,
  exportDocument,
  getNotes,
  addNote,
  updateNote,
  deleteNote,
  getShareStatus,
  enableShare,
  disableShare,
} from '../controllers/document.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { documentUpload } from '../middleware/upload.middleware.js';

const router = Router();

// Enforce authentication on all document operations
router.use(requireAuth);

router.post('/upload', documentUpload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.get('/:id/export', exportDocument);
router.post('/:id/ask', askDocumentQuestion);
router.get('/:id/share', getShareStatus);
router.post('/:id/share', enableShare);
router.delete('/:id/share', disableShare);
router.get('/:id/notes', getNotes);
router.post('/:id/notes', addNote);
router.patch('/:id/notes/:noteId', updateNote);
router.delete('/:id/notes/:noteId', deleteNote);
router.post('/:id/retry', retryDocumentProcessing);
router.delete('/:id', deleteDocument);

export default router;
