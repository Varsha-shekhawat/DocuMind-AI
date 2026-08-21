import express, { type Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

/**
 * Creates and configures the Express application.
 */
export function createApp(): Application {
  const app = express();

  // Basic security and parsing middlewares
  app.use(cors({
    origin: config.clientUrl,
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Development request logging
  app.use(requestLogger);

  // API Routes mounted at /api
  app.use('/api', apiRouter);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Centralized error handling
  app.use(errorHandler);

  return app;
}

export default createApp;
