import dotenv from 'dotenv';
dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) throw new Error(`Env var ${key} must be a number`);
  return parsed;
}

export const PORT = getEnvNumber('PORT', 5000);
export const NODE_ENV = getEnv('NODE_ENV', 'development');

// JWT secrets: dev falls back to a local-only default, but production MUST set
// real secrets — otherwise tokens would be signed with a publicly known string
// and anyone could forge an admin session. Fail the boot instead.
function getSecret(key: string, devDefault: string): string {
  const value = process.env[key];
  if (value) return value;
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      `${key} is not set. Refusing to start in production with the built-in ` +
        `development secret — set ${key} in the environment (Railway → Backend service → Variables).`
    );
  }
  return devDefault;
}

export const JWT_SECRET = getSecret('JWT_SECRET', 'dev-jwt-secret-change-me');
export const JWT_REFRESH_SECRET = getSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me');
export const JWT_EXPIRES_IN = getEnv('JWT_EXPIRES_IN', '15m');
export const JWT_REFRESH_EXPIRES_IN = getEnv('JWT_REFRESH_EXPIRES_IN', '7d');
export const CORS_ORIGIN = getEnv('CORS_ORIGIN', 'http://localhost:5173');
// Directory where uploaded documents are stored. In production this should be a
// mounted Railway volume path (e.g. /data/uploads); locally it defaults to ./uploads.
export const UPLOAD_DIR = getEnv('UPLOAD_DIR', NODE_ENV === 'production' ? '/data/uploads' : './uploads');
export const CLOUDINARY_CLOUD_NAME = getEnv('CLOUDINARY_CLOUD_NAME', '');
export const CLOUDINARY_API_KEY = getEnv('CLOUDINARY_API_KEY', '');
export const CLOUDINARY_API_SECRET = getEnv('CLOUDINARY_API_SECRET', '');
export const SMTP_HOST = getEnv('SMTP_HOST', 'smtp.gmail.com');
export const SMTP_PORT = getEnvNumber('SMTP_PORT', 587);
export const SMTP_USER = getEnv('SMTP_USER', '');
export const SMTP_PASS = getEnv('SMTP_PASS', '');
export const SMTP_FROM = getEnv('SMTP_FROM', 'noreply@projecttracker.com');
export const FIREBASE_PROJECT_ID = process.env['FIREBASE_PROJECT_ID'];
export const FIREBASE_CLIENT_EMAIL = process.env['FIREBASE_CLIENT_EMAIL'];
export const FIREBASE_PRIVATE_KEY = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n');
