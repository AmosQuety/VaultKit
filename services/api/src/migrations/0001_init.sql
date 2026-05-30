-- Initial schema for VaultKit (based on docs/vaultkit-schema.md)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  authhub_tenant_id VARCHAR(255) NOT NULL UNIQUE,
  authhub_client_id VARCHAR(255) NOT NULL,
  storage_used_bytes BIGINT DEFAULT 0,
  storage_quota_bytes BIGINT DEFAULT 2147483648,
  plan VARCHAR(50) DEFAULT 'free',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant ON workspaces(authhub_tenant_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  authhub_user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES workspace_members(id),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(workspace_id, authhub_user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON workspace_members(authhub_user_id);

CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES collections(id),
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES workspace_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_collections_parent ON collections(parent_id);
CREATE INDEX IF NOT EXISTS idx_collections_path ON collections(path);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  file_type VARCHAR(100),
  extension VARCHAR(20),
  size_bytes BIGINT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  storage_key TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) DEFAULT 'processing',
  approval_status VARCHAR(50) DEFAULT 'pending',
  blur_hash TEXT,
  uploaded_by UUID NOT NULL REFERENCES workspace_members(id),
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_assets_collection ON assets(collection_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_hash ON assets(content_hash);
CREATE INDEX IF NOT EXISTS idx_assets_last_accessed ON assets(last_accessed_at);

CREATE TABLE IF NOT EXISTS asset_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  version_number INTEGER NOT NULL,
  size_bytes BIGINT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  storage_key TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES workspace_members(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(asset_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_asset ON asset_versions(asset_id);

CREATE TABLE IF NOT EXISTS asset_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  size VARCHAR(10) NOT NULL,
  storage_key TEXT NOT NULL,
  width_px INTEGER,
  height_px INTEGER,
  file_type VARCHAR(50),
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(asset_id, size)
);

CREATE INDEX IF NOT EXISTS idx_previews_asset ON asset_previews(asset_id);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS asset_tags (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  added_by UUID REFERENCES workspace_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(asset_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag_id);

CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  link_type VARCHAR(20) NOT NULL,
  asset_id UUID REFERENCES assets(id),
  collection_id UUID REFERENCES collections(id),
  created_by UUID NOT NULL REFERENCES workspace_members(id),
  password_hash TEXT,
  permission VARCHAR(20) DEFAULT 'view',
  is_whatsapp BOOLEAN DEFAULT false,
  single_use BOOLEAN DEFAULT false,
  access_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_workspace ON share_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_share_links_expires ON share_links(expires_at);

CREATE TABLE IF NOT EXISTS approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID NOT NULL REFERENCES share_links(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  action VARCHAR(30) NOT NULL,
  client_note TEXT,
  client_ip VARCHAR(45),
  client_ua TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_events_asset ON approval_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_approval_events_link ON approval_events(share_link_id);

CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  member_id UUID NOT NULL REFERENCES workspace_members(id),
  idempotency_key VARCHAR(64) NOT NULL UNIQUE,
  filename VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  total_size_bytes BIGINT NOT NULL,
  chunk_size_bytes INTEGER DEFAULT 524288,
  total_chunks INTEGER NOT NULL,
  uploaded_chunks INTEGER DEFAULT 0,
  storage_key TEXT,
  status VARCHAR(30) DEFAULT 'in_progress',
  collection_id UUID REFERENCES collections(id),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_key ON upload_sessions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_member ON upload_sessions(member_id);

CREATE TABLE IF NOT EXISTS upload_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum VARCHAR(64),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(64) PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  member_id UUID NOT NULL REFERENCES workspace_members(id),
  request_path VARCHAR(500) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  member_id UUID NOT NULL REFERENCES workspace_members(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  asset_id UUID,
  share_link_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(member_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) UNIQUE,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  payment_method VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'UGX',
  amount INTEGER,
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  external_ref VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  job_type VARCHAR(50) NOT NULL,
  bullmq_job_id VARCHAR(255),
  status VARCHAR(30) DEFAULT 'queued',
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_asset ON processing_jobs(asset_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON processing_jobs(status);

-- Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_share_target'
  ) THEN
    ALTER TABLE share_links ADD CONSTRAINT chk_share_target CHECK (
      (asset_id IS NOT NULL AND collection_id IS NULL) OR
      (collection_id IS NOT NULL AND asset_id IS NULL)
    );
  END IF;
END $$;
