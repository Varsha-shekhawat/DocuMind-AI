import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import documentRoutes from './document.routes.js';
import sharedRoutes from './shared.routes.js';

const apiRouter = Router();

// Health check -> /api/health
apiRouter.use(healthRoutes);

// Authentication routes -> /api/auth/*
apiRouter.use('/auth', authRoutes);

// Document management routes -> /api/documents/*
apiRouter.use('/documents', documentRoutes);

// Public shared document routes -> /api/shared/*
apiRouter.use('/shared', sharedRoutes);

// Future route placeholders:
// apiRouter.use('/users', userRoutes);
// apiRouter.use('/processing', processingRoutes);
// apiRouter.use('/results', resultRoutes);
// apiRouter.use('/settings', settingRoutes);

export default apiRouter;
