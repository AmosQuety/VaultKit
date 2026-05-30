# VaultKit — System Architecture
> Version 1.0 | Modular Monolith First, Extract When Needed

---

## Architectural Philosophy

VaultKit follows a **Modular Monolith** approach:
- Single deployable codebase, logically separated into independent modules
- Each module owns its domain logic, cannot reach into another module's internals
- Modules communicate via defined interfaces (function calls internally, events for async)
- Extract to microservice only when a module has distinct scaling needs (e.g., workers need 10x resources vs API)

This avoids the premature complexity of microservices while keeping the codebase clean enough to split later.

---

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│                                                                  │
│   React Web App          React Native App       WhatsApp Client  │
│   (dashboard/upload)     (field mode/mobile)    (approval link)  │
└────────────┬─────────────────────┬────────────────────┬─────────┘
             │                     │                    │
             ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CDN / Edge                                │
│              Cloudflare (static assets, thumbnails)              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY                                │
│                  Node.js / Fastify (TypeScript)                  │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   Auth   │  │  Assets  │  │  Share   │  │  Workspaces   │  │
│  │ Module   │  │  Module  │  │  Module  │  │    Module     │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │Notif.    │  │ Billing  │  │ Storage  │                      │
│  │ Module   │  │  Module  │  │ Adapter  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└─────┬──────────────┬──────────────┬──────────────┬─────────────┘
      │              │              │              │
      ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐
│ AuthHub  │  │ Neon DB  │  │  Redis   │  │  Cloudflare R2   │
│(OIDC/    │  │(Postgres)│  │ (Cache + │  │  (File Storage)  │
│ OAuth)   │  │          │  │  Queue)  │  │                  │
└──────────┘  └──────────┘  └──────────┘  └──────────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │  Worker Service  │
                        │  (BullMQ Jobs)   │
                        │                 │
                        │ - Thumbnail gen  │
                        │ - Blur-hash      │
                        │ - PDF preview    │
                        │ - Metadata extr. │
                        │ - Lifecycle cron │
                        │ - Cleanup cron   │
                        └──────────────────┘
```

---

## Module Breakdown

### 1. Auth Module
**Responsibility**: Validate every incoming request against AuthHub. No auth logic lives here — only verification and context extraction.

```
Auth Module
├── middleware/
│   ├── verifyToken.ts        -- validate JWT with AuthHub JWKS endpoint
│   ├── extractWorkspace.ts   -- resolve workspace_id from client_id / header
│   └── enforcePermission.ts  -- check member role + token scope per resource
├── services/
│   ├── authhub.client.ts     -- wrapper for AuthHub OIDC/OAuth API calls
│   └── m2m.service.ts        -- Client Credentials for worker authentication
└── types/
    └── auth.types.ts         -- AuthContext, TokenPayload, Permission
```

**Zero-Trust Flow (every request):**
```
Request arrives
    ↓
verifyToken    → validate JWT signature + expiry via AuthHub JWKS
    ↓
extractWorkspace → resolve tenant from client_id in token
    ↓
checkMembership  → confirm user is active member of that workspace
    ↓
enforcePermission → check role (admin/editor/viewer) + token scope
    ↓
Handler executes
```

---

### 2. Assets Module
**Responsibility**: Upload, version, tag, retrieve, and manage the lifecycle of digital assets.

```
Assets Module
├── routes/
│   ├── upload.routes.ts      -- POST /assets/upload (initiate + chunk)
│   ├── assets.routes.ts      -- GET, PATCH, DELETE /assets/:id
│   └── versions.routes.ts    -- GET /assets/:id/versions
├── services/
│   ├── upload.service.ts     -- chunked upload logic + idempotency
│   ├── asset.service.ts      -- CRUD + versioning
│   ├── presign.service.ts    -- generate pre-signed URLs for file access
│   └── tag.service.ts        -- tag management
├── workers/
│   ├── thumbnail.worker.ts   -- Sharp.js thumbnail generation
│   ├── blurhash.worker.ts    -- blur-hash string generation
│   ├── pdf.worker.ts         -- PDF first-page preview
│   └── metadata.worker.ts    -- EXIF / file metadata extraction
└── jobs/
    ├── lifecycle.job.ts      -- move cold assets to archive tier
    └── cleanup.job.ts        -- delete orphaned files, expired previews
```

**Upload Flow:**
```
Client initiates upload
    ↓
POST /assets/upload/init
  { filename, size, total_chunks, idempotency_key, collection_id }
    ↓
Server creates upload_session row, returns session_id
    ↓
Client uploads chunks sequentially:
  PUT /assets/upload/:session_id/chunk/:index
    ↓
Server assembles chunks, writes to R2:
  /{workspace_id}/{asset_id}/{filename}
    ↓
Asset row created (status: 'processing')
    ↓
Jobs queued in BullMQ:
  [blur_hash, thumbnail_sm, thumbnail_md, thumbnail_lg, metadata]
    ↓
Workers process async → update asset_previews
    ↓
Asset status updated to 'ready'
    ↓
Notification sent to uploader: "Your file is ready"
```

---

### 3. Share Module
**Responsibility**: Create, manage, and serve secure share links and the WhatsApp approval flow.

```
Share Module
├── routes/
│   ├── share.routes.ts       -- POST /share, GET /share/:token, DELETE /share/:id
│   └── approval.routes.ts    -- POST /share/:token/approve | /revise
├── services/
│   ├── sharelink.service.ts  -- generate token, set expiry, password hash
│   ├── approval.service.ts   -- record approval event, update asset status
│   └── whatsapp.service.ts   -- generate WA-optimized lightweight view URL
└── views/
    └── approval.html         -- lightweight static approval page (no JS framework)
                              -- loads blur-hash → WebP, shows Approve/Revise buttons
```

**Share Link Access Flow:**
```
Client opens share link: /s/:token
    ↓
Resolve token → share_link row
Check: expired? revoked? password required?
    ↓
If password required → prompt, verify bcrypt hash
    ↓
Generate pre-signed URL for asset (1hr expiry)
    ↓
Return lightweight approval view with pre-signed URL
    ↓
Client clicks Approve / Request Revision
    ↓
POST /share/:token/approve { action, note }
    ↓
approval_events row created
asset.approval_status updated
notification sent to workspace members
```

---

### 4. Workspaces Module
**Responsibility**: Create workspaces, manage members, invite flows, role changes.

```
Workspaces Module
├── routes/
│   ├── workspace.routes.ts   -- CRUD workspaces
│   └── members.routes.ts     -- invite, remove, change role
├── services/
│   ├── workspace.service.ts  -- create workspace → register AuthHub tenant
│   ├── invite.service.ts     -- email invitations, invite token validation
│   └── quota.service.ts      -- track + enforce storage quota
└── integrations/
    └── authhub.provisioner.ts -- register new tenant + OAuth client in AuthHub
```

**Workspace Creation Flow:**
```
Admin POSTs /workspaces { name, slug }
    ↓
workspace.service creates workspace row
    ↓
authhub.provisioner calls AuthHub Admin API:
  - Creates new tenant (tenant_id)
  - Registers OAuth client (client_id, client_secret)
    ↓
workspace row updated with authhub_tenant_id + client_id
    ↓
Creator added as workspace_members with role: 'admin'
```

---

### 5. Storage Adapter
**Responsibility**: Abstract all storage operations behind a unified interface.
Swapping providers = changing one config value.

```typescript
// StorageAdapter interface
interface StorageAdapter {
  upload(key: string, buffer: Buffer, contentType: string): Promise<void>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  presign(key: string, expirySeconds: number): Promise<string>
  move(fromKey: string, toKey: string): Promise<void>   // hot → cold tier
  exists(key: string): Promise<boolean>
}

// Implementations
class R2StorageAdapter implements StorageAdapter { ... }     // Cloudflare R2 (default)
class S3StorageAdapter implements StorageAdapter { ... }     // AWS S3 fallback
class LocalStorageAdapter implements StorageAdapter { ... }  // local dev only
```

---

### 6. Notifications Module
**Responsibility**: Deliver in-app, push, and email notifications.

```
Events that trigger notifications:
  - asset.approval_received    → notify all Editors + Admins in workspace
  - asset.processing_complete  → notify uploader
  - member.mentioned           → notify mentioned member
  - share.link_accessed        → notify link creator (if toggle on)
  - quota.warning_80           → notify all Admins
  - quota.warning_100          → notify all Admins (urgent)
```

**Pattern**: Observer — modules emit events, Notification Module listens and acts.
```typescript
eventBus.emit('asset.approval_received', { assetId, workspaceId, action, note })
// NotificationModule subscribes → creates notification rows + sends push
```

---

## Processing Pipeline (Workers)

```
Upload completes
    ↓
BullMQ queue: 'asset-processing'
    ↓
┌─────────────────────────────────────┐
│  Job: blur_hash                     │
│  - Read first frame / page          │
│  - Generate blur-hash string        │
│  - Store in assets.blur_hash        │
│  Priority: HIGH (needed for UI)     │
└─────────────────────────────────────┘
    ↓ (parallel with above)
┌─────────────────────────────────────┐
│  Job: thumbnail_sm / md / lg        │
│  - Sharp.js resize + convert WebP   │
│  - Upload to R2: /previews/{size}   │
│  - Create asset_previews row        │
│  Priority: NORMAL                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Job: metadata                      │
│  - Extract EXIF (images)            │
│  - Extract duration (video/audio)   │
│  - Extract page count (PDF)         │
│  Priority: LOW                      │
└─────────────────────────────────────┘

On any job failure after 3 retries:
    → Status: dead_letter
    → processing_jobs row updated
    → Admin notification sent
    → Original asset still accessible (not blocked)
```

**BullMQ Config:**
```typescript
const assetQueue = new Queue('asset-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: false     // keep failed jobs for inspection
  }
})
```

---

## Cron Jobs

| Job | Schedule | Action |
|---|---|---|
| `cleanup.orphans` | Every 24hrs | Delete R2 files with no asset row |
| `cleanup.previews` | Every 24hrs | Delete previews for deleted assets |
| `cleanup.sessions` | Every 6hrs | Remove expired upload_sessions |
| `cleanup.idempotency` | Every 1hr | Remove expired idempotency_keys |
| `cleanup.share_links` | Every 1hr | Mark expired share links |
| `lifecycle.cold_tier` | Weekly | Move assets not accessed in 90 days to cold storage |
| `quota.recalculate` | Daily | Recalculate workspace storage_used_bytes from R2 |

---

## Idempotency Middleware

Applied to all state-changing endpoints (POST, PUT, DELETE):

```typescript
async function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key']
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header required' })

  // Check if we've seen this key before
  const existing = await db.query(
    'SELECT response_status, response_body FROM idempotency_keys WHERE key = $1',
    [key]
  )

  if (existing.rows.length > 0) {
    // Return cached response — do not re-execute
    const { response_status, response_body } = existing.rows[0]
    return res.status(response_status).json(response_body)
  }

  // Intercept response to store it
  const originalJson = res.json.bind(res)
  res.json = async (body) => {
    await db.query(
      `INSERT INTO idempotency_keys (key, workspace_id, member_id, request_path, response_status, response_body)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [key, req.workspace.id, req.member.id, req.path, res.statusCode, body]
    )
    return originalJson(body)
  }

  next()
}
```

---

## Mobile Architecture (React Native)

```
┌────────────────────────────────────────────────┐
│              React Native App                  │
│                                                │
│  ┌──────────────┐    ┌───────────────────────┐ │
│  │  Online Mode │    │    Offline / Field    │ │
│  │              │    │       Mode            │ │
│  │ - Live sync  │    │ - SQLite metadata     │ │
│  │ - Stream     │    │ - Upload queue        │ │
│  │   previews   │    │ - Tag/organize assets │ │
│  │ - Real-time  │    │ - Blur-hash previews  │ │
│  │   notifs     │    │   from cache          │ │
│  └──────────────┘    └───────────────────────┘ │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │           Sync Engine                   │  │
│  │                                         │  │
│  │  NetInfo monitors connectivity          │  │
│  │  On reconnect:                          │  │
│  │    1. Flush upload_queue (chunked)      │  │
│  │    2. Pull metadata updates from API    │  │
│  │    3. Update SQLite mirror              │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │    Local SQLite (Expo SQLite)           │  │
│  │    workspaces | collections | assets    │  │
│  │    upload_queue                         │  │
│  └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Railway                            │
│                                                      │
│  ┌─────────────┐    ┌──────────────┐                │
│  │  API Server │    │   Workers    │                │
│  │  (Fastify)  │    │  (BullMQ)    │                │
│  │  2 replicas │    │  3 replicas  │                │
│  └─────────────┘    └──────────────┘                │
│                                                      │
│  ┌─────────────┐    ┌──────────────┐                │
│  │   Redis     │    │  Neon DB     │                │
│  │  (Upstash)  │    │ (Serverless  │                │
│  │             │    │  Postgres)   │                │
│  └─────────────┘    └──────────────┘                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  Cloudflare                          │
│  CDN (thumbnails, static)  +  R2 (file storage)     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                  AuthHub                             │
│  (Self-hosted or Railway) — OAuth 2.0 / OIDC        │
└─────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
Layer 1 — Transport
  HTTPS everywhere, HSTS, TLS 1.3 minimum

Layer 2 — Authentication (AuthHub)
  JWT validation via JWKS endpoint on every request
  Short-lived access tokens (15 min), refresh tokens (7 days)

Layer 3 — Authorization (Zero-Trust)
  Per-request: token valid → workspace member → role check → scope check
  No trust carried from previous requests

Layer 4 — Storage Access
  No public R2 bucket — all access via pre-signed URLs (max 1hr)
  Signed URLs scoped to specific asset, generated per request

Layer 5 — Input Validation
  Zod schema validation on all request bodies
  File type whitelist (validate MIME type + magic bytes, not just extension)
  Max file size enforced at upload initiation

Layer 6 — Rate Limiting
  Per-user: 300 req/min
  Per-workspace upload: 50/min (free), 200/min (pro)
  Enforced at API gateway via Redis sliding window
```
