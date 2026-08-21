import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { config } from '../config/env.js';

export const AUTH_COOKIE_NAME = 'unfold_token';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plaintext password with a hashed password.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JwtPayload {
  userId: string;
}

/**
 * Signs a JWT with the user's ID.
 */
export function generateToken(userId: string): string {
  const payload: JwtPayload = { userId };
  const options: SignOptions = {
    expiresIn: (config.jwtExpiresIn || '7d') as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwtSecret, options);
}

/**
 * Verifies a JWT token and extracts the payload.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (decoded && typeof decoded === 'object' && typeof decoded.userId === 'string') {
      return decoded;
    }
    return null;
  } catch (_err) {
    return null;
  }
}

/**
 * Returns standardized cookie options for the HTTP-only auth token.
 */
export function getAuthCookieOptions(): CookieOptions {
  const isProduction = config.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  };
}

/**
 * Sets the authentication HTTP-only cookie on the response.
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

/**
 * Clears the authentication cookie from the response.
 */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });
}
