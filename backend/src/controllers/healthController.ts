import type { Request, Response } from 'express';
import { isDbConnected } from '../db/connection.js';
import { config } from '../config/env.js';

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    message: 'UNFOLD API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: {
      status: isDbConnected() ? 'connected' : 'disconnected',
    },
  });
}
