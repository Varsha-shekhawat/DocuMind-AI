import type { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE_NAME, verifyToken } from '../services/auth.service.js';
import { findUserById } from '../services/user.service.js';
import { DatabaseUnavailableError } from '../db/connection.js';
import type { SafeUser } from '../models/user.model.js';
import { toSafeUser } from '../models/user.model.js';

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

/**
 * Authentication middleware that validates the JWT from HTTP-only cookie.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[AUTH_COOKIE_NAME] || extractBearerToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. No session token found.',
        statusCode: 401,
      },
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired authentication session.',
        statusCode: 401,
      },
    });
    return;
  }

  try {
    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authenticated user no longer exists.',
          statusCode: 401,
        },
      });
      return;
    }

    req.user = toSafeUser(user);
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    if (
      error instanceof DatabaseUnavailableError ||
      (error instanceof Error && error.name === 'DatabaseUnavailableError')
    ) {
      res.status(503).json({
        success: false,
        error: {
          message: 'Database service is temporarily unavailable. Please verify MongoDB Atlas connection and Network Access.',
          statusCode: 503,
        },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: {
        message: 'Authentication verification failed.',
        statusCode: 500,
      },
    });
  }
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}
