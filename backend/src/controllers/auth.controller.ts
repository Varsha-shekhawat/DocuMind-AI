import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createUser,
  findUserByEmail,
} from '../services/user.service.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} from '../services/auth.service.js';
import { toSafeUser } from '../models/user.model.js';

// Input validation schemas
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Please enter a valid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Handle user registration: POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  const parseResult = registerSchema.safeParse(req.body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    res.status(400).json({
      success: false,
      error: {
        message: firstIssue?.message || 'Invalid registration input',
        statusCode: 400,
        details: parseResult.error.issues,
      },
    });
    return;
  }

  const { name, email, password } = parseResult.data;

  // Check for duplicate account
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    res.status(409).json({
      success: false,
      error: {
        message: 'An account with this email address already exists.',
        statusCode: 409,
      },
    });
    return;
  }

  // Hash password and persist user
  const passwordHash = await hashPassword(password);
  const newUser = await createUser({
    name,
    email,
    passwordHash,
  });

  // Issue authentication token via HTTP-only cookie
  const token = generateToken(newUser._id.toHexString());
  setAuthCookie(res, token);

  const safeUser = toSafeUser(newUser);

  res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    user: safeUser,
  });
}

/**
 * Handle user login: POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  const parseResult = loginSchema.safeParse(req.body);

  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    res.status(400).json({
      success: false,
      error: {
        message: firstIssue?.message || 'Invalid login credentials format',
        statusCode: 400,
      },
    });
    return;
  }

  const { email, password } = parseResult.data;

  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid email or password.',
        statusCode: 401,
      },
    });
    return;
  }

  // Verify password
  const isMatch = await verifyPassword(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid email or password.',
        statusCode: 401,
      },
    });
    return;
  }

  // Issue authentication token via HTTP-only cookie
  const token = generateToken(user._id.toHexString());
  setAuthCookie(res, token);

  const safeUser = toSafeUser(user);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully.',
    user: safeUser,
  });
}

/**
 * Handle authenticated user profile check: GET /api/auth/me
 */
export function getMe(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Unauthenticated.',
        statusCode: 401,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    user: req.user,
  });
}

/**
 * Handle logout: POST /api/auth/logout
 */
export function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}
