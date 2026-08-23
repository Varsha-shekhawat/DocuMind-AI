import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: string;
  clientUrl: string;
  mongoUri: string;
  dbName: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  cookieSecure: boolean;
  cookieSameSite: 'lax' | 'none' | 'strict';
  geminiApiKey: string;
  geminiModel: string;
}

/**
 * Cookie attributes default from NODE_ENV, but can be forced explicitly.
 * This matters because a cross-origin deployment (frontend and backend on
 * different domains, e.g. Vercel + Render) REQUIRES sameSite=none + secure=true
 * or the browser will silently refuse to attach the auth cookie to fetch
 * requests -- which surfaces as "Authentication required. No session token
 * found." on the very next authenticated call after a successful login.
 * Relying solely on NODE_ENV is fragile because it's easy to deploy a
 * "production" backend without ever exporting NODE_ENV=production. These
 * overrides let the operator be explicit instead of guessing.
 */
function resolveCookieSecure(nodeEnv: string): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return nodeEnv === 'production';
}

function resolveCookieSameSite(nodeEnv: string): 'lax' | 'none' | 'strict' {
  const raw = process.env.COOKIE_SAMESITE?.toLowerCase();
  if (raw === 'lax' || raw === 'none' || raw === 'strict') return raw;
  return nodeEnv === 'production' ? 'none' : 'lax';
}

const resolvedNodeEnv = process.env.NODE_ENV || 'development';

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: resolvedNodeEnv,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  dbName: process.env.MONGODB_DB_NAME || 'UNFOLD',
  jwtSecret: process.env.JWT_SECRET || 'unfold_dev_jwt_secret_change_in_production_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecure: resolveCookieSecure(resolvedNodeEnv),
  cookieSameSite: resolveCookieSameSite(resolvedNodeEnv),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
};

export interface ConfigValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.mongoUri) {
    errors.push('MONGODB_URI is not set in environment variables.');
  }

  if (!process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET is not set in environment variables. Using development fallback secret.');
  }

  if (config.nodeEnv === 'production') {
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET must be explicitly set in production environment.');
    }
    if (config.clientUrl === 'http://localhost:5173') {
      warnings.push('CLIENT_URL is set to default localhost in production environment.');
    }
  }

  if (config.cookieSameSite === 'none' && !config.cookieSecure) {
    errors.push(
      'Invalid cookie configuration: sameSite=none requires secure=true, or browsers will reject the cookie entirely. Set COOKIE_SECURE=true (requires HTTPS) or COOKIE_SAMESITE=lax.'
    );
  }

  if (!config.geminiApiKey) {
    warnings.push('GEMINI_API_KEY is not set. AI document analysis and Q&A will be unavailable until it is configured.');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
