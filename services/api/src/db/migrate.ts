import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

function run(cmd: string) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  // Generate migration files based on schema
  run('npx drizzle-kit generate --config ./drizzle.config.ts');

  // Push migrations to the database
  run('npx drizzle-kit push --config ./drizzle.config.ts --force');

  console.log('Drizzle migrations complete');
} catch (err: any) {
  console.error('Migration runner failed:', err?.message ?? err);
  process.exit(1);
}
