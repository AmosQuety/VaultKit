# VaultKit — Project Structure
> Modular Monolith. Single repo, strictly separated modules.

```
vaultkit/
├── apps/
│   ├── web/                          # React + TypeScript (Vite)
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/               # Static images, icons
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Design system primitives
│   │   │   │   │   ├── Badge.tsx
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── asset/
│   │   │   │   │   ├── AssetCard.tsx
│   │   │   │   │   ├── AssetGrid.tsx
│   │   │   │   │   ├── AssetPreview.tsx
│   │   │   │   │   └── SyncIndicator.tsx
│   │   │   │   ├── collection/
│   │   │   │   │   ├── CollectionList.tsx
│   │   │   │   │   └── CollectionCard.tsx
│   │   │   │   ├── share/
│   │   │   │   │   ├── ShareModal.tsx
│   │   │   │   │   └── ApprovalCard.tsx
│   │   │   │   └── workspace/
│   │   │   │       ├── StorageBar.tsx
│   │   │   │       └── MemberList.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useAssets.ts
│   │   │   │   ├── useWorkspace.ts
│   │   │   │   └── useUpload.ts
│   │   │   ├── pages/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── Login.tsx
│   │   │   │   │   └── Callback.tsx
│   │   │   │   ├── workspace/
│   │   │   │   │   ├── Dashboard.tsx
│   │   │   │   │   ├── Collection.tsx
│   │   │   │   │   ├── Asset.tsx
│   │   │   │   │   ├── ShareLinks.tsx
│   │   │   │   │   ├── Approvals.tsx
│   │   │   │   │   ├── Members.tsx
│   │   │   │   │   └── Settings.tsx
│   │   │   │   └── public/
│   │   │   │       └── ShareView.tsx   # WhatsApp approval page
│   │   │   ├── stores/                 # Zustand state
│   │   │   │   ├── auth.store.ts
│   │   │   │   ├── workspace.store.ts
│   │   │   │   └── upload.store.ts
│   │   │   ├── lib/
│   │   │   │   ├── api.client.ts       # Axios/fetch wrapper with auth
│   │   │   │   └── authhub.client.ts   # AuthHub OAuth helper
│   │   │   ├── styles/
│   │   │   │   ├── tokens.css          # CSS custom properties from DESIGN_SYSTEM.md
│   │   │   │   └── global.css
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── mobile/                       # React Native + Expo
│       ├── assets/
│       │   └── fonts/                # Sora + IBM Plex Mono TTF files
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/               # RN design system primitives
│       │   │   │   ├── Badge.tsx
│       │   │   │   ├── Button.tsx
│       │   │   │   ├── Card.tsx
│       │   │   │   └── Input.tsx
│       │   │   ├── asset/
│       │   │   │   ├── AssetCard.tsx
│       │   │   │   ├── BlurHashImage.tsx
│       │   │   │   └── SyncStatusBar.tsx
│       │   │   └── upload/
│       │   │       └── UploadQueue.tsx
│       │   ├── screens/
│       │   │   ├── auth/
│       │   │   │   └── LoginScreen.tsx
│       │   │   ├── workspace/
│       │   │   │   ├── DashboardScreen.tsx
│       │   │   │   ├── CollectionScreen.tsx
│       │   │   │   ├── AssetScreen.tsx
│       │   │   │   └── SettingsScreen.tsx
│       │   │   └── upload/
│       │   │       └── UploadScreen.tsx
│       │   ├── hooks/
│       │   │   ├── useSync.ts          # Offline sync engine
│       │   │   ├── useUploadQueue.ts   # Delta-sync upload queue
│       │   │   └── useNetInfo.ts       # Connectivity detection
│       │   ├── db/
│       │   │   ├── schema.ts           # SQLite schema (Expo SQLite)
│       │   │   └── sync.ts             # Server ↔ SQLite sync logic
│       │   ├── lib/
│       │   │   ├── api.client.ts
│       │   │   ├── authhub.client.ts
│       │   │   └── storage.ts          # Expo SecureStore for tokens
│       │   └── theme/
│       │       ├── colors.ts           # From DESIGN_SYSTEM.md
│       │       ├── spacing.ts
│       │       └── typography.ts
│       ├── app.json
│       └── package.json
│
├── packages/
│   ├── shared/                       # Shared types + utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── asset.types.ts
│   │   │   │   ├── workspace.types.ts
│   │   │   │   ├── share.types.ts
│   │   │   │   └── auth.types.ts
│   │   │   └── utils/
│   │   │       ├── formatBytes.ts
│   │   │       ├── formatDate.ts
│   │   │       └── idempotencyKey.ts  # UUID generator for Idempotency-Key
│   │   └── package.json
│   │
│   └── storage-adapter/              # Cloud Storage Abstraction Layer
│       ├── src/
│       │   ├── adapter.interface.ts  # StorageAdapter interface
│       │   ├── r2.adapter.ts         # Cloudflare R2 implementation
│       │   ├── s3.adapter.ts         # AWS S3 (fallback)
│       │   └── local.adapter.ts      # Local dev only
│       └── package.json
│
├── services/
│   ├── api/                          # Main API server (Fastify)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.middleware.ts   # verifyToken + enforcePermission
│   │   │   │   │   ├── authhub.client.ts    # HTTP client for AuthHub API
│   │   │   │   │   └── m2m.service.ts       # Client Credentials flow
│   │   │   │   ├── assets/
│   │   │   │   │   ├── assets.routes.ts
│   │   │   │   │   ├── assets.service.ts
│   │   │   │   │   ├── upload.service.ts
│   │   │   │   │   ├── presign.service.ts
│   │   │   │   │   └── tag.service.ts
│   │   │   │   ├── collections/
│   │   │   │   │   ├── collections.routes.ts
│   │   │   │   │   └── collections.service.ts
│   │   │   │   ├── share/
│   │   │   │   │   ├── share.routes.ts
│   │   │   │   │   ├── sharelink.service.ts
│   │   │   │   │   └── approval.service.ts
│   │   │   │   ├── workspaces/
│   │   │   │   │   ├── workspaces.routes.ts
│   │   │   │   │   ├── workspace.service.ts
│   │   │   │   │   ├── members.service.ts
│   │   │   │   │   └── authhub.provisioner.ts
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── notifications.routes.ts
│   │   │   │   │   └── notifications.service.ts
│   │   │   │   └── billing/
│   │   │   │       ├── billing.routes.ts
│   │   │   │       └── momo.service.ts
│   │   │   ├── middleware/
│   │   │   │   ├── idempotency.middleware.ts
│   │   │   │   ├── rateLimit.middleware.ts
│   │   │   │   └── validate.middleware.ts   # Zod schema validation
│   │   │   ├── db/
│   │   │   │   ├── schema.ts               # Drizzle ORM schema
│   │   │   │   ├── client.ts               # Neon connection + pooler
│   │   │   │   └── migrations/
│   │   │   ├── events/
│   │   │   │   └── eventBus.ts             # Observer pattern for notifications
│   │   │   ├── views/
│   │   │   │   └── approval.html           # WhatsApp approval static page
│   │   │   └── server.ts
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── workers/                      # BullMQ processing workers
│       ├── src/
│       │   ├── queues/
│       │   │   └── asset.queue.ts          # Queue definition + job options
│       │   ├── workers/
│       │   │   ├── thumbnail.worker.ts     # Sharp.js resize → WebP
│       │   │   ├── blurhash.worker.ts      # blur-hash string generation
│       │   │   ├── pdf.worker.ts           # PDF first-page preview
│       │   │   └── metadata.worker.ts      # EXIF / file metadata
│       │   ├── jobs/
│       │   │   ├── lifecycle.job.ts        # Hot → cold storage mover
│       │   │   ├── cleanup.job.ts          # Orphan + expired file cleanup
│       │   │   └── quota.job.ts            # Recalculate workspace storage
│       │   └── index.ts
│       ├── .env.example
│       └── package.json
│
├── docs/
│   ├── DESIGN_SYSTEM.md              # ← AI reads before any UI work
│   ├── AUTHHUB_REFERENCE.md          # ← AI reads before any auth work
│   ├── vaultkit-readme.md
│   ├── vaultkit-requirements.md
│   ├── vaultkit-schema.md
│   ├── vaultkit-architecture.md
│   ├── vaultkit-api.md
│   └── vaultkit-authhub.md
│
├── .env.example                      # Root env vars
├── package.json                      # Workspace root (pnpm workspaces)
├── pnpm-workspace.yaml
└── turbo.json                        # Turborepo build pipeline
```
