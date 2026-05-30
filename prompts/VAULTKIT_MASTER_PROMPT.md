# VaultKit — Master Agent Prompt
> One file. All phases. Paste the relevant section into Antigravity.
> The PREAMBLE section goes with EVERY phase prompt — never paste a phase prompt without it.

---

# ═══════════════════════════════════════════════
# PREAMBLE — ALWAYS INCLUDE THIS WITH ANY PHASE
# ═══════════════════════════════════════════════

```
You are building VaultKit — a Digital Asset Management platform for East African
creative teams. It is a full-stack TypeScript monorepo.

STACK:
  Web app:     React + TypeScript + Vite (apps/web)
  Mobile:      React Native + Expo (apps/mobile)
  API:         Fastify + TypeScript (services/api)
  Workers:     BullMQ + Node.js (services/workers)
  Shared:      packages/shared, packages/storage-adapter
  Database:    Neon PostgreSQL + Drizzle ORM
  Cache/Queue: Redis (Upstash)
  Storage:     Cloudflare R2
  Auth:        AuthHub — a custom OIDC/OAuth 2.0 provider at
               https://authhub-npym.onrender.com/api/v1
               DO NOT guess AuthHub endpoints. Read the docs or source first.

CRITICAL RULES — NEVER VIOLATE:
1. TypeScript strict mode everywhere. Zero `any` types.
2. Zod validation on ALL request/response shapes.
3. No auth logic in VaultKit. All auth goes through AuthHub.
4. Idempotency-Key required on all POST/PUT/DELETE — enforce in middleware.
5. Every asset/collection lookup MUST be scoped by workspace_id. Never query globally.
6. Drizzle ORM only. No raw SQL unless Drizzle cannot express it.
7. No gradients anywhere — web or mobile. This is non-negotiable.
8. All borders: 0.5px on web / StyleSheet.hairlineWidth on React Native. Never 1px.
9. Do not install expo-linear-gradient. Ever.
10. useNativeDriver: true on all React Native Animated calls.

BEFORE ANY UI CODE: Apply the design system rules below.

DESIGN SYSTEM RULES (apply to every component):
  Fonts:    Sora for all UI text. IBM Plex Mono for badges, metadata, labels,
            hashes, file sizes, version numbers, scopes, timestamps.
            No other fonts.
  Colors:   Use CSS variables (--vk-*) on web. Import from colors.ts on mobile.
            Never hardcode hex values in components.
  Accents:  One accent only — #e8784a (dark) / #c5522d (light). Sparingly.
  Motion:   Max 150ms, ease or ease-out. No bounce, no spring on data.
  Avoid:    Glassmorphism, shadows on cards, pure black/white,
            emoji in UI, Title Case labels, multiple accent colors per screen,
            offset pagination (always cursor-based).

AuthHub base URL (from env):
  AUTHHUB_BASE_URL=https://authhub-npym.onrender.com/api/v1
  AUTHHUB_JWKS_URL=https://authhub-npym.onrender.com/api/v1/.well-known/jwks.json

If AuthHub docs are needed: https://authhub-npym.onrender.com/api/v1/docs
(Render free tier — wait 30s if cold start. Check source at
github.com/AmosQuety/AuthHub/tree/main/backend as fallback.)
```

---

# ═══════════════════════════════════════════════
# PHASE 0-A — Monorepo Scaffold
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Scaffold the VaultKit monorepo. Create structure only — no business logic.

STEP 1 — Create directory structure:
vaultkit/
├── apps/web/                   (React + Vite + TypeScript)
├── apps/mobile/                (Expo + React Native + TypeScript)
├── packages/shared/            (Shared types + utils)
├── packages/storage-adapter/   (Storage abstraction layer)
├── services/api/               (Fastify API server)
├── services/workers/           (BullMQ workers)
└── docs/                       (place all the .md doc files here)

STEP 2 — Root workspace config:
- pnpm-workspace.yaml listing all packages
- Root package.json with pnpm workspaces
- turbo.json with build, dev, lint pipelines for all packages
- .gitignore covering node_modules, .env, dist, .turbo

STEP 3 — Per-package scaffolding:
Each package needs: package.json, tsconfig.json extending root tsconfig.base.json
  packages/shared:           name @vaultkit/shared
  packages/storage-adapter:  name @vaultkit/storage-adapter
  services/api:              Fastify, typescript, @vaultkit/shared dep
  services/workers:          bullmq, sharp, typescript
  apps/web:                  Vite + React + TypeScript, @vaultkit/shared dep
  apps/mobile:               Expo, react-native, @vaultkit/shared dep

STEP 4 — Create .env.example files:
Create these files with all vars from the env reference below.
Never put real values in them.

services/api/.env.example:
  NODE_ENV, PORT, API_BASE_URL
  DATABASE_URL, DATABASE_POOL_SIZE
  REDIS_URL
  AUTHHUB_BASE_URL, AUTHHUB_JWKS_URL, AUTHHUB_ADMIN_TOKEN
  AUTHHUB_DASHBOARD_CLIENT_ID, AUTHHUB_DASHBOARD_CLIENT_SECRET
  STORAGE_PROVIDER, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
  R2_BUCKET_NAME, R2_PUBLIC_URL
  WEB_APP_URL, MOBILE_REDIRECT_URI
  JWT_SECRET, WEBHOOK_SECRET
  RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_FREE, RATE_LIMIT_MAX_PRO
  EXPO_PUSH_ACCESS_TOKEN
  MTN_MOMO_BASE_URL, MTN_MOMO_SUBSCRIPTION_KEY, MTN_MOMO_API_USER, MTN_MOMO_API_KEY
  MTN_MOMO_ENVIRONMENT, AIRTEL_MONEY_BASE_URL, AIRTEL_MONEY_CLIENT_ID
  AIRTEL_MONEY_CLIENT_SECRET, AIRTEL_MONEY_COUNTRY, AIRTEL_MONEY_CURRENCY
  STRIPE_SECRET_KEY, LOG_LEVEL

services/workers/.env.example:
  NODE_ENV, DATABASE_URL, REDIS_URL
  STORAGE_PROVIDER, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
  R2_BUCKET_NAME, AUTHHUB_BASE_URL
  WORKER_CONCURRENCY, THUMBNAIL_QUALITY

apps/web/.env.example:
  VITE_API_BASE_URL, VITE_AUTHHUB_BASE_URL
  VITE_AUTHHUB_DASHBOARD_CLIENT_ID, VITE_REDIRECT_URI

apps/mobile/.env.example:
  EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_AUTHHUB_BASE_URL
  EXPO_PUBLIC_REDIRECT_URI

DONE when: `pnpm install` runs without errors. `turbo build` executes
(even if packages have no code yet — scaffold only).
```

---

# ═══════════════════════════════════════════════
# PHASE 0-B — Shared Types Package
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build the @vaultkit/shared package — all TypeScript types and utilities.
Location: packages/shared/src/

FILE: types/workspace.types.ts
  - WorkspacePlan: 'free' | 'pro' | 'agency'
  - WorkspaceRole: 'admin' | 'editor' | 'viewer'
  - Workspace: { id, name, slug, authhubTenantId, authhubClientId, plan,
      storageUsedBytes, storageQuotaBytes, logoUrl, createdAt, updatedAt, deletedAt }
  - WorkspaceMember: { id, workspaceId, authhubUserId, email, displayName, avatarUrl,
      role: WorkspaceRole, invitedBy, joinedAt, createdAt, updatedAt, deletedAt }

FILE: types/asset.types.ts
  - AssetStatus: 'processing' | 'ready' | 'processing_failed'
  - ApprovalStatus: 'pending' | 'approved' | 'revision_requested'
  - SyncStatus: 'synced' | 'uploading' | 'queued' | 'failed'
  - Asset: { id, workspaceId, collectionId, name, description, fileType, extension,
      sizeBytes, contentHash, storageKey, versionNumber, status: AssetStatus,
      approvalStatus: ApprovalStatus, blurHash, uploadedBy, lastAccessedAt,
      createdAt, updatedAt, deletedAt }
  - AssetVersion: { id, assetId, workspaceId, versionNumber, sizeBytes,
      contentHash, storageKey, uploadedBy, note, createdAt }
  - AssetPreview: { id, assetId, size: 'sm' | 'md' | 'lg', storageKey,
      widthPx, heightPx, fileType, sizeBytes, createdAt, expiresAt }

FILE: types/share.types.ts
  - SharePermission: 'view' | 'download'
  - ShareAction: 'approved' | 'revision_requested'
  - ShareLink: { id, workspaceId, assetId, collectionId, token, permission,
      passwordHash, expiresAt, isWhatsapp, singleUse, usedAt, revokedAt,
      createdBy, createdAt }
  - ApprovalPayload: { action: ShareAction, note?: string }

FILE: types/auth.types.ts
  - AuthScope: 'openid' | 'profile' | 'email' | 'files:read' | 'files:upload' |
      'files:delete' | 'workspace:manage' | 'billing:manage'
  - TokenPayload: { sub, email, tenantId, clientId, scope, iat, exp }
  - AuthContext: { userId, email, scopes: AuthScope[], workspace: Workspace,
      member: WorkspaceMember }

FILE: utils/formatBytes.ts
  - formatBytes(bytes: number, decimals?: number): string
  - e.g. formatBytes(2457600) → "2.3 MB"

FILE: utils/formatDate.ts
  - formatRelative(date: Date | string): string → "2 hours ago"
  - formatShort(date: Date | string): string → "Jan 12"

FILE: utils/idempotencyKey.ts
  - generateIdempotencyKey(): string → UUID v4
  - (use crypto.randomUUID() if available, fallback to uuid package)

FILE: index.ts — barrel export of everything

CONSTRAINT: Zero dependencies except `uuid` if needed.
All types use camelCase properties. No `any`.
```

---

# ═══════════════════════════════════════════════
# PHASE 0-C — Storage Adapter
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build the @vaultkit/storage-adapter package.
Location: packages/storage-adapter/src/

FILE: adapter.interface.ts
  StorageAdapter interface with methods:
  - upload(key: string, body: Buffer | Readable, contentType: string): Promise<void>
  - download(key: string): Promise<Readable>
  - delete(key: string): Promise<void>
  - presign(key: string, expiresIn?: number): Promise<string>
    default expiresIn: 3600 (seconds)
  - move(fromKey: string, toKey: string): Promise<void>
  - exists(key: string): Promise<boolean>

KEY FORMATS (enforce in each adapter):
  Asset file:    /{workspaceId}/{assetId}/{filename}
  Preview:       /{workspaceId}/{assetId}/previews/{size}.webp

FILE: r2.adapter.ts — Cloudflare R2 implementation
  - Use @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner (R2 is S3-compatible)
  - Read from env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
  - Endpoint: https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com
  - Region: 'auto'
  - Presigned URL expiry: expiresIn param (default 3600)

FILE: s3.adapter.ts — AWS S3 fallback
  - Same interface, uses standard S3 endpoint
  - Read: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME

FILE: local.adapter.ts — Local filesystem (dev only)
  - Store files under ./local-storage/{key}
  - presign() returns a localhost URL with signed token (simple hmac)
  - exists() checks fs.existsSync

FILE: index.ts
  - Export all adapters
  - Export createStorageAdapter(provider: 'r2' | 's3' | 'local'): StorageAdapter
    reads STORAGE_PROVIDER env to decide

CONSTRAINT: No business logic — pure I/O. All errors bubble up as-is.
```

---

# ═══════════════════════════════════════════════
# PHASE 0-D — Web UI Design System
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build the complete VaultKit web design system in apps/web/src/.
Read the design system rules in the PREAMBLE completely before writing any code.

FILE: styles/tokens.css
  Define ALL CSS custom properties for dark and light modes.
  Dark mode on :root. Light mode on [data-theme="light"].
  Variables:
    --vk-bg, --vk-surface, --vk-surface2, --vk-surface3
    --vk-border, --vk-border2, --vk-border3
    --vk-text, --vk-text2, --vk-text3
    --vk-accent, --vk-accent-dim, --vk-accent-text
    --vk-success, --vk-success-dim
    --vk-warning, --vk-warning-dim
    --vk-danger, --vk-danger-dim
    --vk-info, --vk-info-dim
  Font families as variables:
    --vk-font-ui: 'Sora', sans-serif
    --vk-font-mono: 'IBM Plex Mono', monospace

FILE: styles/global.css
  @import tokens.css
  @import Google Fonts: Sora (300,400,500,600) + IBM Plex Mono (400,500)
  CSS reset (box-sizing, margin 0)
  body: background var(--vk-bg), color var(--vk-text), font-family var(--vk-font-ui)
  Scrollbar styling (thin, surface2 track, border2 thumb)
  Keyframes: pulse (sync dot), shimmer (skeleton)

FILE: components/ui/Button.tsx
  Props: variant ('primary' | 'secondary' | 'ghost' | 'danger'), size ('sm' | 'md'),
         loading (boolean), disabled (boolean), onClick, children
  - primary: bg accent, white text
  - secondary: bg surface2, border border2, text primary
  - ghost: no bg, no border, text secondary
  - danger: bg danger-dim, border danger at 20% opacity, text danger
  - All: 6px radius, 150ms transition, Sora 13px/500
  - loading state: show spinner (CSS animation), disable interaction
  No gradients. No shadows.

FILE: components/ui/Badge.tsx
  Props: status ('approved' | 'pending' | 'revision_requested' | 'processing' | 'archived')
  IBM Plex Mono, 10px, 4px radius, hairline border
  Each status maps to the correct semantic color pair (dim bg + full text)
  Label text: lowercase, no uppercase

FILE: components/ui/Card.tsx
  Props: children, padding ('sm' | 'md'), onClick (optional — adds cursor:pointer + hover)
  bg: surface, border: 0.5px solid border, radius: 8px
  No box-shadow — ever.

FILE: components/ui/Input.tsx
  Props: value, onChange, placeholder, label, error, disabled, type
  bg: surface2, border: 0.5px border2, radius: 6px, padding: 9px 12px
  Focus: border-color accent
  Error: border-color danger, error message below in danger color
  Sora 13px/400, placeholder text3 color

FILE: components/ui/index.ts — barrel export

CONSTRAINT: Every CSS value must reference a CSS variable — zero hardcoded hex.
Zero gradients. 0.5px borders. Max 150ms transitions.
```

---

# ═══════════════════════════════════════════════
# PHASE 0-E — Web Asset Components
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build asset and workspace UI components.
Depends on: Phase 0-D design system being complete.
Location: apps/web/src/components/

FILE: asset/AssetCard.tsx
  Props: asset (Asset type from @vaultkit/shared), onClick
  Layout: thumbnail area (top) + info row (bottom)
  Thumbnail area (height: 120px):
    State 1: solid surface2 bg (no gradient)
    State 2: blur-hash image renders over solid bg, crossfade 100ms
    State 3: WebP preview (md size) crossfade in 150ms
    Never show raw storage URLs — only preview URLs
  Info row:
    Asset name: Sora 12px/500, text, truncated with ellipsis
    File size: IBM Plex Mono 10px, text3
    Badge component with approval_status
    SyncIndicator dot (if syncing)
  Card: surface bg, 0.5px border, 8px radius
  No shadow. No gradient.

FILE: asset/AssetGrid.tsx
  Props: workspaceId, collectionId (optional), filters
  CSS grid: repeat(auto-fill, minmax(160px, 1fr)), gap 12px
  Cursor-based infinite scroll — NOT offset.
  Loading: skeleton cards (shimmer animation, same dimensions as real cards)
  Empty state: centered icon (32px Tabler) + muted text, no gradient bg

FILE: asset/AssetPreview.tsx
  Props: asset: Asset (with versions and previews populated)
  Two-column layout: preview (left, 60%) + metadata panel (right, 40%)
  Preview: shows lg preview → download full on explicit click
  Metadata panel: name, size (IBM Plex Mono), type, version number,
    uploader name, upload date, approval badge
  Versions list: version_number, size, date — IBM Plex Mono for numbers

FILE: asset/SyncIndicator.tsx
  Props: status: SyncStatus
  A dot (8px circle) with color from status:
    synced → success, uploading → info (pulse animation), queued → warning, failed → danger
  pulse: CSS animation 1s ease infinite, opacity 1 → 0.3 → 1
  Tooltip on hover: "Synced", "Uploading...", "Queued", "Failed — click to retry"

FILE: workspace/StorageBar.tsx
  Props: usedBytes, quotaBytes
  Label row: "X GB of Y GB used" — IBM Plex Mono 10px
  Progress track: surface2 bg, 4px height, 3px radius
  Fill: solid accent (normal), solid warning (>80%), solid danger (>95%)
  No gradient on fill. Never.

FILE: share/ApprovalCard.tsx
  Props: asset, shareToken, onAction(action: ShareAction)
  Shows: blur-hash → preview, asset name, workspace name, uploader
  Two full-width buttons: Approve (success style) + Request Revision (danger style)
  Optional comment input (shown when revise is clicked)

FILE: workspace/MemberList.tsx
  Props: members: WorkspaceMember[], onRoleChange, onRemove
  Table-style list: avatar/initials, name, email, role badge, actions
  Role change: dropdown (admin only)

FILE: collection/CollectionCard.tsx + CollectionList.tsx
  CollectionCard: folder icon, name, asset count (IBM Plex Mono), updated date
  CollectionList: renders grid of CollectionCards + optional "New Folder" button
```

---

# ═══════════════════════════════════════════════
# PHASE 0-F — Mobile Theme Layer
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build the React Native theme layer for VaultKit mobile.
Location: apps/mobile/src/theme/

FILE: colors.ts
  Export a `colors` object with `dark` and `light` sub-objects.
  Each contains ALL color tokens matching the web CSS variables:
    bg, surface, surface2, surface3
    border, border2, border3
    text, text2, text3
    accent, accentDim, accentText
    success, successDim, warning, warningDim
    danger, dangerDim, info, infoDim
  Dark mode values:
    bg: '#0e0f11', surface: '#16181c', surface2: '#1e2128', surface3: '#252830'
    border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.13)'
    text: '#e8e9eb', text2: '#9ca3af', text3: '#6b7280'
    accent: '#e8784a', accentDim: 'rgba(232,120,74,0.12)', accentText: '#f4a07a'
    success: '#34d399', successDim: 'rgba(52,211,153,0.12)'
    warning: '#fbbf24', warningDim: 'rgba(251,191,36,0.10)'
    danger: '#f87171', dangerDim: 'rgba(248,113,113,0.10)'
    info: '#4a9eff', infoDim: 'rgba(74,158,255,0.10)'
  Light mode values: (see DESIGN_SYSTEM.md color section)

FILE: spacing.ts
  export const spacing = { micro:2, tight:4, xs:6, sm:8, md:12, card:14,
    lg:16, xl:20, xxl:24, section:32 }

FILE: typography.ts
  Font family names (matching loaded font assets):
    uiLight: 'Sora-Light', uiRegular: 'Sora-Regular',
    uiMedium: 'Sora-Medium', uiSemiBold: 'Sora-SemiBold',
    monoRegular: 'IBMPlexMono-Regular', monoMedium: 'IBMPlexMono-Medium'
  Type scale (size, lineHeight, fontFamily):
    display: { fontSize:28, lineHeight:34, fontFamily: uiSemiBold }
    title:   { fontSize:18, lineHeight:23, fontFamily: uiMedium }
    heading: { fontSize:15, lineHeight:21, fontFamily: uiMedium }
    body:    { fontSize:13, lineHeight:21, fontFamily: uiRegular }
    small:   { fontSize:11, lineHeight:17, fontFamily: uiRegular }
    label:   { fontSize:10, lineHeight:14, fontFamily: monoRegular }
    mono:    { fontSize:12, lineHeight:18, fontFamily: monoRegular }
    monoSm:  { fontSize:10, lineHeight:14, fontFamily: monoRegular }

FILE: app.config.js (or app.json)
  Register all font files under extra.fonts or via expo-font in app entry.
  Font files expected at: assets/fonts/
    Sora-Light.ttf, Sora-Regular.ttf, Sora-Medium.ttf, Sora-SemiBold.ttf
    IBMPlexMono-Regular.ttf, IBMPlexMono-Medium.ttf

CONSTRAINT: No expo-linear-gradient installed. No hardcoded hex in components.
StyleSheet.hairlineWidth on all borders. useNativeDriver: true always.
```

---

# ═══════════════════════════════════════════════
# PHASE 0-G — Mobile UI Primitives
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build React Native UI primitives for VaultKit mobile.
Depends on: Phase 0-F (theme layer complete, fonts loaded).
Location: apps/mobile/src/components/

FILE: ui/Button.tsx
  Props: variant ('primary' | 'secondary' | 'danger'), label, onPress, loading, disabled
  Use Pressable, not TouchableOpacity.
  primary: backgroundColor accent, Sora-Medium 13px, white text
  secondary: backgroundColor surface2, hairlineWidth border border2
  danger: backgroundColor dangerDim, hairlineWidth border danger at 20% opacity
  Pressed state: opacity 0.8 (inline Pressable style function)
  Loading: ActivityIndicator in accent color, same size as text
  No shadows. No gradients. 6px borderRadius.

FILE: ui/Badge.tsx
  Props: status: 'approved' | 'pending' | 'revision_requested' | 'processing' | 'archived'
  Container: paddingVertical 2, paddingHorizontal 7, borderRadius 4, hairlineWidth border
  Text: IBMPlexMono-Regular 10px, lowercase
  Each status: matching successDim/success, warningDim/warning, etc.

FILE: ui/Card.tsx
  Props: children, style (optional)
  surface bg, hairlineWidth border, 8px radius, 14px padding
  No shadow, no elevation on Android.

FILE: ui/Input.tsx
  Props: value, onChangeText, placeholder, label, error, secureTextEntry
  surface2 bg, hairlineWidth border border2, 6px radius
  Focus state: change borderColor to accent (use onFocus/onBlur)
  Error: borderColor danger, error text below in danger color
  Sora-Regular 13px, text3 placeholder

FILE: asset/AssetCard.tsx
  Thumbnail (height 80): backgroundColor surface2 (solid, no gradient)
  Blur-hash renders ON TOP as an Image component (use expo-blur-hash or similar)
  Once WebP preview ready: crossfade in 150ms using Animated.Value
  Info area: name (Sora-Medium 12px), size + type (IBMPlexMono 10px text3), Badge
  hairlineWidth border, 8px radius, surface bg

FILE: asset/BlurHashImage.tsx
  Props: blurHash, previewUrl, width, height
  Layer 1: solid surface2 View (always rendered)
  Layer 2: blur-hash Image (Animated, fades in when loaded)
  Layer 3: WebP Image (Animated, fades in when loaded, hides blur-hash)
  useNativeDriver: true on all fades

FILE: asset/SyncStatusBar.tsx
  Persistent top bar shown when connectivity is offline or assets are syncing.
  backgroundColor surface2, hairlineWidth bottom border border2
  Left: status text (Sora-Regular 12px, text2) — "Offline · 3 files queued"
  Right: SyncDot (8px circle, pulse if uploading)
  Hidden when all assets are synced and connectivity is online

FILE: upload/UploadQueue.tsx
  Props: queue: Array<{ id, filename, status: SyncStatus, progress: number }>
  FlatList of queue items
  Each item: filename (Sora-Medium 12px) + "chunk N/total" progress (IBMPlexMono 10px) + SyncDot
  SyncDot pulse animation uses useNativeDriver: true — always
```

---

# ═══════════════════════════════════════════════
# PHASE 1-A — Database Setup
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Set up Neon PostgreSQL + Drizzle ORM for VaultKit API.
Location: services/api/src/db/

PREREQUISITE: Create a Neon project at neon.tech. Copy the connection string
into services/api/.env as DATABASE_URL.

FILE: db/client.ts
  - Import neon from @neondatabase/serverless
  - Import drizzle from drizzle-orm/neon-http
  - Export db = drizzle(neon(process.env.DATABASE_URL))
  - Export the neon client for raw use if needed

FILE: db/schema.ts
  Define all tables using Drizzle ORM pgTable. Implement exactly:

  workspaces: id (uuid, pk, defaultRandom), name (varchar 255), slug (varchar 100, unique),
    authhubTenantId (varchar 255, unique), authhubClientId (varchar 255),
    storageUsedBytes (bigint, default 0), storageQuotaBytes (bigint, default 2147483648),
    plan (varchar 50, default 'free'), logoUrl (text),
    createdAt (timestamp, defaultNow), updatedAt (timestamp, defaultNow), deletedAt (timestamp)

  workspaceMembers: id (uuid, pk), workspaceId (uuid, fk workspaces),
    authhubUserId (varchar 255), email (varchar 255), displayName (varchar 255),
    avatarUrl (text), role (varchar 50, default 'viewer'), invitedBy (uuid, fk self),
    joinedAt (timestamp), createdAt, updatedAt, deletedAt
    unique(workspaceId, authhubUserId)

  collections: id, workspaceId (fk), parentId (uuid, self-ref nullable), name (varchar 255),
    path (text), createdBy (uuid, fk workspace_members), createdAt, updatedAt, deletedAt

  assets: id, workspaceId (fk), collectionId (uuid, fk nullable), name (varchar 500),
    description (text), fileType (varchar 100), extension (varchar 20), sizeBytes (bigint),
    contentHash (varchar 64), storageKey (text), versionNumber (int, default 1),
    status (varchar 50, default 'processing'), approvalStatus (varchar 50, default 'pending'),
    blurHash (text), uploadedBy (uuid, fk workspace_members), lastAccessedAt (timestamp),
    createdAt, updatedAt, deletedAt

  assetVersions: id, assetId (fk assets), workspaceId (fk), versionNumber (int),
    sizeBytes (bigint), contentHash (varchar 64), storageKey (text),
    uploadedBy (uuid, fk), note (text), createdAt
    unique(assetId, versionNumber)

  assetPreviews: id, assetId (fk), size (varchar 10), storageKey (text),
    widthPx (int), heightPx (int), fileType (varchar 50), sizeBytes (bigint),
    createdAt, expiresAt
    unique(assetId, size)

  tags: id, workspaceId (fk), name (varchar 100), createdAt
    unique(workspaceId, name)

  assetTags: assetId (fk, pk part), tagId (fk, pk part), addedBy (uuid, fk), createdAt
    primaryKey(assetId, tagId)

  uploadSessions: id, workspaceId (fk), uploadedBy (uuid, fk), filename (varchar 500),
    fileType (varchar 100), sizeBytes (bigint), totalChunks (int), uploadedChunks (int, default 0),
    contentHash (varchar 64), collectionId (uuid, fk nullable), status (varchar 50, default 'active'),
    expiresAt (timestamp), createdAt, updatedAt

  uploadChunks: id, sessionId (fk upload_sessions), chunkIndex (int), sizeBytes (bigint),
    checksum (varchar 64), storageKey (text), createdAt
    unique(sessionId, chunkIndex)

  idempotencyKeys: id, key (varchar 255, unique), workspaceId (uuid), method (varchar 10),
    path (varchar 500), statusCode (int), responseBody (text), expiresAt (timestamp), createdAt

  processingJobs: id, assetId (fk), jobType (varchar 50), status (varchar 50, default 'queued'),
    attempts (int, default 0), lastError (text), startedAt, completedAt, createdAt, updatedAt

FILE: db/migrations/ — let drizzle-kit manage this

FILE: drizzle.config.ts (at services/api root)
  schema: ./src/db/schema.ts
  out: ./src/db/migrations
  driver: neon-http
  dbCredentials: { connectionString: process.env.DATABASE_URL }

FILE: db/seed.ts
  Insert one test workspace: { name: 'Test Agency', slug: 'test-agency',
    authhubTenantId: 'test-tenant-1', authhubClientId: 'test-client-1', plan: 'free' }
  Insert one test member: { email: 'amos@test.com', role: 'admin',
    authhubUserId: 'test-user-1', displayName: 'Amos Test' }

COMMANDS to run after building:
  pnpm drizzle-kit push     ← apply schema to Neon
  pnpm tsx src/db/seed.ts   ← seed test data

VERIFY: Open Neon dashboard. All tables visible. Seed rows present.
```

---

# ═══════════════════════════════════════════════
# PHASE 1-B/C/D — API Server + Auth + Middleware
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Bootstrap the Fastify API server with all middleware.
Depends on: Phase 1-A (DB schema deployed).

AUTHHUB RULE: Before writing auth.middleware.ts, read:
  1. https://authhub-npym.onrender.com/api/v1/docs (wait 30s if cold start)
  2. Confirm JWT payload fields: sub, email, tenant_id, client_id, scope
  3. Confirm JWKS endpoint: https://authhub-npym.onrender.com/api/v1/.well-known/jwks.json

FILE: server.ts
  Fastify instance with TypeScript types.
  Register: cors, fastify-plugin, content-type-parser for octet-stream.
  Register all route modules.
  Global error handler: catches Zod errors, returns { success: false, error: { code, message, status } }.
  Health: GET /health → { success: true, data: { status: 'ok', timestamp } }.
  Listen on PORT from env.

FILE: modules/auth/auth.middleware.ts
  Export authMiddleware (Fastify preHandler):
  1. Extract Bearer token from Authorization header → 401 if missing
  2. Verify JWT using jwks-rsa + jsonwebtoken against AUTHHUB_JWKS_URL
     Cache JWKS keys for 10 minutes. rateLimit: true.
  3. Extract payload.client_id → query workspaces WHERE authhub_client_id = $1
     → 403 if workspace not found or deleted
  4. Query workspace_members WHERE workspace_id = $1 AND authhub_user_id = $2
     AND deleted_at IS NULL → 403 code NOT_A_MEMBER if not found
  5. Attach req.auth = { userId, email, scopes, workspace, member }
  Do NOT apply authMiddleware to: POST /oauth/token, GET /oauth/authorize, GET /health,
    GET /s/:token, POST /s/:token/action

  Export requireScope(scope: string): Fastify preHandler
    → 403 INSUFFICIENT_PERMISSION if scope not in req.auth.scopes

  Export requireRole(...roles: string[]): Fastify preHandler
    → 403 INSUFFICIENT_PERMISSION if req.auth.member.role not in roles

FILE: middleware/idempotency.middleware.ts
  Apply to POST, PUT, DELETE methods.
  1. Check Idempotency-Key header → 400 MISSING_IDEMPOTENCY_KEY if absent
  2. Look up idempotency_keys table by key + workspace_id
     If found and not expired: return cached statusCode + responseBody immediately
  3. After route handler completes: insert key row with response (24hr TTL)
  Key expiry: 24 hours from creation. Clean up expired keys in background.

FILE: middleware/rateLimit.middleware.ts
  Redis sliding window: increment key "ratelimit:{userId}:{windowStart}" with 60s TTL.
  Window: 60 seconds. Limits: 300 (free), 600 (pro), 2000 (agency) from workspace.plan.
  On exceed: 429 RATE_LIMITED. Set X-RateLimit-Limit, X-RateLimit-Remaining,
    X-RateLimit-Reset headers on every response.

FILE: middleware/validate.middleware.ts
  Factory: createValidator(schema: ZodSchema) returns Fastify preHandler.
  Parses request.body against schema. On fail: 400 with Zod error messages.
  Usage: server.post('/route', { preHandler: [createValidator(MySchema)] }, handler)

STANDARD ERROR FORMAT (used everywhere):
  { success: false, error: { code: string, message: string, status: number } }

STANDARD SUCCESS FORMAT:
  { success: true, data: any, meta?: { cursor, hasMore, total } }
```

---

# ═══════════════════════════════════════════════
# PHASE 1-E — Workspaces Module
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build the Workspaces module.
Depends on: Phase 1-B/C/D complete.

AUTHHUB RULE: Before implementing authhub.provisioner.ts, open
  https://authhub-npym.onrender.com/api/v1/docs and verify:
  - Exact path for creating a tenant (POST /admin/tenants or similar)
  - Exact path for creating an OAuth client
  - Request shape and response shape for both
  Never guess. If docs are unavailable, check github.com/AmosQuety/AuthHub/tree/main/backend

FILE: modules/workspaces/authhub.provisioner.ts
  async provisionWorkspace(name: string, slug: string):
    Promise<{ tenantId, clientId, clientSecret }>
  Step 1: POST {AUTHHUB_BASE_URL}/admin/tenants
    Headers: Authorization: Bearer {AUTHHUB_ADMIN_TOKEN}, Content-Type: application/json
    Body: { name, slug }
    Extract tenant_id from response.
  Step 2: POST {AUTHHUB_BASE_URL}/admin/clients
    Body: { tenant_id, name: "{name} — VaultKit",
      redirect_uris: ['https://vaultkit.app/auth/callback'],
      grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
      scopes: ['openid','profile','email','files:read','files:upload',
               'files:delete','workspace:manage'] }
    Extract client_id, client_secret from response.
  On any HTTP error: throw with status code + body for caller to handle.

FILE: modules/workspaces/workspace.service.ts
  createWorkspace(name, slug, authhubUserId, email):
    1. Call provisionWorkspace → get { tenantId, clientId, clientSecret }
    2. Insert into workspaces: { name, slug, authhubTenantId, authhubClientId }
    3. Insert creator into workspace_members: { role: 'admin', authhubUserId, email }
    4. Return workspace + member rows
  getWorkspace(id, workspaceId): fetch with storage stats

FILE: modules/workspaces/members.service.ts
  inviteMember(workspaceId, email, role, invitedBy): insert workspace_members row
  changeMemberRole(workspaceId, memberId, newRole): update role
  removeMember(workspaceId, memberId): soft delete (deleted_at = now())

FILE: modules/workspaces/workspaces.routes.ts
  POST /workspaces
    No authMiddleware (user is creating their first workspace).
    Validate body with Zod: { name: string min 2, slug: string regex /^[a-z0-9-]+$/ }
    Call workspace.service.createWorkspace. Return 201.

  GET /workspaces/:id
    authMiddleware, requireScope('files:read')
    Return workspace + storage_used_percent + member_count.

  POST /workspaces/:id/members/invite
    authMiddleware, requireScope('workspace:manage'), requireRole('admin')
    Body: { email: string, role: 'editor' | 'viewer' }
    Call members.service.inviteMember. Return 200.

  PATCH /workspaces/:id/members/:memberId
    authMiddleware, requireScope('workspace:manage'), requireRole('admin')
    Body: { role: WorkspaceRole }
    Cannot demote the only admin. Return 200.

  DELETE /workspaces/:id/members/:memberId
    authMiddleware, requireScope('workspace:manage'), requireRole('admin')
    Cannot remove self if only admin. Soft delete. Return 200.
```

---

# ═══════════════════════════════════════════════
# PHASE 1-F/G — Auth Routes + Collections
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build Auth routes and Collections module.
Depends on: Phase 1-B/C/D complete.

--- AUTH ROUTES ---

FILE: modules/auth/auth.routes.ts
  No authMiddleware on any of these routes.

  GET /auth/login?workspace=<slug>
    Look up workspace by slug → get authhubClientId.
    Redirect to {AUTHHUB_BASE_URL}/oauth/authorize with:
      response_type=code, client_id=authhubClientId,
      redirect_uri={WEB_APP_URL}/auth/callback,
      scope=openid profile email files:read files:upload,
      state=<random 32-char hex>
    Store state in Redis (60s TTL) for CSRF check.

  GET /auth/callback?code=...&state=...
    Verify state against Redis. 400 if mismatch.
    POST {AUTHHUB_BASE_URL}/oauth/token:
      grant_type=authorization_code, code, client_id, client_secret, redirect_uri
    On success: return { accessToken, refreshToken, idToken, expiresIn }.
    On AuthHub error: return 401 INVALID_TOKEN.

  POST /auth/refresh
    Body: { refreshToken, clientId, clientSecret }
    POST {AUTHHUB_BASE_URL}/oauth/token:
      grant_type=refresh_token, refresh_token, client_id, client_secret
    On 401 from AuthHub: return 401 with message "Session expired. Please sign in again."

  POST /auth/logout
    Body: { refreshToken }
    Optionally call AuthHub revoke endpoint if available.
    Return 200 { success: true }.

--- COLLECTIONS MODULE ---

FILE: modules/collections/collections.service.ts
  createCollection(workspaceId, parentId, name, createdBy):
    Build materialized path from parent. Insert. Return collection.
  listCollections(workspaceId, cursor, limit):
    WHERE workspace_id = $1 AND parent_id IS NULL AND deleted_at IS NULL
    Cursor: last id. Return { collections, cursor, hasMore }.
  getCollection(id, workspaceId): single collection
  listCollectionAssets(collectionId, workspaceId, cursor, limit, filters):
    WHERE collection_id = $1 AND workspace_id = $2 AND deleted_at IS NULL
    Support sort (name|created_at|size|updated_at), order (asc|desc), type filter.
    Join asset_previews for sm/md URLs. Return mobile-optimized payload.

FILE: modules/collections/collections.routes.ts
  POST /collections
    authMiddleware, requireScope('files:upload'), requireRole('editor','admin')
    Body Zod: { name: string min 1, parent_id: string uuid optional }
    Call createCollection. Return 201.

  GET /collections
    authMiddleware, requireScope('files:read')
    Query: cursor, limit (default 20, max 100)
    Return paginated list.

  GET /collections/:id
    authMiddleware, requireScope('files:read')
    Return collection with asset_count (subquery).

  GET /collections/:id/assets
    authMiddleware, requireScope('files:read')
    Query: cursor, limit, sort, order, type
    Return mobile-optimized asset payload with blur_hash, previews.sm, previews.md.
```

---

# ═══════════════════════════════════════════════
# PHASE 1-H/I — Assets Upload + CRUD
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build the Assets module — upload pipeline + CRUD.
Depends on: Phase 1-G collections complete. Storage adapter from Phase 0-C.

FILE: modules/assets/upload.service.ts

  initUpload(params: { workspaceId, uploadedBy, filename, fileType, sizeBytes,
      totalChunks, contentHash, collectionId }):
    Check workspace storage quota. Reject 409 QUOTA_EXCEEDED if exceeded.
    Insert upload_sessions row. Return session.

  uploadChunk(sessionId, workspaceId, chunkIndex, body: Buffer, checksum):
    Verify session exists + active. Verify checksum matches X-Chunk-Checksum.
    Upload chunk to R2: key = /uploads/{sessionId}/chunk_{index}
    Insert upload_chunks row. Increment session.uploaded_chunks.
    Return { chunkIndex, uploadedChunks, totalChunks, percent }.

  completeUpload(sessionId, workspaceId, uploadedBy):
    Verify all chunks uploaded (uploaded_chunks === total_chunks).
    Assemble: download all chunks from R2, concatenate, upload final file to R2.
    Key format: /{workspaceId}/{assetId}/{filename}
    Delete chunk objects from R2.
    Create assets row: status='processing'.
    Create asset_versions row (version 1).
    Update workspace.storage_used_bytes += sizeBytes.
    Enqueue BullMQ jobs: blurhash, thumbnail, metadata (+ pdf if PDF).
    Return { assetId, name, status: 'processing' }.

FILE: modules/assets/presign.service.ts
  generatePresignedUrl(storageKey: string): Promise<{ url, expiresAt }>
  Uses StorageAdapter.presign(). Expiry 3600s.

FILE: modules/assets/tag.service.ts
  setAssetTags(assetId, workspaceId, tagNames: string[], addedBy):
    Upsert tags by name in workspace. Upsert asset_tags entries.
    Remove any tags not in new list.

FILE: modules/assets/assets.service.ts
  getAsset(id, workspaceId): fetch asset + versions + previews + tags + uploader
    Generate presigned download URL. Attach to response.
  updateAsset(id, workspaceId, updates: { name?, collectionId?, tags?, versionNumber? }):
    If versionNumber provided: check server version matches. If mismatch: 409 CONFLICT.
    Update name/collectionId. Call setAssetTags if tags provided.
    Increment version_number, update updated_at.
  softDeleteAsset(id, workspaceId, memberId):
    Check: editor can only delete own files. Admin can delete any.
    Set deleted_at = now(). Do NOT delete from R2 (lifecycle cron handles this).

FILE: modules/assets/assets.routes.ts
  POST /assets/upload/init
    authMiddleware, requireScope('files:upload'), requireRole('editor','admin')
    Zod body: { filename, fileType, sizeBytes, totalChunks, collectionId?, contentHash }
    Call initUpload. Return 201 with session.

  PUT /assets/upload/:sessionId/chunk/:index
    authMiddleware, requireScope('files:upload')
    Content-Type: application/octet-stream. Read raw body as Buffer.
    Check X-Chunk-Checksum header.
    Call uploadChunk. Return 200.

  POST /assets/upload/:sessionId/complete
    authMiddleware, requireScope('files:upload')
    Call completeUpload. Return 201.

  GET /assets/:id
    authMiddleware, requireScope('files:read')
    Call getAsset. Return with presigned download_url + download_url_expires_at.
    Update assets.last_accessed_at = now().

  PATCH /assets/:id
    authMiddleware, requireScope('files:upload'), requireRole('editor','admin')
    Zod body: { name?, collectionId?, tags?, versionNumber? }
    Call updateAsset. Return 200.

  DELETE /assets/:id
    authMiddleware, requireScope('files:delete'), requireRole('editor','admin')
    Call softDeleteAsset. Return 200.

  GET /assets/:id/presign
    authMiddleware, requireScope('files:read')
    Call generatePresignedUrl(asset.storageKey). Return 200.
```

---

# ═══════════════════════════════════════════════
# PHASE 1-J — Processing Workers
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build the BullMQ processing worker service.
Depends on: Phase 1-H upload pipeline (workers triggered by completeUpload).
Location: services/workers/src/

FILE: queues/asset.queue.ts
  Create BullMQ Queue: name 'asset-processing', connection from REDIS_URL.
  Default job options:
    attempts: 3
    backoff: { type: 'exponential', delay: 2000 }
    removeOnComplete: { count: 100 }
    removeOnFail: false (keep for dead-letter inspection)
  Export addProcessingJobs(assetId, workspaceId, fileType, storageKey):
    Add jobs: 'blurhash', 'thumbnail', 'metadata'
    If fileType starts with 'application/pdf': also add 'pdf-preview'
    Each job payload: { assetId, workspaceId, storageKey, fileType }

FILE: workers/blurhash.worker.ts
  Process job type 'blurhash':
    1. Download asset from R2 via StorageAdapter.download(storageKey)
    2. If image: use `sharp` to resize to 64x64, get raw pixel buffer
       Generate blur-hash string using `blurhash` package
    3. If video: extract first frame with ffmpeg (use fluent-ffmpeg), then blur-hash
    4. UPDATE assets SET blur_hash = $1 WHERE id = $2 AND workspace_id = $3
    5. Update processing_jobs row: status='complete', completed_at=now()
  On error: log error to processing_jobs. Let BullMQ retry.

FILE: workers/thumbnail.worker.ts
  Process job type 'thumbnail':
    1. Download original asset from R2
    2. For each size { sm: 100, md: 400, lg: 1200 } (width in px):
       sharp(buffer).resize(width).webp({ quality: THUMBNAIL_QUALITY }).toBuffer()
       Upload to R2: key = /{workspaceId}/{assetId}/previews/{size}.webp
       Insert or update asset_previews row for this size
    3. Update processing_jobs: status='complete'
  On error after 3 retries: update asset.status = 'processing_failed'

FILE: workers/pdf.worker.ts
  Process job type 'pdf-preview':
    1. Download PDF from R2
    2. Use pdf-poppler or pdftoppm to render first page as PNG (temp file)
    3. Run through Sharp: resize to sm/md/lg WebP → upload to R2
    4. Insert asset_previews rows
    5. Update processing_jobs

FILE: workers/metadata.worker.ts
  Process job type 'metadata':
    1. Download asset from R2
    2. Use sharp.metadata() for images: width, height, format, exif data
       Use fluent-ffmpeg for video: duration, codec, resolution
       Use pdf-lib for PDFs: page count
    3. Update assets row with extracted metadata fields
    4. Update processing_jobs

FILE: index.ts
  Start all workers. Log "Worker started: {type}".
  On each job complete: check if all mandatory jobs for this asset are done
    (blur_hash IS NOT NULL AND EXISTS sm+md in asset_previews)
    If yes: UPDATE assets SET status = 'ready' WHERE id = $1
  On job failure after all retries:
    UPDATE processing_jobs SET status = 'dead_letter'
    UPDATE assets SET status = 'processing_failed' if it's thumbnail job

VERIFY:
  Upload an image. Within 30s:
  - assets.blur_hash populated ✓
  - asset_previews has sm, md, lg rows ✓
  - assets.status = 'ready' ✓
```

---

# ═══════════════════════════════════════════════
# PHASE 1-K — Share Module
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build the Share + Approval module.
Depends on: Phase 1-I assets CRUD complete.

FILE: modules/share/sharelink.service.ts
  createShareLink(params: { workspaceId, assetId, permission, expiresIn,
      isWhatsapp, singleUse, createdBy }):
    Generate token: crypto.randomBytes(16).toString('hex')
    Calculate expiresAt from expiresIn string: '1h' | '24h' | '7d' | null
    Insert share_links row.
    Return { id, token, url: `${WEB_APP_URL}/s/${token}`,
      whatsappUrl (if isWhatsapp), permission, expiresAt }

  getShareLinkByToken(token):
    Fetch share_links WHERE token = $1 AND revoked_at IS NULL AND deleted_at IS NULL
    Check expiresAt: if past → 410 LINK_EXPIRED
    If single_use and used_at IS NOT NULL → 410 LINK_REVOKED
    Return link with asset data.

  revokeShareLink(id, workspaceId, memberId):
    Verify creator = memberId OR member role = 'admin'
    Set revoked_at = now(). Return 200.

FILE: modules/share/approval.service.ts
  submitApproval(token, action: ShareAction, note?: string):
    Fetch share link. Verify not expired/revoked.
    UPDATE assets SET approval_status = action WHERE id = asset_id
    If single_use: UPDATE share_links SET used_at = now()
    Insert notification row for the asset uploader.
    Return { message: "Your response has been sent to {workspace.name}." }

FILE: modules/share/share.routes.ts
  POST /share
    authMiddleware, requireScope('files:read'), requireRole('editor','admin')
    Zod body: { assetId, permission: 'view'|'download', expiresIn?: string,
      isWhatsapp?: boolean, singleUse?: boolean }
    Call createShareLink. Return 201.

  GET /s/:token   ← NO authMiddleware
    Call getShareLinkByToken.
    Generate fresh presigned preview_url (low-res, md size) + download_url (if permission allows).
    Return asset info + approval_status + workspace.name.

  POST /s/:token/action   ← NO authMiddleware
    Zod body: { action: 'approved'|'revision_requested', note?: string }
    Call submitApproval. Return 200.

  DELETE /share/:id
    authMiddleware
    Call revokeShareLink. Return 200.
```

---

# ═══════════════════════════════════════════════
# PHASE 2 — Web App Pages
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build all web app pages for VaultKit.
Depends on: Phase 0-D/E (UI components done), Phase 1 (API complete).
Location: apps/web/src/

FILE: lib/api.client.ts
  Axios or fetch wrapper. Reads VITE_API_BASE_URL.
  Automatically attaches Authorization: Bearer {accessToken} header.
  On 401: attempt silent token refresh via /auth/refresh, retry once.
  On refresh fail: redirect to /login.
  Adds Idempotency-Key header on POST/PUT/DELETE automatically.

FILE: lib/authhub.client.ts
  buildAuthorizationUrl(workspaceSlug: string): string
    Calls GET /auth/login?workspace={slug} on VaultKit API (which redirects to AuthHub)
    Or construct the URL directly with client_id from workspace.

FILE: stores/auth.store.ts (Zustand)
  State: { accessToken, refreshToken, user: TokenPayload | null, isAuthenticated }
  Actions: setTokens, clearTokens, refreshAccessToken

FILE: stores/workspace.store.ts (Zustand)
  State: { workspace, member, collections }
  Actions: setWorkspace, setMember

FILE: pages/auth/Login.tsx
  Shows VaultKit wordmark + "Sign in to continue" text.
  Single button: "Continue with AuthHub" → calls buildAuthorizationUrl.
  Design: centered card on --vk-bg, no other UI.

FILE: pages/auth/Callback.tsx
  On mount: parse ?code + ?state from URL. POST to /auth/callback.
  On success: store tokens in Zustand + localStorage. Redirect to /w/{slug}.
  On error: redirect to /login with error message.

FILE: pages/workspace/Dashboard.tsx
  Layout: sidebar (nav links) + main content area.
  Sidebar: workspace name, nav links (Collections, Assets, Share Links, Approvals, Members, Settings),
    StorageBar at bottom.
  Main: "Recent assets" AssetGrid (last 20) + "Pending approvals" section.
  hooks/useWorkspace.ts + hooks/useAssets.ts for data.

FILE: pages/workspace/Collection.tsx
  Breadcrumb path. AssetGrid with collection_id filter. "New folder" button for editors/admins.

FILE: pages/workspace/Asset.tsx
  Two-col: preview left + metadata panel right.
  Panel: name (editable for editor/admin), file size, type, version badge (IBM Plex Mono),
    uploader, date, approval Badge, tags (editable), Share button.
  Versions list below metadata.

FILE: pages/workspace/ShareLinks.tsx
  Table of active share links: URL, permission, expiry, usage. Revoke button.

FILE: pages/workspace/Approvals.tsx
  List of assets with approval_status=pending. Click to open Asset page.

FILE: pages/workspace/Members.tsx
  Uses MemberList component. Invite form for admins.

FILE: pages/public/ShareView.tsx
  Public page — no auth, no sidebar.
  Blur-hash → preview. Asset name, workspace name, uploader.
  If approval_status=pending: show Approve + Request Revision buttons.
  If approved: show "Approved ✓" badge. No buttons.
  If revision_requested: show "Revision requested" badge. No buttons.
  Mobile-first layout. Under 10KB bundle for this page (lazy load everything else).
```

---

# ═══════════════════════════════════════════════
# PHASE 3 — Mobile Screens
# ═══════════════════════════════════════════════

```
[PASTE PREAMBLE ABOVE FIRST]

TASK: Build React Native screens for VaultKit mobile.
Depends on: Phase 0-F/G (mobile theme + components done), Phase 1 (API complete).
Location: apps/mobile/src/

FILE: lib/storage.ts
  Wrapper for expo-secure-store:
  saveTokens(accessToken, refreshToken): SecureStore.setItemAsync
  getTokens(): returns { accessToken, refreshToken } or null
  clearTokens(): SecureStore.deleteItemAsync for both

FILE: lib/authhub.client.ts
  Uses expo-auth-session for the OAuth flow.
  Builds authorize URL with EXPO_PUBLIC_REDIRECT_URI as redirect.
  Handles code exchange. Returns tokens.

FILE: screens/auth/LoginScreen.tsx
  VaultKit wordmark. "Sign in" button. Triggers AuthHub OAuth via expo-auth-session.
  On success: save tokens, navigate to Dashboard.
  On error: show error message.

FILE: screens/workspace/DashboardScreen.tsx
  SyncStatusBar at top (shown if offline or syncing).
  FlatList: recent assets (AssetCard grid, 2 columns) + collections section.
  Pull-to-refresh.

FILE: screens/workspace/CollectionScreen.tsx
  FlatList/grid of AssetCard components with BlurHashImage.
  Cursor-based infinite scroll. Loading skeleton.

FILE: screens/workspace/AssetScreen.tsx
  Full-screen preview (BlurHashImage → WebP). Swipe down to close.
  Metadata: name, size (IBMPlexMono), type, approval Badge.
  Download button, Share button. Versions list if > 1 version.

FILE: screens/upload/UploadScreen.tsx
  File picker (expo-document-picker or expo-image-picker).
  UploadQueue component showing selected files with SyncDot.
  "Upload" button triggers chunked upload via useUploadQueue hook.

FILE: hooks/useNetInfo.ts
  Wraps @react-native-community/netinfo.
  Returns { isConnected, connectionType }.
  Emits event when connectivity changes.

FILE: hooks/useUploadQueue.ts
  State: queue of { id, filename, file, status: SyncStatus, progress, chunkOffset }
  addToQueue(file): push to queue, save to SQLite
  When connected: flush queue — upload each file using chunked upload API
  On network drop: pause upload, save chunk_offset to SQLite
  On reconnect: resume from saved chunk_offset (delta-sync)
  Update sync status per file throughout

FILE: db/schema.ts (SQLite via expo-sqlite)
  Tables for offline state:
  queued_uploads: id, filename, file_uri, file_type, size_bytes, total_chunks,
    uploaded_chunks, collection_id, status, created_at
  cached_assets: id, workspace_id, collection_id, name, file_type, size_bytes,
    blur_hash, preview_url, approval_status, synced_at

FILE: db/sync.ts
  Pull from API on connectivity restore: fetch recent assets + collections.
  Save to cached_assets table. Used for offline search + browsing.

CRITICAL MOBILE RULES (enforced):
  No expo-linear-gradient installed.
  All colors from colors.ts — no hardcoded hex.
  StyleSheet.hairlineWidth on all borders.
  useNativeDriver: true on ALL Animated calls.
```

---

# ═══════════════════════════════════════════════
# VERIFICATION MATRIX
# Run these after Phase 1 to confirm everything works
# ═══════════════════════════════════════════════

```
SCENARIO 1 — Workspace provisioning
  Action:  POST /workspaces { name: "Test Agency", slug: "test-agency" }
  Expect:  201, AuthHub tenant + client created, workspace row in DB

SCENARIO 2 — Member login
  Action:  Login via OAuth with workspace client_id
  Expect:  Token issued, workspace resolved from client_id, member confirmed

SCENARIO 3 — Chunked upload
  Action:  Init → upload 10 chunks → complete
  Expect:  asset row in DB, status=processing, BullMQ jobs queued

SCENARIO 4 — Processing pipeline
  Wait 30s after upload.
  Expect:  blur_hash populated, sm+md+lg previews in R2, status=ready

SCENARIO 5 — Share + Approval
  Action:  POST /share, GET /s/{token}, POST /s/{token}/action {action:"approved"}
  Expect:  Asset approval_status = 'approved'

SCENARIO 6 — Cross-workspace isolation
  Action:  alice@test.com in workspace A + workspace B
  Expect:  No role collision. Separate membership rows. Independent sessions.

SCENARIO 7 — Idempotency
  Action:  Same Idempotency-Key on POST /assets/upload/init × 2
  Expect:  Second call returns cached 201, no duplicate session

SCENARIO 8 — Token expiry
  Action:  Send request with expired access token
  Expect:  401 INVALID_TOKEN, no workspace resolution attempted

SCENARIO 9 — Scope enforcement
  Action:  Viewer tries DELETE /assets/:id
  Expect:  403 INSUFFICIENT_PERMISSION (missing files:delete scope)

SCENARIO 10 — Missing idempotency key
  Action:  POST /assets/upload/init without Idempotency-Key header
  Expect:  400 MISSING_IDEMPOTENCY_KEY
```
