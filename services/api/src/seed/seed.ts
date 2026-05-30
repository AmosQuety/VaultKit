import dotenv from 'dotenv';
import { pgPool } from '../db/client';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '0001_init.sql'), 'utf8');
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function seedData() {
  const client = await pgPool.connect();
  try {
    const workspaceRes = await client.query(
      `INSERT INTO workspaces (name, slug, authhub_tenant_id, authhub_client_id, plan)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      ['Test Workspace', 'test-workspace', 'tenant_test_workspace', 'client_test_workspace', 'free']
    );
    let workspaceId: string;
    if (workspaceRes.rows.length > 0) {
      workspaceId = workspaceRes.rows[0].id;
    } else {
      const res = await client.query(`SELECT id FROM workspaces WHERE slug = $1`, ['test-workspace']);
      workspaceId = res.rows[0].id;
    }

    const memberRes = await client.query(
      `INSERT INTO workspace_members (workspace_id, authhub_user_id, email, display_name, role, joined_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (workspace_id, authhub_user_id) DO NOTHING
       RETURNING id`,
      [workspaceId, 'authhub_user_test_1', 'owner@example.com', 'Owner Test', 'admin']
    );

    console.log('Seed complete');
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

async function main() {
  await runMigration();
  await seedData();
  await pgPool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
