# VaultKit

VaultKit is a modular monorepo for a digital asset management platform built for East African teams, agencies, and creators. The product is designed around low-bandwidth usage, offline-first mobile workflows, secure multi-tenant workspaces, and AuthHub-backed identity.

## What VaultKit Does

VaultKit helps teams store, organize, share, and approve creative assets without relying on heavy enterprise tooling. The main product ideas are:

- Workspace-based multi-tenancy with AuthHub tenant provisioning
- Role-based access control for admins, editors, viewers, and external clients
- Chunked uploads with resumable sync and idempotency
- Share links and a lightweight WhatsApp approval flow
- Offline-first mobile tagging and upload queueing
- Blur-hash and thumbnail previews for low-bandwidth environments

## Tech Stack

- Frontend web: React + TypeScript + Vite
- Mobile app: React Native + Expo
- API: Node.js + Fastify + TypeScript
- Workers: BullMQ processing jobs
- Database: PostgreSQL on Neon
- Cache / queue: Redis
- Storage: Cloudflare R2 via a storage adapter package
- Auth: AuthHub OIDC/OAuth integration
- ORM: Drizzle ORM

## Repository Layout

- `apps/web` - dashboard and public web UI
- `apps/mobile` - Expo mobile app
- `services/api` - Fastify API server and database migrations
- `services/workers` - background job workers
- `packages/shared` - shared types and utility helpers
- `packages/storage-adapter` - storage interface plus R2/local implementations
- `docs/` - product, architecture, schema, and AuthHub reference docs
- `prompts/` - implementation guidance and workplans

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

If pnpm blocks native build scripts on a fresh machine, run:

```bash
pnpm approve-builds --all
```

### 2. Configure environment

Use the root `.env` file for local development. Do not create service-specific env files.

Required values for the API include:

- `DATABASE_URL`
- `AUTHHUB_BASE_URL`
- `AUTHHUB_JWKS_URL`
- `AUTHHUB_ADMIN_TOKEN`
- `WEB_APP_URL`
- `REDIS_URL`

The repo keeps the environment single-file for simplicity, and the API loads the root `.env` directly.

### 3. Run database migrations

```bash
pnpm --filter @vaultkit/api migrate
```

### 4. Start the services you need

```bash
pnpm --filter @vaultkit/api dev
pnpm --filter @vaultkit/workers dev
pnpm --filter @vaultkit/web dev
pnpm --filter @vaultkit/mobile start
```

## Current Status

The following are already in place:

- Neon migrations apply successfully from the API package
- Workspace provisioning routes through a dedicated AuthHub provisioner module
- The API reads the shared root `.env`
- A root `.gitignore` is present for the monorepo

The repository still has unrelated TypeScript/build issues outside the workspace provisioning path, so a full monorepo build is not yet clean.

## Key Docs

Read these if you want the deeper product and implementation details:

- `docs/vaultkit-readme.md`
- `docs/vaultkit-architecture.md`
- `docs/vaultkit-requirements.md`
- `docs/vaultkit-api.md`
- `docs/vaultkit-authhub.md`
- `docs/vaultkit-env.md`

## Notes For Contributors

- Keep the root `.env` local only; never commit it.
- Workspace creation should always provision an AuthHub tenant before inserting the workspace record.
- The API and worker packages should stay aligned on the same Neon database and Redis instance.
- Use the docs folder as the source of truth for product behavior and AuthHub flow details.