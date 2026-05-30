import { eq, and, inArray, notInArray } from 'drizzle-orm';
import db from '../../db/client';
import { tags, asset_tags } from '../../db/schema';

export async function setAssetTags(params: {
  assetId: string;
  workspaceId: string;
  tagNames: string[];
  addedBy: string;
}) {
  const { assetId, workspaceId, tagNames, addedBy } = params;

  if (tagNames.length === 0) {
    // Delete all tag mappings for this asset
    await db
      .delete(asset_tags)
      .where(eq(asset_tags.asset_id, assetId));
    return [];
  }

  // Normalize tags to lowercase and filter empty strings
  const normalizedTagNames = tagNames
    .map((name) => name.toLowerCase().trim())
    .filter(Boolean);

  if (normalizedTagNames.length === 0) {
    await db
      .delete(asset_tags)
      .where(eq(asset_tags.asset_id, assetId));
    return [];
  }

  // 1. Transactionally upsert tags and mappings
  return await db.transaction(async (tx) => {
    // Upsert tags into workspace scope
    for (const tagName of normalizedTagNames) {
      await tx
        .insert(tags)
        .values({
          workspace_id: workspaceId,
          name: tagName
        })
        .onConflictDoNothing();
    }

    // Resolve tag IDs
    const resolvedTags = await tx
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.workspace_id, workspaceId),
          inArray(tags.name, normalizedTagNames)
        )
      );

    const tagIds = resolvedTags.map((t) => t.id);

    // 2. Remove mappings for tags no longer associated
    await tx
      .delete(asset_tags)
      .where(
        and(
          eq(asset_tags.asset_id, assetId),
          notInArray(asset_tags.tag_id, tagIds)
        )
      );

    // 3. Add new tag mappings
    for (const tag of resolvedTags) {
      await tx
        .insert(asset_tags)
        .values({
          asset_id: assetId,
          tag_id: tag.id,
          added_by: addedBy
        })
        .onConflictDoNothing();
    }

    return resolvedTags;
  });
}
