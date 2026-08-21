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
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  dbName: process.env.MONGODB_DB_NAME || 'UNFOLD',
  jwtSecret: process.env.JWT_SECRET || 'unfold_dev_jwt_secret_change_in_production_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
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

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
