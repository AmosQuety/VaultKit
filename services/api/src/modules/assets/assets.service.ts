import { eq, and, isNull } from 'drizzle-orm';
import db from '../../db/client';
import { assets, asset_versions, asset_previews, asset_tags, tags, workspace_members } from '../../db/schema';
import { generatePresignedUrl } from './presign.service';
import { setAssetTags } from './tag.service';

export async function getAsset(id: string, workspaceId: string) {
  // Fetch asset and join uploader info
  const assetRows = await db
    .select({
      id: assets.id,
      workspace_id: assets.workspace_id,
      collection_id: assets.collection_id,
      name: assets.name,
      description: assets.description,
      file_type: assets.file_type,
      extension: assets.extension,
      size_bytes: assets.size_bytes,
      content_hash: assets.content_hash,
      storage_key: assets.storage_key,
      version_number: assets.version_number,
      status: assets.status,
      approval_status: assets.approval_status,
      blur_hash: assets.blur_hash,
      uploaded_by: assets.uploaded_by,
      last_accessed_at: assets.last_accessed_at,
      created_at: assets.created_at,
      updated_at: assets.updated_at,
      uploaderName: workspace_members.display_name
    })
    .from(assets)
    .leftJoin(workspace_members, eq(assets.uploaded_by, workspace_members.id))
    .where(and(eq(assets.id, id), eq(assets.workspace_id, workspaceId), isNull(assets.deleted_at)))
    .limit(1);

  if (assetRows.length === 0) {
    return null;
  }

  const asset = assetRows[0];

  // Update last accessed timestamp asynchronously
  db.update(assets)
    .set({ last_accessed_at: new Date() })
    .where(eq(assets.id, id))
    .catch((err) => console.error(`Failed to update asset last_accessed_at for ${id}:`, err));

  // Generate presigned download link
  const presigned = await generatePresignedUrl(asset.storage_key);

  // Fetch previews
  const previews = await db
    .select()
    .from(asset_previews)
    .where(eq(asset_previews.asset_id, id));

  // Fetch tags
  const tagRows = await db
    .select({
      id: tags.id,
      name: tags.name
    })
    .from(asset_tags)
    .leftJoin(tags, eq(asset_tags.tag_id, tags.id))
    .where(eq(asset_tags.asset_id, id));

  // Fetch versions
  const versions = await db
    .select()
    .from(asset_versions)
    .where(eq(asset_versions.asset_id, id))
    .orderBy(asset_versions.version_number);

  return {
    ...asset,
    downloadUrl: presigned.url,
    downloadUrlExpiresAt: presigned.expiresAt,
    previews: {
      sm: previews.find((p) => p.size === 'sm')?.storage_key ?? null,
      md: previews.find((p) => p.size === 'md')?.storage_key ?? null,
      lg: previews.find((p) => p.size === 'lg')?.storage_key ?? null
    },
    tags: tagRows.map((t) => t.name).filter(Boolean),
    versions
  };
}

export async function updateAsset(params: {
  id: string;
  workspaceId: string;
  memberId: string;
  updates: {
    name?: string;
    description?: string;
    collectionId?: string | null;
    tags?: string[];
    versionNumber?: number;
  };
}) {
  const { id, workspaceId, memberId, updates } = params;

  return await db.transaction(async (tx) => {
    const existingRows = await tx
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.workspace_id, workspaceId), isNull(assets.deleted_at)))
      .limit(1);

    if (existingRows.length === 0) {
      throw new Error('Asset not found');
    }

    const asset = existingRows[0];

    // Conflict Check: prevent overwriting someone else's concurrent edit
    if (updates.versionNumber !== undefined && asset.version_number !== updates.versionNumber) {
      const error: any = new Error('Conflict: The asset was modified by another request. Please reload.');
      error.statusCode = 409;
      error.code = 'VERSION_CONFLICT';
      throw error;
    }

    // Prepare metadata updates
    const setUpdates: any = {
      updated_at: new Date()
    };

    if (updates.name !== undefined) setUpdates.name = updates.name;
    if (updates.description !== undefined) setUpdates.description = updates.description;
    if (updates.collectionId !== undefined) setUpdates.collection_id = updates.collectionId;

    // Update tags if provided
    if (updates.tags !== undefined) {
      await setAssetTags({
        assetId: id,
        workspaceId,
        tagNames: updates.tags,
        addedBy: memberId
      });
    }

    // Increment version number in DB
    setUpdates.version_number = asset.version_number + 1;

    const [updatedAsset] = await tx
      .update(assets)
      .set(setUpdates)
      .where(eq(assets.id, id))
      .returning();

    return updatedAsset;
  });
}

export async function softDeleteAsset(params: {
  id: string;
  workspaceId: string;
  memberId: string;
  role: string;
}) {
  const { id, workspaceId, memberId, role } = params;

  const rows = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, id), eq(assets.workspace_id, workspaceId), isNull(assets.deleted_at)))
    .limit(1);

  if (rows.length === 0) {
    throw new Error('Asset not found');
  }

  const asset = rows[0];

  // Role Gate: Editors can only delete their own uploads, admins can delete any
  if (role !== 'admin' && asset.uploaded_by !== memberId) {
    const error: any = new Error('You can only delete your own uploaded assets');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const [deletedAsset] = await db
    .update(assets)
    .set({
      deleted_at: new Date(),
      updated_at: new Date()
    })
    .where(eq(assets.id, id))
    .returning();

  return deletedAsset;
}
