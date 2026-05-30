# VaultKit — Phase 1 Agent Prompt
> Paste this into Antigravity to scaffold and build Phase 1 of VaultKit.
> The agent MUST read all referenced docs before writing code.

---

## CONTEXT

You are building **VaultKit** — a Digital Asset Management (DAM) platform for East African creative teams and agencies. It is a full-stack TypeScript monorepo with:
- A React web app (`apps/web`)
- A React Native + Expo mobile app (`apps/mobile`)
- A Fastify API server (`services/api`)
- BullMQ processing workers (`services/workers`)
- Shared packages (`packages/shared`, `packages/storage-adapter`)

VaultKit uses **AuthHub** as its identity provider — a custom-built OIDC/OAuth 2.0 service. All auth flows go through AuthHub. Zero auth logic lives in VaultKit itself.

---

## REQUIRED READING — DO THIS BEFORE WRITING ANY CODE

**Step 1 — Read every document in the `docs/` folder in this order:**
1. `docs/AUTHHUB_REFERENCE.md` — Complete AuthHub system knowledge. Read this before touching any auth code.
2. `docs/DESIGN_SYSTEM.md` — Complete UI/styling rules. Read this before touching any component code.
3. `docs/vaultkit-requirements.md` — What the system must do.
4. `docs/vaultkit-schema.md` — Full database schema with all tables, indexes, and constraints.
5. `docs/vaultkit-architecture.md` — Module breakdown, processing pipeline, security layers.
6. `docs/vaultkit-api.md` — REST + GraphQL API design with exact request/response shapes.
7. `docs/vaultkit-structure.md` — Where every file lives in the monorepo.

**Step 2 — Read the actual AuthHub API:**
- Open `https://authhub-npym.onrender.com/api/v1/docs`
- Note: this is on Render's free tier — if it doesn't respond immediately, wait 30s for cold start
- Read the actual endpoint paths and request shapes before implementing any AuthHub calls
- Never guess AuthHub endpoint paths — always verify from the docs or the source code at `github.com/AmosQuety/AuthHub/tree/main/backend`
- Alternatively, you can also get to know about AuthHub from the local folder; `C:\new code\AuthHub`  (but this should  be the last resort and you shouldnt edit anything there. Just read)

---

## PHASE 1 SCOPE

Build only what is listed here. Do not add features not in this list.

### 1. Monorepo Scaffold
- Initialize pnpm workspace with Turborepo
- Create all folders from `docs/vaultkit-structure.md`
- Set up `packages/shared` with all TypeScript types from `docs/vaultkit-schema.md`
- Set up `packages/storage-adapter` with the `StorageAdapter` interface + R2 implementation
- Create all `.env.example` files from `docs/vaultkit-env.md`

### 2. Database (Neon + Drizzle ORM)
- Set up Drizzle ORM connected to Neon PostgreSQL
- Implement the full schema from `docs/vaultkit-schema.md`:
  - `workspaces`
  - `workspace_members`
  - `collections`
  - `assets`
  - `asset_versions`
  - `asset_previews`
  - `tags` + `asset_tags`
  - `upload_sessions` + `upload_chunks`
  - `idempotency_keys`
  - `processing_jobs`
- Run initial migration
- Seed with one test workspace + one test member

### 3. API Server (Fastify)
Set up the Fastify server with:

**Middleware (applied globally):**
- `auth.middleware.ts` — zero-trust token validation against AuthHub JWKS
  - Verify JWT → extract workspace from `client_id` → verify membership → check role
  - Read `docs/AUTHHUB_REFERENCE.md` for exact implementation
- `idempotency.middleware.ts` — applied to all POST/PUT/DELETE
  - Reject 400 if `Idempotency-Key` header missing
  - Return cached response if key seen before (24hr TTL in `idempotency_keys` table)
- `rateLimit.middleware.ts` — Redis sliding window
- `validate.middleware.ts` — Zod schema validation on all request bodies

**Modules to implement:**

**Auth Module:**
- `GET /auth/login` — redirect to AuthHub `/oauth/authorize` with correct `client_id`
- `GET /auth/callback` — receive code, exchange for tokens via AuthHub `/oauth/token`
- `POST /auth/refresh` — refresh access token via AuthHub
- `POST /auth/logout` — invalidate local session

**Workspaces Module:**
- `POST /workspaces` — create workspace + call AuthHub Admin API to provision tenant + client
- `GET /workspaces/:id` — get workspace details
- `POST /workspaces/:id/members/invite` — invite member by email
- `PATCH /workspaces/:id/members/:memberId` — change role (admin only)
- `DELETE /workspaces/:id/members/:memberId` — remove member (admin only)

**Collections Module:**
- `POST /collections` — create folder
- `GET /collections` — list root collections
- `GET /collections/:id` — get collection detail
- `GET /collections/:id/assets` — list assets (cursor paginated)

**Assets Module:**
- `POST /assets/upload/init` — initiate chunked upload session
- `PUT /assets/upload/:sessionId/chunk/:index` — upload single chunk
- `POST /assets/upload/:sessionId/complete` — finalize upload → create asset + queue jobs
- `GET /assets/:id` — get full asset detail including pre-signed download URL
- `PATCH /assets/:id` — update name, collection, tags (with version conflict detection)
- `DELETE /assets/:id` — soft delete (set `deleted_at`)
- `GET /assets/:id/presign` — generate fresh pre-signed download URL

**Share Module:**
- `POST /share` — create share link
- `GET /s/:token` — public access (no auth middleware) — return asset data + pre-signed URL
- `POST /s/:token/action` — public (no auth) — submit approval / revision
- `DELETE /share/:id` — revoke share link

### 4. Processing Workers (BullMQ)
- Set up BullMQ queue `asset-processing` with Redis
- Configure job options: 3 attempts, exponential backoff (2s, 4s, 8s), dead-letter queue
- Implement workers:
  - `blurhash.worker.ts` — generate blur-hash string from image/video first frame → store in `assets.blur_hash`
  - `thumbnail.worker.ts` — Sharp.js resize to sm/md/lg WebP → upload to R2 → create `asset_previews` rows
  - `pdf.worker.ts` — generate first-page preview for PDFs
  - `metadata.worker.ts` — extract EXIF, duration, page count → store in asset row
- Log all job status to `processing_jobs` table
- On job failure after 3 retries → mark status `dead_letter`
- Trigger `asset.status = 'ready'` when all mandatory jobs complete (blur_hash + thumbnail_md minimum)

### 5. Storage Adapter
- Implement `R2StorageAdapter` in `packages/storage-adapter`
- Methods: `upload`, `download`, `delete`, `presign`, `move`, `exists`
- Pre-signed URL expiry: 3600 seconds (1 hour)
- Storage key format: `/{workspace_id}/{asset_id}/{filename}`
- Preview key format: `/{workspace_id}/{asset_id}/previews/{size}.webp`

### 6. Web App (React)
Read `docs/DESIGN_SYSTEM.md` completely before writing any component.

**Design rules (non-negotiable):**
- Fonts: Sora (UI) + IBM Plex Mono (metadata/badges/labels)
- No gradients anywhere — not on surfaces, buttons, thumbnails
- Borders: always 0.5px, color: `var(--vk-border)` default
- Dark mode primary, light mode supported via CSS custom properties
- Accent: `#e8784a` (dark) / `#c5522d` (light) — used sparingly
- Motion: max 150ms ease — no bounce, no spring

**Pages to build:**
- `/login` — redirect to AuthHub
- `/auth/callback` — handle OAuth callback, store tokens
- `/w/:workspaceSlug` — dashboard (recent assets, collections, pending approvals)
- `/w/:workspaceSlug/collections/:id` — collection view (asset grid)
- `/w/:workspaceSlug/assets/:id` — asset detail (metadata, versions, share)
- `/w/:workspaceSlug/share` — share links management
- `/s/:token` — public share / approval view (WhatsApp-optimized, minimal)

**Components to build (from design system):**
- `ui/Button` (primary, secondary, ghost, danger variants)
- `ui/Badge` (approved, pending, revision_requested, processing, archived)
- `ui/Card`
- `ui/Input`
- `asset/AssetCard` (blur-hash → thumbnail loading flow)
- `asset/AssetGrid` (cursor-based infinite scroll)
- `asset/SyncIndicator` (synced, uploading, queued, failed dots)
- `workspace/StorageBar` (quota progress — solid fill, no gradient, color shifts at 80%/95%)
- `share/ApprovalCard` (approve/revise buttons)

### 7. Mobile App (React Native + Expo)
Read `docs/DESIGN_SYSTEM.md` completely before writing any component.

**Critical mobile rules:**
- NO `expo-linear-gradient` — do not install or use it
- All colors from `src/theme/colors.ts` — never hardcode hex in components
- `StyleSheet.hairlineWidth` for all borders — never 1
- `useNativeDriver: true` on all Animated calls
- Fonts loaded via `expo-font` from `assets/fonts/` (Sora + IBM Plex Mono TTF files)

**Screens to build (Phase 1):**
- `LoginScreen` — triggers AuthHub OAuth flow
- `DashboardScreen` — recent assets, collections list
- `CollectionScreen` — asset grid with blur-hash thumbnails
- `AssetScreen` — asset detail, download, share
- `UploadScreen` — file picker + upload queue with sync status

**Offline / Field Mode (implement from Phase 1):**
- SQLite schema from `docs/vaultkit-schema.md` (mobile section)
- `useNetInfo.ts` — detect connectivity changes
- `useUploadQueue.ts` — queue uploads locally when offline, flush on reconnect
- Chunked upload with delta-sync (resume from `chunk_offset` on reconnect)
- Sync status indicators on every asset row

---

## CONSTRAINTS

- **TypeScript strict mode everywhere** — no `any` types
- **Zod for all request/response validation** — no unvalidated inputs
- **Drizzle ORM only** — no raw SQL except where Drizzle cannot express it
- **No auth logic in VaultKit** — all auth goes through AuthHub as described in `docs/AUTHHUB_REFERENCE.md`
- **Idempotency-Key required on all mutations** — enforce in middleware, not per-route
- **No gradients** — see `docs/DESIGN_SYSTEM.md`
- **Every asset lookup must be scoped by workspace_id** — never query assets globally

---

## TESTING AFTER PHASE 1

After Phase 1 is complete, verify these scenarios manually:

1. Developer creates a VaultKit workspace → AuthHub tenant + client provisioned ✓
2. Team member logs in via OAuth → workspace resolved from `client_id` in token ✓
3. Member uploads a 5MB image → chunked upload → BullMQ jobs → thumbnails generated ✓
4. Member uploads while offline (mobile) → queued in SQLite → auto-uploads on reconnect ✓
5. Admin shares a file → share link created → client opens `/s/:token` → approves ✓
6. Same email in two workspaces → logs into each without collision ✓
7. Retry same upload (same Idempotency-Key) → returns cached response, not duplicate ✓
8. Invalid/expired token → 401 returned immediately, no workspace resolution attempted ✓

---

## WHAT NOT TO BUILD IN PHASE 1

- ❌ MTN MoMo / Airtel Money payments (Phase 3)
- ❌ AI auto-tagging (Phase 3)
- ❌ Storage lifecycle tiers / cold storage moves (Phase 2)
- ❌ In-app notification push delivery (Phase 2) — create notification rows in DB only
- ❌ Password-protected share links (Phase 2)
- ❌ GraphQL endpoint (Phase 2) — REST only in Phase 1
- ❌ Webhook delivery (Phase 2)
- ❌ WhatsApp-specific link generation (Phase 2) — basic share links only in Phase 1
