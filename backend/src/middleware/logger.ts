import type { Request, Response, NextFunction } from 'express';

/**
 * Development request logging middleware.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(`[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
  });

  next();
}
