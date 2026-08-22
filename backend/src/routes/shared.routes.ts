import { Router } from 'express';
import { getPublicDocument } from '../controllers/shared.controller.js';

const router = Router();

// Unauthenticated public route for viewing a shared document
router.get('/:token', getPublicDocument);

export default router;
