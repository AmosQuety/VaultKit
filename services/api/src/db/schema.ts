import { pgTable, uuid, varchar, text, integer, bigint, timestamp, boolean, jsonb, index, unique, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// WORKSPACES
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  authhub_tenant_id: varchar('authhub_tenant_id', { length: 255 }).notNull().unique(),
  authhub_client_id: varchar('authhub_client_id', { length: 255 }).notNull(),
  authhub_client_secret: text('authhub_client_secret'),
  storage_used_bytes: bigint('storage_used_bytes', { mode: 'number' }).default(0).notNull(),
  storage_quota_bytes: bigint('storage_quota_bytes', { mode: 'number' }).default(2147483648).notNull(), // 2GB default
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  logo_url: text('logo_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
}, (table) => ({
  idxWorkspacesSlug: index('idx_workspaces_slug').on(table.slug),
  idxWorkspacesTenant: index('idx_workspaces_tenant').on(table.authhub_tenant_id)
}));

// WORKSPACE MEMBERS
export const workspace_members = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  authhub_user_id: varchar('authhub_user_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  display_name: varchar('display_name', { length: 255 }),
  avatar_url: text('avatar_url'),
  role: varchar('role', { length: 50 }).default('viewer').notNull(), // admin | editor | viewer
  invited_by: uuid('invited_by'), // Self-reference added in relations
  joined_at: timestamp('joined_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
}, (table) => ({
  idxMembersWorkspace: index('idx_members_workspace').on(table.workspace_id),
  idxMembersUser: index('idx_members_user').on(table.authhub_user_id),
  uniqWorkspaceUser: unique('uniq_workspace_user').on(table.workspace_id, table.authhub_user_id)
}));

// COLLECTIONS
export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  parent_id: uuid('parent_id'), // Self-reference in relations
  name: varchar('name', { length: 255 }).notNull(),
  path: text('path').notNull(),
  created_by: uuid('created_by').notNull().references(() => workspace_members.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
}, (table) => ({
  idxCollectionsWorkspace: index('idx_collections_workspace').on(table.workspace_id),
  idxCollectionsParent: index('idx_collections_parent').on(table.parent_id),
  idxCollectionsPath: index('idx_collections_path').on(table.path)
}));

// ASSETS
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  collection_id: uuid('collection_id').references(() => collections.id),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  file_type: varchar('file_type', { length: 100 }),
  extension: varchar('extension', { length: 20 }),
  size_bytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  content_hash: varchar('content_hash', { length: 64 }).notNull(),
  storage_key: text('storage_key').notNull(),
  version_number: integer('version_number').default(1).notNull(),
  status: varchar('status', { length: 50 }).default('processing').notNull(), // processing | ready | processing_failed
  approval_status: varchar('approval_status', { length: 50 }).default('pending').notNull(), // pending | approved | revision_requested
  blur_hash: text('blur_hash'),
  uploaded_by: uuid('uploaded_by').notNull().references(() => workspace_members.id),
  last_accessed_at: timestamp('last_accessed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
}, (table) => ({
  idxAssetsWorkspace: index('idx_assets_workspace').on(table.workspace_id),
  idxAssetsCollection: index('idx_assets_collection').on(table.collection_id),
  idxAssetsStatus: index('idx_assets_status').on(table.status),
  idxAssetsHash: index('idx_assets_hash').on(table.content_hash),
  idxAssetsLastAccessed: index('idx_assets_last_accessed').on(table.last_accessed_at)
}));

// ASSET VERSIONS
export const asset_versions = pgTable('asset_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  asset_id: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  version_number: integer('version_number').notNull(),
  size_bytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  content_hash: varchar('content_hash', { length: 64 }).notNull(),
  storage_key: text('storage_key').notNull(),
  uploaded_by: uuid('uploaded_by').notNull().references(() => workspace_members.id),
  note: text('note'),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  idxVersionsAsset: index('idx_versions_asset').on(table.asset_id),
  uniqAssetVersion: unique('uniq_asset_version').on(table.asset_id, table.version_number)
}));

// ASSET PREVIEWS
export const asset_previews = pgTable('asset_previews', {
  id: uuid('id').primaryKey().defaultRandom(),
  asset_id: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  size: varchar('size', { length: 10 }).notNull(), // sm | md | lg
  storage_key: text('storage_key').notNull(),
  width_px: integer('width_px'),
  height_px: integer('height_px'),
  file_type: varchar('file_type', { length: 50 }),
  size_bytes: bigint('size_bytes', { mode: 'number' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at')
}, (table) => ({
  idxPreviewsAsset: index('idx_previews_asset').on(table.asset_id),
  uniqAssetSize: unique('uniq_asset_size').on(table.asset_id, table.size)
}));

// TAGS
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  uniqWorkspaceTag: unique('uniq_workspace_tag').on(table.workspace_id, table.name)
}));

// ASSET TAGS
export const asset_tags = pgTable('asset_tags', {
  asset_id: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  tag_id: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  added_by: uuid('added_by').references(() => workspace_members.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  pkAssetTags: primaryKey({ columns: [table.asset_id, table.tag_id] }),
  idxAssetTagsAsset: index('idx_asset_tags_asset').on(table.asset_id),
  idxAssetTagsTag: index('idx_asset_tags_tag').on(table.tag_id)
}));

// SHARE LINKS
export const share_links = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 64 }).notNull().unique(),
  link_type: varchar('link_type', { length: 20 }).notNull(), // asset | collection
  asset_id: uuid('asset_id').references(() => assets.id),
  collection_id: uuid('collection_id').references(() => collections.id),
  created_by: uuid('created_by').notNull().references(() => workspace_members.id),
  password_hash: text('password_hash'),
  permission: varchar('permission', { length: 20 }).default('view').notNull(), // view | download
  is_whatsapp: boolean('is_whatsapp').default(false).notNull(),
  single_use: boolean('single_use').default(false).notNull(),
  access_count: integer('access_count').default(0).notNull(),
  expires_at: timestamp('expires_at'),
  revoked_at: timestamp('revoked_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  idxShareLinksToken: index('idx_share_links_token').on(table.token),
  idxShareLinksWorkspace: index('idx_share_links_workspace').on(table.workspace_id),
  idxShareLinksExpires: index('idx_share_links_expires').on(table.expires_at)
}));

// APPROVAL EVENTS
export const approval_events = pgTable('approval_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  share_link_id: uuid('share_link_id').notNull().references(() => share_links.id),
  asset_id: uuid('asset_id').notNull().references(() => assets.id),
  action: varchar('action', { length: 30 }).notNull(), // approved | revision_requested
  client_note: text('client_note'),
  client_ip: varchar('client_ip', { length: 45 }),
  client_ua: text('client_ua'),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  idxApprovalEventsAsset: index('idx_approval_events_asset').on(table.asset_id),
  idxApprovalEventsLink: index('idx_approval_events_link').on(table.share_link_id)
}));

// UPLOAD SESSIONS
export const upload_sessions = pgTable('upload_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  member_id: uuid('member_id').notNull().references(() => workspace_members.id),
  idempotency_key: varchar('idempotency_key', { length: 64 }).notNull().unique(),
  filename: varchar('filename', { length: 500 }).notNull(),
  file_type: varchar('file_type', { length: 100 }),
  total_size_bytes: bigint('total_size_bytes', { mode: 'number' }).notNull(),
  chunk_size_bytes: integer('chunk_size_bytes').default(524288).notNull(), // 512KB default
  total_chunks: integer('total_chunks').notNull(),
  uploaded_chunks: integer('uploaded_chunks').default(0).notNull(),
  storage_key: text('storage_key'),
  status: varchar('status', { length: 30 }).default('in_progress').notNull(), // in_progress | complete | failed
  collection_id: uuid('collection_id').references(() => collections.id),
  expires_at: timestamp('expires_at').defaultNow().notNull(), // default handles in app or db
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  idxUploadSessionsKey: index('idx_upload_sessions_key').on(table.idempotency_key),
  idxUploadSessionsMember: index('idx_upload_sessions_member').on(table.member_id)
}));

// UPLOAD CHUNKS
export const upload_chunks = pgTable('upload_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').notNull().references(() => upload_sessions.id, { onDelete: 'cascade' }),
  chunk_index: integer('chunk_index').notNull(),
  size_bytes: integer('size_bytes').notNull(),
  checksum: varchar('checksum', { length: 64 }),
  uploaded_at: timestamp('uploaded_at').defaultNow().notNull()
}, (table) => ({
  uniqSessionChunk: unique('uniq_session_chunk').on(table.session_id, table.chunk_index)
}));

// IDEMPOTENCY KEYS
export const idempotency_keys = pgTable('idempotency_keys', {
  key: varchar('key', { length: 64 }).primaryKey(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  member_id: uuid('member_id').notNull().references(() => workspace_members.id),
  request_path: varchar('request_path', { length: 500 }).notNull(),
  response_status: integer('response_status').notNull(),
  response_body: jsonb('response_body').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at').defaultNow().notNull()
}, (table) => ({
  idxIdempotencyExpires: index('idx_idempotency_expires').on(table.expires_at)
}));

// NOTIFICATIONS
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id),
  member_id: uuid('member_id').notNull().references(() => workspace_members.id),
  type: varchar('type', { length: 50 }).notNull(), // approval | mention | upload_ready | quota_warning
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  asset_id: uuid('asset_id').references(() => assets.id),
  share_link_id: uuid('share_link_id').references(() => share_links.id),
  read_at: timestamp('read_at'),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  idxNotificationsMember: index('idx_notifications_member').on(table.member_id)
}));

// SUBSCRIPTIONS
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id).unique(),
  plan: varchar('plan', { length: 50 }).default('free').notNull(), // free | pro | agency
  status: varchar('status', { length: 50 }).default('active').notNull(), // active | past_due | cancelled
  payment_method: varchar('payment_method', { length: 50 }), // mtn_momo | airtel_money | card
  currency: varchar('currency', { length: 10 }).default('UGX').notNull(),
  amount: integer('amount'),
  billing_cycle: varchar('billing_cycle', { length: 20 }).default('monthly').notNull(),
  current_period_start: timestamp('current_period_start'),
  current_period_end: timestamp('current_period_end'),
  external_ref: varchar('external_ref', { length: 255 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// PROCESSING JOBS
export const processing_jobs = pgTable('processing_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  asset_id: uuid('asset_id').notNull().references(() => assets.id),
  job_type: varchar('job_type', { length: 50 }).notNull(), // blur_hash | thumbnail_sm | thumbnail_md | thumbnail_lg | pdf_preview
  bullmq_job_id: varchar('bullmq_job_id', { length: 255 }),
  status: varchar('status', { length: 30 }).default('queued').notNull(), // queued | processing | done | failed | dead_letter
  attempts: integer('attempts').default(0).notNull(),
  error_message: text('error_message'),
  duration_ms: integer('duration_ms'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  idxJobsAsset: index('idx_jobs_asset').on(table.asset_id),
  idxJobsStatus: index('idx_jobs_status').on(table.status)
}));

// DRIZZLE RELATIONS DEFINITIONS
export const workspaceRelations = relations(workspaces, ({ many, one }) => ({
  members: many(workspace_members),
  collections: many(collections),
  assets: many(assets),
  subscription: one(subscriptions, {
    fields: [workspaces.id],
    references: [subscriptions.workspace_id]
  })
}));

export const workspaceMemberRelations = relations(workspace_members, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workspace_members.workspace_id],
    references: [workspaces.id]
  }),
  invitedBy: one(workspace_members, {
    fields: [workspace_members.invited_by],
    references: [workspace_members.id],
    relationName: 'member_inviter'
  }),
  invitees: many(workspace_members, { relationName: 'member_inviter' }),
  createdCollections: many(collections),
  uploadedAssets: many(assets)
}));

export const collectionRelations = relations(collections, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [collections.workspace_id],
    references: [workspaces.id]
  }),
  parent: one(collections, {
    fields: [collections.parent_id],
    references: [collections.id],
    relationName: 'nested_collections'
  }),
  subCollections: many(collections, { relationName: 'nested_collections' }),
  creator: one(workspace_members, {
    fields: [collections.created_by],
    references: [workspace_members.id]
  }),
  assets: many(assets)
}));

export const assetRelations = relations(assets, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [assets.workspace_id],
    references: [workspaces.id]
  }),
  collection: one(collections, {
    fields: [assets.collection_id],
    references: [collections.id]
  }),
  uploader: one(workspace_members, {
    fields: [assets.uploaded_by],
    references: [workspace_members.id]
  }),
  versions: many(asset_versions),
  previews: many(asset_previews),
  tags: many(asset_tags)
}));

export const assetVersionRelations = relations(asset_versions, ({ one }) => ({
  asset: one(assets, {
    fields: [asset_versions.asset_id],
    references: [assets.id]
  }),
  workspace: one(workspaces, {
    fields: [asset_versions.workspace_id],
    references: [workspaces.id]
  }),
  uploader: one(workspace_members, {
    fields: [asset_versions.uploaded_by],
    references: [workspace_members.id]
  })
}));

export const assetPreviewRelations = relations(asset_previews, ({ one }) => ({
  asset: one(assets, {
    fields: [asset_previews.asset_id],
    references: [assets.id]
  })
}));

export const tagRelations = relations(tags, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tags.workspace_id],
    references: [workspaces.id]
  }),
  assets: many(asset_tags)
}));

export const assetTagRelations = relations(asset_tags, ({ one }) => ({
  asset: one(assets, {
    fields: [asset_tags.asset_id],
    references: [assets.id]
  }),
  tag: one(tags, {
    fields: [asset_tags.tag_id],
    references: [tags.id]
  }),
  addedBy: one(workspace_members, {
    fields: [asset_tags.added_by],
    references: [workspace_members.id]
  })
}));

export const shareLinkRelations = relations(share_links, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [share_links.workspace_id],
    references: [workspaces.id]
  }),
  asset: one(assets, {
    fields: [share_links.asset_id],
    references: [assets.id]
  }),
  collection: one(collections, {
    fields: [share_links.collection_id],
    references: [collections.id]
  }),
  creator: one(workspace_members, {
    fields: [share_links.created_by],
    references: [workspace_members.id]
  }),
  approvals: many(approval_events)
}));

export const approvalEventRelations = relations(approval_events, ({ one }) => ({
  shareLink: one(share_links, {
    fields: [approval_events.share_link_id],
    references: [share_links.id]
  }),
  asset: one(assets, {
    fields: [approval_events.asset_id],
    references: [assets.id]
  })
}));

export const uploadSessionRelations = relations(upload_sessions, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [upload_sessions.workspace_id],
    references: [workspaces.id]
  }),
  member: one(workspace_members, {
    fields: [upload_sessions.member_id],
    references: [workspace_members.id]
  }),
  collection: one(collections, {
    fields: [upload_sessions.collection_id],
    references: [collections.id]
  }),
  chunks: many(upload_chunks)
}));

export const uploadChunkRelations = relations(upload_chunks, ({ one }) => ({
  session: one(upload_sessions, {
    fields: [upload_chunks.session_id],
    references: [upload_sessions.id]
  })
}));

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [subscriptions.workspace_id],
    references: [workspaces.id]
  })
}));

export const processingJobRelations = relations(processing_jobs, ({ one }) => ({
  asset: one(assets, {
    fields: [processing_jobs.asset_id],
    references: [assets.id]
  })
}));
