import express, { type Application } from 'express';
import cors, { type CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

/**
 * Builds the list of allowed frontend origins from environment configuration and local defaults.
 */
function getAllowedOrigins(): string[] {
  const configured = (config.clientUrl || '')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'];
  return Array.from(new Set([...configured, ...defaults]));
}

/**
 * Creates and configures the Express application.
 */
export function createApp(): Application {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  const corsOptions: CorsOptions = {
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (e.g. server-to-server health checks, curl)
      if (!requestOrigin) {
        return callback(null, true);
      }

      const normalizedOrigin = requestOrigin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Check if origin matches an allowed regex (e.g. Vercel preview URLs if configured)
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed.includes('*')) {
          const regex = new RegExp(`^${allowed.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);
          return regex.test(normalizedOrigin);
        }
        return false;
      });

      if (isAllowed) {
        return callback(null, true);
      }

      console.warn(`[CORS Blocked] Origin not allowed: ${requestOrigin}`);
      return callback(new Error(`Origin ${requestOrigin} not allowed by CORS policy`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  };

  // Basic security and parsing middlewares
  app.use(cors(corsOptions));
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
