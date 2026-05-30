import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set in environment');
}

// Automatically configure SSL for Neon / secure PostgreSQL hostings
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const sslConfig = isLocal ? undefined : { rejectUnauthorized: false };

export const pgPool = new Pool({
  connectionString,
  max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  ssl: sslConfig
});

export const db = drizzle(pgPool, { schema });

export default db;
