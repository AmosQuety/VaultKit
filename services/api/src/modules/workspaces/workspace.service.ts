import { eq, and, isNull, sql } from 'drizzle-orm';
import db from '../../db/client';
import { workspaces, workspace_members } from '../../db/schema';
import { provisionWorkspace } from './authhub.provisioner';
import { registerTenantUser } from '../auth/authhub.client';

export async function createWorkspace(params: {
  name: string;
  slug: string;
  email: string;
  password: string;
}) {
  const { name, slug, email, password } = params;

  // 1. Provision AuthHub Tenant + OAuth Client
  const authhub = await provisionWorkspace(name, slug);

  return await db.transaction(async (tx) => {
    // 2. Insert workspace into local DB
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name,
        slug,
        authhub_tenant_id: authhub.tenantId,
        authhub_client_id: authhub.clientId,
        storage_used_bytes: 0,
        storage_quota_bytes: 2147483648, // 2GB default
        plan: 'free'
      })
      .returning();

    // 3. Register user on AuthHub under the newly created tenant
    const authhubUser = await registerTenantUser(authhub.tenantId, email, password);
    // Safe extraction of the AuthHub user ID
    const authhubUserId = String(
      authhubUser?.id ?? 
      authhubUser?.user?.id ?? 
      authhubUser?.userId ?? 
      `authhub_user_${Date.now()}`
    );

    // 4. Insert creator as admin member
    const [member] = await tx
      .insert(workspace_members)
      .values({
        workspace_id: workspace.id,
        authhub_user_id: authhubUserId,
        email,
        display_name: email.split('@')[0],
        role: 'admin',
        joined_at: new Date()
      })
      .returning();

    return { workspace, member };
  });
}

export async function getWorkspace(id: string) {
  const rows = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.id, id), isNull(workspaces.deleted_at)))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const workspace = rows[0];

  // Count active members using version-agnostic sql count
  const memberCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(workspace_members)
    .where(and(eq(workspace_members.workspace_id, id), isNull(workspace_members.deleted_at)));
  
  const memberCount = Number(memberCountRes[0]?.count ?? 0);

  return {
    ...workspace,
    memberCount,
    storageUsedPercent: workspace.storage_quota_bytes > 0 
      ? parseFloat(((workspace.storage_used_bytes / workspace.storage_quota_bytes) * 100).toFixed(2))
      : 0
  };
}
