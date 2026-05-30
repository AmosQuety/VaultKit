import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3001',
  
  // Database & Redis
  databaseUrl: required('DATABASE_URL'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  
  // AuthHub
  authhubBaseUrl: required('AUTHHUB_BASE_URL'),
  authhubJwksUrl: required('AUTHHUB_JWKS_URL'),
  authhubAdminToken: process.env.AUTHHUB_ADMIN_TOKEN ?? '',
  authhubDashboardClientId: process.env.AUTHHUB_DASHBOARD_CLIENT_ID ?? '',
  authhubDashboardClientSecret: process.env.AUTHHUB_DASHBOARD_CLIENT_SECRET ?? '',
  
  // Web Application
  webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:5173',
  
  // Storage Provider: r2 | s3 | local
  storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
  
  // Cloudflare R2 Options
  r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2AccessKeySecret: process.env.R2_ACCESS_KEY_SECRET ?? '',
  r2Bucket: process.env.R2_BUCKET ?? '',
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? '',
  
  // Local Storage Options
  localStorageDir: process.env.LOCAL_STORAGE_DIR ?? './storage',
  
  // Rate Limiting
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
  rateLimitMaxFree: Number(process.env.RATE_LIMIT_MAX_FREE ?? 60)
};