import dotenv from 'dotenv';
import { pgPool } from '../db/client';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');
  const client = await pgPool.connect();
  try {
    console.log('Applying migrations from 0001_init.sql...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration successfully applied');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed to apply:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function main() {
  await runMigration();
  await pgPool.end();
}

main().catch((e) => {
  console.error('Migration runner failed:', e);
  process.exit(1);
});
