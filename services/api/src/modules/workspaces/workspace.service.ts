import { eq, and, isNull, sql } from 'drizzle-orm';
import db from '../../db/client';
import { workspaces, workspace_members } from '../../db/schema';
import { registerWorkspaceUser } from '../auth/authhub.client';
import type { CreateWorkspaceInput } from '@vaultkit/shared';

export async function createWorkspace(params: CreateWorkspaceInput) {
  const {
    name,
    slug,
    email,
    password,
    authhub_tenant_id,
    authhub_client_id,
    authhub_client_secret
  } = params;

  return await db.transaction(async (tx) => {
    // Programmatic provisioning deferred to Phase 2 — see docs/AUTHHUB_REFERENCE.md

    // 1. Insert workspace into local DB
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name,
        slug,
        authhub_tenant_id,
        authhub_client_id,
        authhub_client_secret,
        storage_used_bytes: 0,
        storage_quota_bytes: 2147483648, // 2GB default
        plan: 'free'
      })
      .returning();

    // 2. Register user on AuthHub under the pre-provisioned tenant
    const authhubUser = await registerWorkspaceUser({
      clientId: authhub_client_id,
      email,
      password,
      name: name
    });
    // Safe extraction of the AuthHub user ID
    const authhubUserId = String(
      authhubUser?.id ?? 
      authhubUser?.user?.id ?? 
      authhubUser?.userId ?? 
      `authhub_user_${Date.now()}`
    );

    // 3. Insert creator as admin member
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

    const { authhub_client_secret: _authhubClientSecret, ...publicWorkspace } = workspace;

    return { workspace: publicWorkspace, member };
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
