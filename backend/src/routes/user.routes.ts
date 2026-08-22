import { Router } from 'express';
import { getUserSettings, updateSettings } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Enforce authentication on all user settings routes
router.use(requireAuth);

router.get('/settings', getUserSettings);
router.patch('/settings', updateSettings);

export default router;
