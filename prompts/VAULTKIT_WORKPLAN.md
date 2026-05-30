# VaultKit — Complete Phased Work Plan
> From scaffold to production. Every phase is independently shippable.
> DB-dependent phases are clearly marked.

---

## Reading Key

```
🟢 No DB needed          — can be done right now
🟡 DB needed             — requires Neon + Drizzle setup first
🔴 Blocked on prior phase — do not start until previous phase is complete
⚙️  Agent task           — paste the corresponding prompt into Antigravity
🧪 Manual test           — verify before moving to the next phase
```

---

## PHASE 0 — Foundation (No DB needed)
> Everything that can be built before Neon is touched.
> Estimated: 1–2 sessions

### 0-A: Monorepo Scaffold 🟢 ⚙️
- [ ] Initialize pnpm workspace + Turborepo at root
- [ ] Create all directories from `vaultkit-structure.md`
- [ ] `turbo.json` with build, dev, lint pipelines
- [ ] Root `package.json` with workspace globs
- [ ] All `.env.example` files from `vaultkit-env.md`
- [ ] `packages/shared` — TypeScript package setup, tsconfig
- [ ] `packages/storage-adapter` — TypeScript package setup, tsconfig
- [ ] `apps/web` — Vite + React + TypeScript scaffold
- [ ] `apps/mobile` — Expo + React Native scaffold
- [ ] `services/api` — Fastify + TypeScript scaffold
- [ ] `services/workers` — Node.js + TypeScript scaffold

**Verify:** `pnpm install` runs clean. `turbo build` with no errors.

---

### 0-B: Shared Types Package 🟢 ⚙️
> Lives in `packages/shared/src/types/`

- [ ] `asset.types.ts` — Asset, AssetVersion, AssetPreview, AssetStatus, ApprovalStatus
- [ ] `workspace.types.ts` — Workspace, WorkspaceMember, WorkspaceRole, WorkspacePlan
- [ ] `share.types.ts` — ShareLink, SharePermission, ShareAction
- [ ] `auth.types.ts` — TokenPayload, AuthContext, AuthScope
- [ ] `utils/formatBytes.ts`
- [ ] `utils/formatDate.ts`
- [ ] `utils/idempotencyKey.ts` — UUID v4 generator

**Verify:** Import a type in `apps/web` without error.

---

### 0-C: Storage Adapter 🟢 ⚙️
> Lives in `packages/storage-adapter/src/`

- [ ] `adapter.interface.ts` — `StorageAdapter` interface with: `upload`, `download`, `delete`, `presign`, `move`, `exists`
- [ ] `r2.adapter.ts` — Full R2 implementation using `@aws-sdk/client-s3` (S3-compatible)
  - Storage key format: `/{workspace_id}/{asset_id}/{filename}`
  - Preview key format: `/{workspace_id}/{asset_id}/previews/{size}.webp`
  - Pre-signed URL expiry: 3600 seconds
- [ ] `s3.adapter.ts` — AWS S3 fallback (same interface, different config)
- [ ] `local.adapter.ts` — Local filesystem adapter for dev/testing
- [ ] Factory function: `createStorageAdapter(provider)` reads `STORAGE_PROVIDER` env

**Verify:** Unit test `presign()` against a test R2 bucket. URL is valid.

---

### 0-D: Web Design System (UI Primitives) 🟢 ⚙️
> Lives in `apps/web/src/`
> Agent MUST read `DESIGN_SYSTEM.md` before writing a single component.

- [ ] `styles/tokens.css` — All CSS custom properties from design system (dark + light)
- [ ] `styles/global.css` — Font imports, resets, base styles
- [ ] `components/ui/Button.tsx` — primary, secondary, ghost, danger variants
- [ ] `components/ui/Badge.tsx` — approved, pending, revision_requested, processing, archived
- [ ] `components/ui/Card.tsx` — base card with correct border/radius/padding
- [ ] `components/ui/Input.tsx` — with focus state, placeholder, error state
- [ ] `components/ui/index.ts` — barrel export

**Design rules enforced:**
- Sora UI / IBM Plex Mono metadata — no other fonts
- No gradients — zero
- 0.5px borders — always
- Max 150ms transitions
- Accent `#e8784a` used sparingly

**Verify:** Render a `<Button>` and `<Badge status="approved" />` in Storybook or a dev page. Inspect in dark + light mode.

---

### 0-E: Web Asset Components 🟢 ⚙️
> Depends on 0-D

- [ ] `components/asset/AssetCard.tsx`
  - Blur-hash → thumbnail loading flow (4 states: solid bg → blur-hash → WebP → full res)
  - Shows: name, file size (IBM Plex Mono), approval Badge, sync dot
  - No gradient on thumbnail placeholder — solid `surface2` only
- [ ] `components/asset/AssetGrid.tsx` — cursor-based infinite scroll, CSS grid layout
- [ ] `components/asset/AssetPreview.tsx` — full asset preview with metadata sidebar
- [ ] `components/asset/SyncIndicator.tsx` — dot with pulse animation for uploading state
- [ ] `components/workspace/StorageBar.tsx`
  - Solid fill, no gradient
  - Accent at normal → warning color at 80% → danger color at 95%
- [ ] `components/share/ApprovalCard.tsx` — approve/revise buttons
- [ ] `components/workspace/MemberList.tsx`
- [ ] `components/collection/CollectionCard.tsx`
- [ ] `components/collection/CollectionList.tsx`

**Verify:** Render `<AssetGrid>` with mock data. Blur-hash loads before thumbnail.

---

### 0-F: Mobile Theme Layer 🟢 ⚙️
> Lives in `apps/mobile/src/theme/`

- [ ] `colors.ts` — exact palette from design system, dark + light objects
- [ ] `spacing.ts` — spacing scale constants
- [ ] `typography.ts` — font family names, size scale, line heights
- [ ] `app.json` / `app.config.js` — font assets registered
- [ ] Font files placed in `assets/fonts/` — Sora (Light, Regular, Medium, SemiBold) + IBM Plex Mono (Regular, Medium) TTF

**Rules:**
- No `expo-linear-gradient` installed — ever
- `StyleSheet.hairlineWidth` on all borders — never `1`
- `useNativeDriver: true` on all Animated calls

**Verify:** Open app. Render a `<Text>` using `Sora-Medium`. Confirm font loads.

---

### 0-G: Mobile UI Primitives 🟢 ⚙️
> Depends on 0-F

- [ ] `components/ui/Badge.tsx` — RN version, same status variants
- [ ] `components/ui/Button.tsx` — primary + secondary using Pressable
- [ ] `components/ui/Card.tsx` — RN card with hairlineWidth border
- [ ] `components/ui/Input.tsx` — with focus border color change
- [ ] `components/asset/AssetCard.tsx` — with blur-hash image + solid thumbnail bg
- [ ] `components/asset/BlurHashImage.tsx` — cross-fades blur → WebP
- [ ] `components/asset/SyncStatusBar.tsx` — persistent top bar in offline/syncing state
- [ ] `components/upload/UploadQueue.tsx` — list of queued assets with sync dots

---

## PHASE 1 — Database + API Core
> Requires Neon PostgreSQL. Set up the DB first, then proceed.
> Estimated: 2–3 sessions

### 1-A: Database Setup 🟡 ⚙️
- [ ] Create Neon project, copy `DATABASE_URL`
- [ ] Install Drizzle ORM + `drizzle-kit`
- [ ] `services/api/src/db/schema.ts` — full schema from `vaultkit-schema.md`:
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
- [ ] `services/api/src/db/client.ts` — Neon connection with pooler
- [ ] `drizzle.config.ts` at service root
- [ ] Run `drizzle-kit push` — apply schema to Neon
- [ ] Seed script: one test workspace + one test member

**Verify:** Connect to Neon in the dashboard. All tables visible with correct columns.

---

### 1-B: API Server Bootstrap 🟡 ⚙️
> Depends on 1-A

- [ ] Fastify server setup with TypeScript
- [ ] CORS configured for `WEB_APP_URL`
- [ ] Health check: `GET /health` → `{ status: "ok" }`
- [ ] Error handler plugin — returns standard error format from `vaultkit-api.md`
- [ ] Request logger with `request_id`, structured JSON output

---

### 1-C: Auth Middleware 🟡 ⚙️
> AGENT: Read `AUTHHUB_REFERENCE.md` completely before writing any of this.

- [ ] `modules/auth/authhub.client.ts` — HTTP client wrapper for AuthHub API
- [ ] `modules/auth/auth.middleware.ts` — zero-trust chain:
  1. Extract Bearer token
  2. Verify JWT signature via AuthHub JWKS (`AUTHHUB_JWKS_URL`)
  3. Resolve workspace from `client_id` in token
  4. Confirm active workspace membership
  5. Attach `req.auth` context
- [ ] `modules/auth/auth.middleware.ts` — `requireScope(scope)` enforcer
- [ ] `modules/auth/auth.middleware.ts` — `requireRole(...roles)` enforcer
- [ ] JWKS cached in memory, refreshed every 10 minutes

**Verify:**
- Valid token → `req.auth` populated
- Expired token → 401
- Valid token, not a member → 403
- Valid token, wrong scope → 403

---

### 1-D: Global Middleware Stack 🟡 ⚙️
> Depends on 1-B

- [ ] `middleware/idempotency.middleware.ts`
  - Reject 400 if `Idempotency-Key` header missing on POST/PUT/DELETE
  - Check `idempotency_keys` table — return cached response if key exists (24hr TTL)
  - Store key + response after successful execution
- [ ] `middleware/rateLimit.middleware.ts` — Redis sliding window per user
  - Free: 300 req/min, Pro: 600 req/min, Agency: 2000 req/min
- [ ] `middleware/validate.middleware.ts` — Zod validation on all request bodies

---

### 1-E: Workspaces Module 🟡 ⚙️
> Depends on 1-C, 1-D

- [ ] `modules/workspaces/authhub.provisioner.ts`
  - `provisionWorkspace(name, slug)` → calls AuthHub Admin API to create tenant + OAuth client
  - Returns `{ tenant_id, client_id, client_secret }`
- [ ] `POST /workspaces` — create workspace + provision AuthHub tenant
- [ ] `GET /workspaces/:id` — workspace details + storage stats
- [ ] `POST /workspaces/:id/members/invite` — invite by email
- [ ] `PATCH /workspaces/:id/members/:memberId` — change role (admin only)
- [ ] `DELETE /workspaces/:id/members/:memberId` — remove member (admin only)

**Verify test from agent prompt:**
- Create workspace → AuthHub tenant created ✓
- Same email in two workspaces → no collision ✓

---

### 1-F: Auth Routes 🟡 ⚙️
> Depends on 1-C

- [ ] `GET /auth/login` — redirect to AuthHub `/oauth/authorize` with correct `client_id`
- [ ] `GET /auth/callback` — receive code, exchange for tokens via AuthHub `/oauth/token`
- [ ] `POST /auth/refresh` — refresh access token
- [ ] `POST /auth/logout` — clear session

---

### 1-G: Collections Module 🟡 ⚙️
> Depends on 1-C, 1-D

- [ ] `POST /collections` — create folder
- [ ] `GET /collections` — list root collections (cursor paginated)
- [ ] `GET /collections/:id` — collection detail
- [ ] `GET /collections/:id/assets` — list assets (cursor paginated, with filters)

---

### 1-H: Assets Upload Pipeline 🟡 ⚙️
> Depends on 1-G

- [ ] `modules/assets/upload.service.ts`
  - Chunked upload: init → upload chunks → complete
  - Chunk validation via `X-Chunk-Checksum` header
  - Resume from `chunk_offset` on reconnect
- [ ] `POST /assets/upload/init` — create `upload_sessions` row
- [ ] `PUT /assets/upload/:sessionId/chunk/:index` — store chunk
- [ ] `POST /assets/upload/:sessionId/complete` — assemble file → create asset row → queue BullMQ jobs
- [ ] Idempotency enforced on all three endpoints

**Verify:**
- Upload 5MB image chunked → asset row created in DB ✓
- Retry with same `Idempotency-Key` → cached response, no duplicate ✓

---

### 1-I: Assets CRUD 🟡 ⚙️
> Depends on 1-H

- [ ] `GET /assets/:id` — full asset detail with versions, previews, pre-signed download URL
- [ ] `PATCH /assets/:id` — update name, collection, tags with version conflict detection
- [ ] `DELETE /assets/:id` — soft delete (`deleted_at`)
- [ ] `GET /assets/:id/presign` — fresh pre-signed URL
- [ ] All lookups scoped by `workspace_id` — never global

---

### 1-J: Processing Workers 🟡 ⚙️
> Depends on 1-H (workers triggered by upload complete)

- [ ] `services/workers/queues/asset.queue.ts` — BullMQ queue definition
  - Queue: `asset-processing`
  - Job options: 3 attempts, exponential backoff (2s, 4s, 8s), dead-letter queue
- [ ] `workers/blurhash.worker.ts` — generate blur-hash string → store in `assets.blur_hash`
- [ ] `workers/thumbnail.worker.ts` — Sharp.js resize to sm/md/lg WebP → upload to R2 → create `asset_previews` rows
- [ ] `workers/pdf.worker.ts` — first-page preview for PDFs
- [ ] `workers/metadata.worker.ts` — extract EXIF, duration, page count → store in asset row
- [ ] All job status logged to `processing_jobs` table
- [ ] On all mandatory jobs complete: `asset.status = 'ready'`
- [ ] After 3 retries failed: `status = 'dead_letter'`

**Verify:**
- Upload image → within 30s: blur_hash populated, sm/md/lg previews in R2, status = ready ✓

---

### 1-K: Share Module 🟡 ⚙️
> Depends on 1-I

- [ ] `POST /share` — create share link
- [ ] `GET /s/:token` — public endpoint (no auth middleware) — return asset + pre-signed URL
- [ ] `POST /s/:token/action` — public — submit approval or revision
- [ ] `DELETE /share/:id` — revoke link
- [ ] Approval action updates `assets.approval_status` + creates notification row

---

## PHASE 1 COMPLETE — Verification Checklist
> Run every item before calling Phase 1 done.

```
1. [ ] Workspace created → AuthHub tenant + client provisioned
2. [ ] Team member logs in → workspace resolved from client_id in token
3. [ ] Member uploads 5MB image → chunked → BullMQ → thumbnails generated
4. [ ] Admin shares file → link created → client opens /s/:token → approves
5. [ ] Same email in two workspaces → logs into each without collision
6. [ ] Same upload Idempotency-Key → cached response, no duplicate asset
7. [ ] Invalid/expired token → 401 returned, no workspace resolution attempted
8. [ ] files:delete scope missing → 403 returned
9. [ ] Upload init with no Idempotency-Key → 400 returned
```

---

## PHASE 2 — Web App Pages
> Requires Phase 1 complete. All components from Phase 0 should be done.
> Estimated: 1–2 sessions

### 2-A: Auth Pages + Token Management 🔴 ⚙️
- [ ] `pages/auth/Login.tsx` — redirect to AuthHub
- [ ] `pages/auth/Callback.tsx` — handle OAuth callback, store tokens
- [ ] `hooks/useAuth.ts` — read tokens, trigger refresh, redirect on expiry
- [ ] `stores/auth.store.ts` — Zustand: tokens, user identity, workspace context
- [ ] `lib/authhub.client.ts` — OAuth redirect builder
- [ ] `lib/api.client.ts` — fetch wrapper with auth header + auto-refresh

---

### 2-B: Workspace Dashboard 🔴 ⚙️
- [ ] `pages/workspace/Dashboard.tsx` — recent assets, collections list, pending approvals
- [ ] `pages/workspace/Members.tsx` — member list + invite + role management
- [ ] `pages/workspace/Settings.tsx` — workspace name, plan, danger zone
- [ ] `hooks/useWorkspace.ts`
- [ ] `stores/workspace.store.ts`

---

### 2-C: Collection + Asset Views 🔴 ⚙️
- [ ] `pages/workspace/Collection.tsx` — asset grid with `AssetGrid` + infinite scroll
- [ ] `pages/workspace/Asset.tsx` — asset detail: metadata panel, versions list, share button
- [ ] `hooks/useAssets.ts` — cursor-based fetching, mutation helpers

---

### 2-D: Upload + Share UI 🔴 ⚙️
- [ ] `hooks/useUpload.ts` — chunked upload orchestrator, progress state
- [ ] `stores/upload.store.ts` — upload queue, per-file progress
- [ ] `pages/workspace/ShareLinks.tsx` — share links management
- [ ] `pages/workspace/Approvals.tsx` — pending approvals view
- [ ] `pages/public/ShareView.tsx` — WhatsApp approval page (no login required)
  - Under 10KB total HTML
  - Blur-hash → preview → approve/revise buttons
  - No navbar, no logo, minimal

---

## PHASE 3 — Mobile Screens
> Requires Phase 1 complete. Mobile theme from Phase 0 must be done.
> Estimated: 2 sessions

### 3-A: Mobile Auth + Navigation 🔴 ⚙️
- [ ] `screens/auth/LoginScreen.tsx` — AuthHub OAuth via `expo-auth-session`
- [ ] Token storage in `expo-secure-store`
- [ ] `lib/authhub.client.ts` — mobile OAuth flow
- [ ] Bottom tab navigator + stack navigator setup

---

### 3-B: Mobile Core Screens 🔴 ⚙️
- [ ] `screens/workspace/DashboardScreen.tsx` — recent assets, collections
- [ ] `screens/workspace/CollectionScreen.tsx` — asset grid with blur-hash
- [ ] `screens/workspace/AssetScreen.tsx` — detail, download, share
- [ ] `screens/workspace/SettingsScreen.tsx`

---

### 3-C: Upload Screen + Offline Queue 🔴 ⚙️
- [ ] `screens/upload/UploadScreen.tsx` — file picker + upload queue with sync status
- [ ] `hooks/useNetInfo.ts` — detect connectivity changes
- [ ] `hooks/useUploadQueue.ts` — queue offline → flush on reconnect
- [ ] `db/schema.ts` — SQLite schema (Expo SQLite) for offline state
- [ ] `db/sync.ts` — server ↔ SQLite sync logic
- [ ] Chunked upload with delta-sync (resume from `chunk_offset`)
- [ ] Sync dots on every asset row

---

## PHASE 4 — Product Polish (Phase 2 features from requirements)
> Requires Phase 1–3 complete. First real users phase.
> Estimated: 2–3 sessions

### 4-A: Notifications System 🔴 ⚙️
- [ ] `GET /notifications` + `POST /notifications/read`
- [ ] In-app notification badge in web sidebar
- [ ] Expo push notification delivery (via `EXPO_PUSH_ACCESS_TOKEN`)
- [ ] Notification preferences per user per workspace

### 4-B: Rate Limiting + Quota Enforcement 🔴 ⚙️
- [ ] Enforce storage quota on upload — reject with `QUOTA_EXCEEDED` when limit hit
- [ ] `StorageBar` shows live usage on web dashboard
- [ ] Quota recalculation job (`jobs/quota.job.ts`)

### 4-C: Storage Lifecycle Crons 🔴 ⚙️
- [ ] `jobs/cleanup.job.ts` — orphan + expired file cleanup (every 24hrs)
- [ ] `jobs/lifecycle.job.ts` — hot → cold storage mover (weekly, assets >90 days inactive)
- [ ] Expired upload session cleanup (every 6hrs)
- [ ] Preview cleanup after parent asset deleted (7-day delay)

### 4-D: Password-Protected Share Links 🔴 ⚙️
- [ ] `password` field on share link creation
- [ ] Server-side bcrypt hash comparison on `GET /s/:token?password=...`
- [ ] Password prompt UI on share view page

### 4-E: GraphQL API 🔴 ⚙️
> REST remains primary. GraphQL is additive.
- [ ] Set up GraphQL endpoint at `POST /graphql`
- [ ] `WorkspaceDashboard` query — workspace + recent assets + pending approvals in one request
- [ ] `SearchAssets` query — search by name, tag, type

---

## PHASE 5 — Scale (Phase 3 features from requirements)
> Do not start until Phase 4 is stable in production.

### 5-A: Localized Payments 🔴 ⚙️
- [ ] MTN MoMo integration (`services.billing/momo.service.ts`)
- [ ] Airtel Money integration
- [ ] Stripe card fallback
- [ ] Subscription management: free → pro → agency
- [ ] Pricing in UGX/KES
- [ ] Invoice PDF generation

### 5-B: AI Auto-Tagging 🔴 ⚙️
- [ ] Vision API call on image upload (classify content → suggest tags)
- [ ] Tag suggestion UI — user accepts or dismisses
- [ ] Batch re-tag endpoint for existing assets

### 5-C: Observability 🔴 ⚙️
- [ ] OpenTelemetry traces across API → worker → storage
- [ ] Metrics dashboard: error rates, queue depth, processing latency
- [ ] Alerting: error rate >1%, queue depth >500, p95 >1s

---

## Quick Reference: Dependency Tree

```
Phase 0 (Foundation)
    ├── 0-A Monorepo scaffold
    ├── 0-B Shared types
    ├── 0-C Storage adapter
    ├── 0-D Web UI primitives      ← depends on 0-A, 0-B
    ├── 0-E Web asset components   ← depends on 0-D
    ├── 0-F Mobile theme
    └── 0-G Mobile UI primitives   ← depends on 0-F

Phase 1 (DB + API Core)            ← depends on 0-A, 0-B, 0-C
    ├── 1-A Database setup
    ├── 1-B API server bootstrap   ← depends on 1-A
    ├── 1-C Auth middleware        ← depends on 1-B
    ├── 1-D Global middleware      ← depends on 1-B
    ├── 1-E Workspaces module      ← depends on 1-C, 1-D
    ├── 1-F Auth routes            ← depends on 1-C
    ├── 1-G Collections module     ← depends on 1-C, 1-D
    ├── 1-H Upload pipeline        ← depends on 1-G
    ├── 1-I Assets CRUD            ← depends on 1-H
    ├── 1-J Processing workers     ← depends on 1-H
    └── 1-K Share module           ← depends on 1-I

Phase 2 (Web pages)                ← depends on Phase 1 + Phase 0-D/0-E
Phase 3 (Mobile screens)           ← depends on Phase 1 + Phase 0-F/0-G
Phase 4 (Product polish)           ← depends on Phase 1, 2, 3
Phase 5 (Scale)                    ← depends on Phase 4 stable
```
