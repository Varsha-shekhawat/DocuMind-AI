import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 handler for unrecognized routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  });
}

/**
 * Centralized application error handling middleware.
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error('[Server Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
    },
  });
}
