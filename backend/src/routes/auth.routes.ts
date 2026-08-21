import { Router } from 'express';
import { register, login, getMe, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected session check endpoint
router.get('/me', requireAuth, getMe);

export default router;
