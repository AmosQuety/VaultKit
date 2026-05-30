import { eq, and, isNull, sql } from 'drizzle-orm';
import db from '../../db/client';
import { workspace_members } from '../../db/schema';

export async function inviteMember(params: {
  workspaceId: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invitedBy: string;
}) {
  const { workspaceId, email, role, invitedBy } = params;

  // Check if member already exists
  const existing = await db
    .select()
    .from(workspace_members)
    .where(
      and(
        eq(workspace_members.workspace_id, workspaceId),
        eq(workspace_members.email, email),
        isNull(workspace_members.deleted_at)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Member with this email already exists in the workspace');
  }

  const [member] = await db
    .insert(workspace_members)
    .values({
      workspace_id: workspaceId,
      // Since they haven't authenticated yet, we use a placeholder user ID
      authhub_user_id: `invited:${email}`,
      email,
      display_name: email.split('@')[0],
      role,
      invited_by: invitedBy
    })
    .returning();

  return member;
}

export async function changeMemberRole(params: {
  workspaceId: string;
  memberId: string;
  newRole: 'admin' | 'editor' | 'viewer';
}) {
  const { workspaceId, memberId, newRole } = params;

  // If changing role FROM admin, ensure there is at least one other active admin
  const currentMemberRows = await db
    .select()
    .from(workspace_members)
    .where(and(eq(workspace_members.id, memberId), eq(workspace_members.workspace_id, workspaceId)))
    .limit(1);

  if (currentMemberRows.length === 0) {
    throw new Error('Member not found');
  }

  const currentMember = currentMemberRows[0];

  if (currentMember.role === 'admin' && newRole !== 'admin') {
    // Count remaining admins
    const activeAdmins = await db
      .select({ count: sql<number>`count(*)` })
      .from(workspace_members)
      .where(
        and(
          eq(workspace_members.workspace_id, workspaceId),
          eq(workspace_members.role, 'admin'),
          isNull(workspace_members.deleted_at)
        )
      );

    const adminCount = Number(activeAdmins[0]?.count ?? 0);
    if (adminCount <= 1) {
      throw new Error('Cannot demote the only administrator of this workspace');
    }
  }

  const [updatedMember] = await db
    .update(workspace_members)
    .set({
      role: newRole,
      updated_at: new Date()
    })
    .where(
      and(
        eq(workspace_members.id, memberId),
        eq(workspace_members.workspace_id, workspaceId),
        isNull(workspace_members.deleted_at)
      )
    )
    .returning();

  return updatedMember;
}

export async function removeMember(params: {
  workspaceId: string;
  memberId: string;
}) {
  const { workspaceId, memberId } = params;

  const currentMemberRows = await db
    .select()
    .from(workspace_members)
    .where(and(eq(workspace_members.id, memberId), eq(workspace_members.workspace_id, workspaceId)))
    .limit(1);

  if (currentMemberRows.length === 0) {
    throw new Error('Member not found');
  }

  const currentMember = currentMemberRows[0];

  if (currentMember.role === 'admin') {
    // Ensure there is at least one other active admin
    const activeAdmins = await db
      .select({ count: sql<number>`count(*)` })
      .from(workspace_members)
      .where(
        and(
          eq(workspace_members.workspace_id, workspaceId),
          eq(workspace_members.role, 'admin'),
          isNull(workspace_members.deleted_at)
        )
      );

    const adminCount = Number(activeAdmins[0]?.count ?? 0);
    if (adminCount <= 1) {
      throw new Error('Cannot remove the only administrator of this workspace');
    }
  }

  // Soft delete the member
  const [removedMember] = await db
    .update(workspace_members)
    .set({
      deleted_at: new Date(),
      updated_at: new Date()
    })
    .where(
      and(
        eq(workspace_members.id, memberId),
        eq(workspace_members.workspace_id, workspaceId),
        isNull(workspace_members.deleted_at)
      )
    )
    .returning();

  return removedMember;
}
