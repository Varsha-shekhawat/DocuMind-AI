import { Router } from 'express';
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  retryDocumentProcessing,
  askDocumentQuestion,
} from '../controllers/document.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { documentUpload } from '../middleware/upload.middleware.js';

const router = Router();

// Enforce authentication on all document operations
router.use(requireAuth);

router.post('/upload', documentUpload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.post('/:id/ask', askDocumentQuestion);
router.post('/:id/retry', retryDocumentProcessing);
router.delete('/:id', deleteDocument);

export default router;
