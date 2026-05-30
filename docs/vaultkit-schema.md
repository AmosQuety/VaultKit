# VaultKit — Database Schema
> PostgreSQL (Neon) | Drizzle ORM  
> Version 1.0

---

## Design Rules

1. Every table has `id` (UUID), `created_at`, `updated_at`
2. Soft deletes via `deleted_at` — never hard delete user data
3. All user lookups scoped by `workspace_id` — never global
4. Idempotency keys stored with TTL for retry safety
5. `content_hash` (SHA-256) on every asset for conflict detection

---

## Schema

### `workspaces`
Maps 1:1 to an AuthHub tenant. The core multi-tenancy unit.

```sql
CREATE TABLE workspaces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) NOT NULL UNIQUE,         -- used in share URLs
  authhub_tenant_id VARCHAR(255) NOT NULL UNIQUE,       -- AuthHub tenant_id
  authhub_client_id VARCHAR(255) NOT NULL,              -- OAuth client_id
  storage_used_bytes BIGINT DEFAULT 0,
  storage_quota_bytes BIGINT DEFAULT 2147483648,        -- 2GB default (free tier)
  plan            VARCHAR(50) DEFAULT 'free',            -- free | pro | agency
  logo_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ                            -- soft delete
);

CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_tenant ON workspaces(authhub_tenant_id);
```

---

### `workspace_members`
Links a user identity (from AuthHub) to a Workspace with a role.
A user can be a member of many workspaces with different roles.

```sql
CREATE TABLE workspace_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  authhub_user_id VARCHAR(255) NOT NULL,                -- user identity from AuthHub
  email           VARCHAR(255) NOT NULL,
  display_name    VARCHAR(255),
  avatar_url      TEXT,
  role            VARCHAR(50) NOT NULL DEFAULT 'viewer', -- admin | editor | viewer
  invited_by      UUID REFERENCES workspace_members(id),
  joined_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  UNIQUE(workspace_id, authhub_user_id)                 -- one role per user per workspace
);

CREATE INDEX idx_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_members_user ON workspace_members(authhub_user_id);
```

---

### `collections`
Folders / project containers within a workspace.
Supports nested folders via `parent_id` self-reference.

```sql
CREATE TABLE collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES collections(id),      -- null = root folder
  name            VARCHAR(255) NOT NULL,
  path            TEXT NOT NULL,                         -- materialized path: /clients/acme/campaigns
  created_by      UUID NOT NULL REFERENCES workspace_members(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_collections_workspace ON collections(workspace_id);
CREATE INDEX idx_collections_parent ON collections(parent_id);
CREATE INDEX idx_collections_path ON collections(path);
```

---

### `assets`
Core table. Each row is a unique file in a workspace.
Versioning handled via `asset_versions` table.

```sql
CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  collection_id   UUID REFERENCES collections(id),
  name            VARCHAR(500) NOT NULL,
  description     TEXT,
  file_type       VARCHAR(100),                          -- image/jpeg, application/pdf, etc.
  extension       VARCHAR(20),                           -- jpg, pdf, mp4
  size_bytes      BIGINT NOT NULL,
  content_hash    VARCHAR(64) NOT NULL,                  -- SHA-256 of file content
  storage_key     TEXT NOT NULL,                         -- path in R2: /{workspace_id}/{asset_id}/{filename}
  version_number  INTEGER NOT NULL DEFAULT 1,            -- increments on every write
  status          VARCHAR(50) DEFAULT 'processing',      -- processing | ready | processing_failed
  approval_status VARCHAR(50) DEFAULT 'pending',         -- pending | approved | revision_requested
  blur_hash       TEXT,                                  -- blur-hash string for preview placeholder
  uploaded_by     UUID NOT NULL REFERENCES workspace_members(id),
  last_accessed_at TIMESTAMPTZ,                          -- for cold storage lifecycle
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_assets_workspace ON assets(workspace_id);
CREATE INDEX idx_assets_collection ON assets(collection_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_hash ON assets(content_hash);
CREATE INDEX idx_assets_last_accessed ON assets(last_accessed_at);
```

---

### `asset_versions`
Each upload of a new version is a new row. Current version is
tracked on `assets.version_number`.

```sql
CREATE TABLE asset_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  version_number  INTEGER NOT NULL,
  size_bytes      BIGINT NOT NULL,
  content_hash    VARCHAR(64) NOT NULL,
  storage_key     TEXT NOT NULL,                         -- separate storage path per version
  uploaded_by     UUID NOT NULL REFERENCES workspace_members(id),
  note            TEXT,                                  -- "Revision 2 - updated colors"
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(asset_id, version_number)
);

CREATE INDEX idx_versions_asset ON asset_versions(asset_id);
```

---

### `asset_previews`
Generated thumbnails and previews per asset. Created async by workers.

```sql
CREATE TABLE asset_previews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  size            VARCHAR(10) NOT NULL,                  -- sm | md | lg
  storage_key     TEXT NOT NULL,
  width_px        INTEGER,
  height_px       INTEGER,
  file_type       VARCHAR(50),                           -- image/webp
  size_bytes      BIGINT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ,                           -- null = permanent

  UNIQUE(asset_id, size)
);

CREATE INDEX idx_previews_asset ON asset_previews(asset_id);
```

---

### `asset_tags`
Many-to-many: assets can have many tags, tags can apply to many assets.

```sql
CREATE TABLE tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(workspace_id, name)
);

CREATE TABLE asset_tags (
  asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  added_by        UUID REFERENCES workspace_members(id),
  created_at      TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY(asset_id, tag_id)
);

CREATE INDEX idx_asset_tags_asset ON asset_tags(asset_id);
CREATE INDEX idx_asset_tags_tag ON asset_tags(tag_id);
```

---

### `share_links`
Secure, expiring, optionally password-protected share links.

```sql
CREATE TABLE share_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token           VARCHAR(64) NOT NULL UNIQUE,           -- random secure token in URL
  link_type       VARCHAR(20) NOT NULL,                  -- asset | collection
  asset_id        UUID REFERENCES assets(id),
  collection_id   UUID REFERENCES collections(id),
  created_by      UUID NOT NULL REFERENCES workspace_members(id),
  password_hash   TEXT,                                  -- bcrypt hash, null = no password
  permission      VARCHAR(20) DEFAULT 'view',            -- view | download
  is_whatsapp     BOOLEAN DEFAULT false,                 -- WhatsApp approval flow
  single_use      BOOLEAN DEFAULT false,                 -- expires after first access
  access_count    INTEGER DEFAULT 0,
  expires_at      TIMESTAMPTZ,                           -- null = never
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_share_links_workspace ON share_links(workspace_id);
CREATE INDEX idx_share_links_expires ON share_links(expires_at);
```

---

### `approval_events`
Tracks client approval/revision actions from WhatsApp share links.

```sql
CREATE TABLE approval_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id   UUID NOT NULL REFERENCES share_links(id),
  asset_id        UUID NOT NULL REFERENCES assets(id),
  action          VARCHAR(30) NOT NULL,                  -- approved | revision_requested
  client_note     TEXT,                                  -- revision comment from client
  client_ip       VARCHAR(45),
  client_ua       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_approval_events_asset ON approval_events(asset_id);
CREATE INDEX idx_approval_events_link ON approval_events(share_link_id);
```

---

### `upload_sessions`
Tracks chunked multipart uploads for delta-sync / resumable uploads.

```sql
CREATE TABLE upload_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  member_id       UUID NOT NULL REFERENCES workspace_members(id),
  idempotency_key VARCHAR(64) NOT NULL UNIQUE,           -- client-generated UUID
  filename        VARCHAR(500) NOT NULL,
  file_type       VARCHAR(100),
  total_size_bytes BIGINT NOT NULL,
  chunk_size_bytes INTEGER DEFAULT 524288,               -- 512KB per chunk
  total_chunks    INTEGER NOT NULL,
  uploaded_chunks INTEGER DEFAULT 0,
  storage_key     TEXT,
  status          VARCHAR(30) DEFAULT 'in_progress',     -- in_progress | complete | failed
  collection_id   UUID REFERENCES collections(id),
  expires_at      TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_upload_sessions_key ON upload_sessions(idempotency_key);
CREATE INDEX idx_upload_sessions_member ON upload_sessions(member_id);

CREATE TABLE upload_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  size_bytes      INTEGER NOT NULL,
  checksum        VARCHAR(64),                           -- MD5 of chunk for integrity
  uploaded_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE(session_id, chunk_index)
);
```

---

### `idempotency_keys`
Server-side store for idempotency key → response mapping.
Ensures retried requests return the same result without re-executing.

```sql
CREATE TABLE idempotency_keys (
  key             VARCHAR(64) PRIMARY KEY,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  member_id       UUID NOT NULL REFERENCES workspace_members(id),
  request_path    VARCHAR(500) NOT NULL,
  response_status INTEGER NOT NULL,
  response_body   JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
```

---

### `notifications`
In-app and push notification log.

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  member_id       UUID NOT NULL REFERENCES workspace_members(id),
  type            VARCHAR(50) NOT NULL,                  -- approval | mention | upload_ready | quota_warning
  title           VARCHAR(255) NOT NULL,
  body            TEXT,
  asset_id        UUID REFERENCES assets(id),
  share_link_id   UUID REFERENCES share_links(id),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_member ON notifications(member_id);
CREATE INDEX idx_notifications_unread ON notifications(member_id) WHERE read_at IS NULL;
```

---

### `subscriptions`
Billing and subscription tracking per workspace.

```sql
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) UNIQUE,
  plan            VARCHAR(50) NOT NULL DEFAULT 'free',   -- free | pro | agency
  status          VARCHAR(50) DEFAULT 'active',          -- active | past_due | cancelled
  payment_method  VARCHAR(50),                           -- mtn_momo | airtel_money | card
  currency        VARCHAR(10) DEFAULT 'UGX',
  amount          INTEGER,                               -- in smallest unit (UGX cents)
  billing_cycle   VARCHAR(20) DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  external_ref    VARCHAR(255),                          -- MoMo transaction ref / Stripe sub ID
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

---

### `processing_jobs`
Log of BullMQ processing jobs for observability and dead-letter tracking.

```sql
CREATE TABLE processing_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES assets(id),
  job_type        VARCHAR(50) NOT NULL,                  -- blur_hash | thumbnail_sm | thumbnail_md | thumbnail_lg | pdf_preview
  bullmq_job_id   VARCHAR(255),
  status          VARCHAR(30) DEFAULT 'queued',          -- queued | processing | done | failed | dead_letter
  attempts        INTEGER DEFAULT 0,
  error_message   TEXT,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_asset ON processing_jobs(asset_id);
CREATE INDEX idx_jobs_status ON processing_jobs(status);
```

---

## Constraints Summary

```sql
-- Prevent workspace members from being added without valid workspace
ALTER TABLE workspace_members ADD CONSTRAINT fk_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Ensure share link points to either asset or collection, not both
ALTER TABLE share_links ADD CONSTRAINT chk_share_target
  CHECK (
    (asset_id IS NOT NULL AND collection_id IS NULL) OR
    (collection_id IS NOT NULL AND asset_id IS NULL)
  );

-- Ensure asset version_number always increases
-- (enforced at application layer — Drizzle transaction)
```

---

## SQLite Schema (Mobile — Offline State)

The mobile app mirrors a subset of the above for offline access.
**Only metadata is stored locally — never file blobs.**

```sql
-- workspaces (joined)
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  role TEXT NOT NULL,               -- user's role in this workspace
  storage_used INTEGER,
  storage_quota INTEGER,
  synced_at INTEGER                 -- unix timestamp of last sync
);

-- collections
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  path TEXT NOT NULL
);

-- assets (metadata only)
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  collection_id TEXT,
  name TEXT NOT NULL,
  file_type TEXT,
  size_bytes INTEGER,
  content_hash TEXT,
  version_number INTEGER,
  status TEXT,
  approval_status TEXT,
  blur_hash TEXT,
  local_uri TEXT,                   -- local file path if downloaded
  sync_status TEXT DEFAULT 'synced' -- synced | queued | uploading | failed
);

-- offline upload queue
CREATE TABLE upload_queue (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  collection_id TEXT,
  local_uri TEXT NOT NULL,          -- local file path
  filename TEXT NOT NULL,
  file_type TEXT,
  size_bytes INTEGER,
  idempotency_key TEXT NOT NULL,
  chunk_offset INTEGER DEFAULT 0,   -- for delta-sync resume
  created_at INTEGER                -- unix timestamp
);

CREATE INDEX idx_upload_queue_workspace ON upload_queue(workspace_id);
CREATE INDEX idx_assets_sync ON assets(sync_status);
```
