import { Router } from 'express';
import {
  register,
  login,
  getMe,
  logout,
  getUserSettings,
  updateSettings,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected session check and settings endpoints
router.get('/me', requireAuth, getMe);
router.get('/settings', requireAuth, getUserSettings);
router.patch('/settings', requireAuth, updateSettings);

export default router;
