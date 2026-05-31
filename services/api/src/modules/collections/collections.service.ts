import { eq, and, isNull, gt, lt, sql, desc, asc } from 'drizzle-orm';
import db from '../../db/client';
import { collections, assets, asset_previews, workspace_members } from '../../db/schema';

// Helper to make safe URL-friendly path segments
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createCollection(params: {
  workspaceId: string;
  parentId?: string | null;
  name: string;
  createdBy: string;
}) {
  const { workspaceId, parentId, name, createdBy } = params;
  const segment = slugify(name);

  let materializedPath = `/${segment}`;

  if (parentId) {
    const parentRows = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, parentId), eq(collections.workspace_id, workspaceId), isNull(collections.deleted_at)))
      .limit(1);

    if (parentRows.length === 0) {
      throw new Error('Parent collection not found');
    }

    const parent = parentRows[0];
    materializedPath = `${parent.path.replace(/\/+$/, '')}/${segment}`;
  }

  const [collection] = await db
    .insert(collections)
    .values({
      workspace_id: workspaceId,
      parent_id: parentId ?? null,
      name,
      path: materializedPath,
      created_by: createdBy
    })
    .returning();

  return collection;
}

export async function listCollections(params: {
  workspaceId: string;
  cursor?: string | null;
  limit: number;
}) {
  const { workspaceId, cursor, limit } = params;

  let queryConditions = and(
    eq(collections.workspace_id, workspaceId),
    isNull(collections.parent_id),
    isNull(collections.deleted_at)
  );

  if (cursor) {
    queryConditions = and(queryConditions, gt(collections.id, cursor));
  }

  const rows = await db
    .select()
    .from(collections)
    .where(queryConditions)
    .orderBy(asc(collections.id))
    .limit(limit + 1); // Fetch limit + 1 to determine if hasMore

  const hasMore = rows.length > limit;
  const paginatedRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = paginatedRows.length > 0 ? paginatedRows[paginatedRows.length - 1].id : null;

  return {
    collections: paginatedRows,
    cursor: nextCursor,
    hasMore
  };
}

export async function getCollection(id: string, workspaceId: string) {
  const rows = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.workspace_id, workspaceId), isNull(collections.deleted_at)))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const collection = rows[0];

  // Count active assets in this collection
  const assetCountRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(and(eq(assets.collection_id, id), isNull(assets.deleted_at)));

  const assetCount = Number(assetCountRes[0]?.count ?? 0);

  return {
    ...collection,
    assetCount
  };
}

export async function listCollectionAssets(params: {
  collectionId: string;
  workspaceId: string;
  cursor?: string | null;
  limit: number;
  sort: 'name' | 'created_at' | 'size' | 'updated_at';
  order: 'asc' | 'desc';
  type?: string | null;
}) {
  const { collectionId, workspaceId, cursor, limit, sort, order, type } = params;

  let conditions = and(
    eq(assets.collection_id, collectionId),
    eq(assets.workspace_id, workspaceId),
    isNull(assets.deleted_at)
  );

  if (type) {
    conditions = and(conditions, eq(assets.extension, type.toLowerCase().trim()));
  }

  // Determine sort column
  let sortColumn: any = assets.created_at;
  if (sort === 'name') sortColumn = assets.name;
  else if (sort === 'size') sortColumn = assets.size_bytes;
  else if (sort === 'updated_at') sortColumn = assets.updated_at;

  const orderDirection = order === 'desc' ? desc(sortColumn) : asc(sortColumn);

  // For cursor-based pagination on sorted queries, standard is using id + sort value.
  // To keep it simple and robust, let's use the ID for unique pagination cursor.
  if (cursor) {
    conditions = and(conditions, order === 'desc' ? lt(assets.id, cursor) : gt(assets.id, cursor));
  }

  const assetRows = await db
    .select({
      id: assets.id,
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
      created_at: assets.created_at,
      updated_at: assets.updated_at,
      uploaderName: workspace_members.display_name
    })
    .from(assets)
    .leftJoin(workspace_members, eq(assets.uploaded_by, workspace_members.id))
    .where(conditions)
    .orderBy(orderDirection, asc(assets.id))
    .limit(limit + 1);

  const hasMore = assetRows.length > limit;
  const paginatedAssets = hasMore ? assetRows.slice(0, limit) : assetRows;

  // Retrieve previews for each paginated asset
  const assetsWithPreviews = await Promise.all(
    paginatedAssets.map(async (asset) => {
      const previews = await db
        .select()
        .from(asset_previews)
        .where(eq(asset_previews.asset_id, asset.id));

      const smPreview = previews.find((p) => p.size === 'sm')?.storage_key ?? null;
      const mdPreview = previews.find((p) => p.size === 'md')?.storage_key ?? null;
      const lgPreview = previews.find((p) => p.size === 'lg')?.storage_key ?? null;

      return {
        ...asset,
        previews: {
          sm: smPreview,
          md: mdPreview,
          lg: lgPreview
        }
      };
    })
  );

  const nextCursor = paginatedAssets.length > 0 ? paginatedAssets[paginatedAssets.length - 1].id : null;

  return {
    assets: assetsWithPreviews,
    cursor: nextCursor,
    hasMore
  };
}
