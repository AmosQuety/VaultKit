# VaultKit — Requirements Document
> Digital Asset Management Platform for East African Teams & Creators  
> Version 1.0 | Built to stress-test AuthHub

---

## Product Vision

VaultKit is a team-oriented Digital Asset Management (DAM) platform built for the realities of East African businesses: low-bandwidth connections, mobile-first workflows, and team collaboration that happens over WhatsApp before it happens in apps. It is simultaneously a production-grade application and a real-world stress test for AuthHub (a multi-tenant OIDC/OAuth 2.0 identity provider).

**Core Value Proposition:**  
Organized, secure, offline-resilient file management for agencies, creators, and SMEs — without requiring corporate Visa cards or high-speed internet.

---

## 1. Functional Requirements (FR)

### FR1: Workspace Multi-Tenancy
- Users can create and join multiple Workspaces (e.g., "Agency A", "Freelance Projects")
- Each Workspace maps to exactly one AuthHub `tenant_id`
- Data in Workspace A must be strictly isolated from Workspace B at the database and storage level
- A user (developer/owner) who creates a Workspace becomes its Admin automatically
- Workspaces have a unique slug used in all share links (e.g., `vaultkit.app/agency-a/...`)

### FR2: Granular Role-Based Access Control (RBAC)
| Role | Permissions |
|---|---|
| **Admin** | Full control: billing, user management, all files, workspace settings |
| **Editor** | Upload, tag, rename, move, delete own files; view all files |
| **Viewer** | View and download files in shared Collections only |
| **Client (external)** | View-only access via share link; can Approve / Request Revision |

- Roles are scoped per Workspace (a user can be Admin in Workspace A and Viewer in Workspace B)
- Token scopes enforced by AuthHub: `files:read`, `files:upload`, `files:delete`, `workspace:manage`

### FR3: Smart Asset Management
- Support for folders and nested collections
- File versioning: save "Revision 1", "Revision 2" under the same asset entry
- Every asset has: `version_number`, `updated_at`, `content_hash` (SHA-256)
- Auto-tagging based on folder name (e.g., files in `/clients/acme/` auto-tagged `acme`, `client`)
- Optional AI tagging: classify image content using vision API
- Search by tag, filename, upload date, uploader, file type
- Bulk operations: move, tag, delete, share

### FR4: Secure Sharing Engine
- Generate expiring share links: 1hr, 24hr, 7 days, Custom, Never
- Password protection for external share links
- Toggle: "View-only" vs "Allow Download" per shared link
- Toggle: "Single use" (link expires after one download)
- Pre-signed URLs — all file access via backend-generated short-lived URLs (never expose storage bucket directly)
- Revoke any active share link at any time

### FR5: WhatsApp Approval Workflow
- Generate a "WhatsApp-optimized" share link for any asset or Collection
- Link opens a lightweight web view (no login required for client) showing:
  - Ultra-low-res blur-hash preview loading into a compressed WebP
  - File name, size, uploader, upload date
  - Two action buttons: **"Approve ✓"** and **"Request Revision ✗"**
  - Optional comment field for revision requests
- Client action syncs back to VaultKit in real-time via webhook
- Workspace members receive in-app + push notification on client action
- Approval status tracked per asset: `pending`, `approved`, `revision_requested`

### FR6: Offline-First "Field Mode"
- Mobile app allows full metadata tagging while offline (folder, tags, name, notes)
- Upload queue: assets captured offline are queued locally and uploaded automatically when connectivity is restored
- Delta-sync: uploads resume from exact byte offset if interrupted (chunked multipart)
- Offline search against locally cached metadata (SQLite)
- Visual indicator showing sync status per asset: `synced`, `queued`, `uploading`, `failed`

### FR7: Data-Saver Previews
- On load, show a 10KB blur-hash or ultra-low-res WebP placeholder (generated server-side on upload)
- Full-resolution preview loaded only on explicit user action ("Pull to Download" / "Load Full")
- Thumbnails generated in 3 sizes: `sm` (100px), `md` (400px), `lg` (1200px)
- Serve thumbnails via CDN with aggressive cache headers
- All preview generation happens asynchronously via processing pipeline (does not block upload)

### FR8: Notification System
- In-app + push alerts for:
  - Client approves or requests revision on a file
  - Teammate @mentions a user in a comment
  - Upload completes processing (thumbnails ready)
  - Share link accessed (optional, per-link toggle)
  - Storage quota approaching 80% / 100%
- Notification preferences configurable per user per Workspace

### FR9: Localized Payments & Subscriptions
- Pricing displayed in UGX, KES (not USD only)
- Payment methods: MTN Mobile Money, Airtel Money, card (Stripe fallback)
- Subscription tiers:
  - **Free**: 2GB storage, 3 members, 5 active share links
  - **Pro**: 50GB storage, 20 members, unlimited links — UGX 35,000/month
  - **Agency**: 500GB storage, unlimited members, priority processing — UGX 120,000/month
- Invoices downloadable as PDF

### FR10: Storage Lifecycle Management
- Original assets: permanent, within workspace storage quota
- Generated previews/thumbnails: auto-delete after 7 days if parent asset deleted
- Share link export packages: auto-delete 7 days after last download
- Orphaned file cleanup: cron job every 24hrs removes files with no linked asset record
- Admins can configure per-workspace retention policies
- Archive tier: assets not accessed in 90 days move to cold storage automatically

---

## 2. Non-Functional Requirements (NFR)

### NFR1: Connectivity Resilience
- Mobile app must function fully for metadata operations with zero connectivity
- Uploads must resume automatically after network drop with no user intervention
- Offline state must not lose any user-created data (tag, rename, organize operations)
- Delta-sync chunk size: 512KB (optimized for 3G)
- Maximum acceptable sync delay after reconnection: 30 seconds

### NFR2: Performance (Low Bandwidth Priority)
- Initial page load: under 3 seconds on a 3G connection (10 Mbps down, high latency)
- Blur-hash preview load: under 500ms on 3G
- API responses: p95 latency under 300ms for metadata queries
- Aggressive device-side caching: thumbnails and metadata cached locally for 24hrs
- API payloads: GraphQL / REST responses include only fields needed per screen (no over-fetching)
- Bundle size: React web app under 200KB gzipped initial chunk

### NFR3: Security & Compliance
- All authentication flows routed exclusively through AuthHub (no internal auth logic)
- Zero-trust enforcement: every request independently validates token + workspace membership + resource permission
- Pre-signed URLs for all file access with maximum 1-hour expiry
- Password-protected links use server-side hash comparison (bcrypt)
- Personal data handling compliant with Uganda Data Protection & Privacy Act (2019)
- No permanent logging of file contents; logs contain only metadata (asset_id, action, user_id, timestamp)
- HTTPS enforced across all endpoints; HSTS enabled

### NFR4: Data Integrity
- Every asset row has: `version_number` (integer, increments on every write), `updated_at` (timestamp), `content_hash` (SHA-256 of file content)
- Conflict resolution rule: **server wins** — last write acknowledged by server is truth
- Idempotency keys required on all mutating operations (uploads, approvals, payments)
  - Key format: client-generated UUID, passed in `Idempotency-Key` header
  - Server caches key → result mapping for 24 hours
- Retry safety: same idempotency key returns cached result without re-execution

### NFR5: Scalability
- Image/video processing workers must support horizontal scaling independently of API servers
- Processing queue (BullMQ) must handle burst loads via configurable concurrency per worker
- Database: connection pooling via PgBouncer or Neon's built-in pooler
- Storage abstracted behind a unified interface — swap Cloudflare R2 for S3/GCS without changing application code

### NFR6: Resilience & Failure Recovery
- BullMQ job retry: 3 attempts with exponential backoff (2s, 4s, 8s)
- Failed jobs move to dead-letter queue after exhausting retries; admin notified
- Partial failure handling: if upload succeeds but processing fails, asset marked `processing_failed` — original still accessible, processing retried separately
- No single point of failure in the processing pipeline

### NFR7: Backpressure & Rate Limiting
- Upload rate limiting: 50 uploads/minute per workspace (free), 200/minute (pro)
- API rate limiting: 300 requests/minute per user
- Worker throttling: max 10 concurrent processing jobs per tier
- Graceful degradation: if processing queue is full, uploads still succeed — processing queued and user notified

### NFR8: Observability
- **Logs**: structured JSON logs with `request_id`, `user_id`, `workspace_id`, `action`, `duration_ms`
- **Metrics**: error rates, queue depth, processing latency, storage usage per workspace
- **Traces**: distributed request tracing across API → worker → storage using OpenTelemetry (Phase 3)
- Alerting thresholds: error rate > 1%, queue depth > 500 jobs, p95 latency > 1s

---

## 3. Technical Requirements

### Authentication — AuthHub Integration
- OAuth 2.0 / OIDC: AuthHub handles all user login and session management
- Every VaultKit Workspace has a corresponding AuthHub `tenant_id`
- End-user login always includes `client_id` (Workspace's OAuth client) — never email-only lookup
- Token scopes: `files:read`, `files:upload`, `files:delete`, `workspace:manage`, `billing:manage`
- Machine-to-Machine (M2M): backend processing workers authenticate via Client Credentials flow
- Session resilience: AuthHub must handle token refresh after 4+ hours of offline inactivity
- Cross-tenant: a user with identity in Workspace A can be invited to Workspace B — AuthHub manages the shared identity

### Storage
- **Provider**: Cloudflare R2 (primary — zero egress fees) with S3-compatible API
- **Abstraction layer**: unified `StorageAdapter` interface — swap provider by changing config only
- **Access**: all file access via pre-signed URLs generated by backend (max 1hr expiry)
- **Structure**: `/{workspace_id}/{asset_id}/{filename}` and `/{workspace_id}/{asset_id}/previews/{size}`
- **Tiers**:
  - Hot (0–90 days active): R2 Standard
  - Cold (90+ days inactive): R2/S3 Glacier equivalent — auto-moved by lifecycle cron

### Processing Pipeline
- **Queue**: BullMQ + Redis
- **Jobs on upload**:
  1. Generate blur-hash string (stored in DB, instant)
  2. Generate WebP thumbnails: `sm`, `md`, `lg` via Sharp.js
  3. Generate PDF first-page preview (for documents)
  4. Extract and store file metadata (EXIF, duration, page count)
- **Retry**: 3 attempts, exponential backoff
- **Dead-letter queue**: failed jobs after 3 attempts; admin alert sent

### Database
- **Primary**: PostgreSQL via Neon (serverless, multiple free projects, branching support)
- **Connection pooling**: Neon's built-in pooler
- **Mobile local DB**: SQLite (React Native / Expo SQLite) for offline state and fast search
- **Sync strategy**: server is source of truth; local SQLite mirrors metadata only (not file blobs)
- **ORM**: Drizzle ORM (lightweight, TypeScript-native, works with Neon)

### API Design
- **Protocol**: REST for simple CRUD; GraphQL for complex relational queries (mobile screen optimization)
- **Principle**: mobile screens request only fields they need — no over-fetching
- **Idempotency**: `Idempotency-Key` header required on POST/PUT/DELETE
- **Pagination**: cursor-based (not offset) for large asset libraries
- **Versioning**: `/api/v1/` prefix; additive changes only within a version

### Tech Stack Summary
```
Frontend (Web)      React + TypeScript + Tailwind
Frontend (Mobile)   React Native + Expo
Backend API         Node.js + Express / Fastify (TypeScript)
Processing Workers  Node.js + BullMQ + Sharp.js
Database            PostgreSQL (Neon) + SQLite (mobile)
Cache               Redis (Upstash or Railway)
Storage             Cloudflare R2
Auth                AuthHub (OAuth 2.0 / OIDC)
ORM                 Drizzle ORM
Queue               BullMQ
Payments            MTN MoMo API + Airtel Money API + Stripe
Deployment          Railway (API + Workers) + Cloudflare (CDN + R2)
```

---

## 4. Implementation Phases

### Phase 1 — Core (Build)
- Workspace creation + AuthHub tenant mapping
- File upload with chunked multipart + idempotency keys
- Asset versioning (version_number, content_hash, updated_at)
- Blur-hash + thumbnail generation pipeline (BullMQ)
- Pre-signed URL file access
- Zero-trust auth middleware (token + workspace + resource)
- BullMQ dead-letter queue (config only)
- Basic RBAC (Admin, Editor, Viewer)

### Phase 2 — Product (First Users)
- WhatsApp Approval Workflow
- Offline Field Mode (mobile upload queue + delta-sync)
- Data-Saver previews on mobile
- Share link engine (expiry, password, download toggle)
- Rate limiting per workspace
- Storage quota enforcement
- Notification system (in-app + push)
- Retention/cleanup cron job

### Phase 3 — Scale
- Localized payments (MTN MoMo + Airtel Money)
- Storage lifecycle tiers (hot → cold auto-move)
- AI auto-tagging
- Full observability (OpenTelemetry traces + metrics dashboard)
- Advanced conflict resolution
- Archive management UI

---

## 5. AuthHub Stress Test Scenarios

| Test Scenario | What It Validates |
|---|---|
| User logs into Workspace A, then switches to Workspace B | Cross-tenant session handling |
| Same email invited to two different Workspaces | Cross-tenant user identity, no duplicate confusion |
| User goes offline 4 hours, comes back and acts on a file | Token refresh after long offline gap |
| Processing worker requests file access on behalf of user | M2M Client Credentials flow |
| Client accesses WhatsApp share link (no login) | Scope-limited tokenless access |
| Admin revokes a member's access mid-session | Token invalidation / real-time RBAC enforcement |
| `files:delete` scope checked before delete action | Fine-grained scope enforcement |
