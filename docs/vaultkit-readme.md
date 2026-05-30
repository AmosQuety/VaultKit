# VaultKit — Project Index
> Digital Asset Management for East African Teams & Creators  
> Built on AuthHub | Offline-First | Low-Bandwidth | Mobile-Native

---

## What is VaultKit?

VaultKit is a team-oriented Digital Asset Management (DAM) platform built for agencies, creators, and SMEs in East Africa. It solves the real problem of file chaos — files shared over WhatsApp, Google Drive folders no one can find, clients who won't log into new platforms to approve work.

It is simultaneously a **production product** and a **real-world stress test for AuthHub** (a custom multi-tenant OIDC/OAuth 2.0 identity provider).

---

## Core Pillars

| Pillar | What It Does |
|---|---|
| **WhatsApp Approval Flow** | Clients approve/reject files via a lightweight web view — no account needed |
| **Offline Field Mode** | Tag and queue assets with zero connectivity. Auto-sync on reconnect with delta-sync |
| **Data-Saver Previews** | Blur-hash placeholders → 10KB WebP. Full asset only loaded on demand |
| **Localized Payments** | MTN MoMo + Airtel Money subscriptions in UGX/KES |
| **Zero-Trust Security** | Every request: token → workspace → role → scope. No assumptions |
| **AuthHub Integration** | All auth flows through AuthHub. VaultKit has zero internal auth logic |

---

## Document Index

| Document | Description |
|---|---|
| `vaultkit-requirements.md` | Full Functional, Non-Functional, and Technical Requirements |
| `vaultkit-schema.md` | PostgreSQL (Neon) + SQLite (Mobile) database schema with all tables |
| `vaultkit-architecture.md` | System architecture: modules, processing pipeline, deployment, security |
| `vaultkit-api.md` | Full REST + GraphQL API design with request/response examples |
| `vaultkit-authhub.md` | AuthHub integration: all flows, middleware, provisioning, stress tests |

---

## Tech Stack

```
Frontend (Web)      React + TypeScript + Tailwind
Frontend (Mobile)   React Native + Expo
Backend API         Node.js + Fastify (TypeScript)
Workers             Node.js + BullMQ + Sharp.js
Database            PostgreSQL via Neon + SQLite (mobile)
Cache               Redis (Upstash)
Storage             Cloudflare R2
Auth                AuthHub (OAuth 2.0 / OIDC)
ORM                 Drizzle ORM
Payments            MTN MoMo + Airtel Money + Stripe
Deployment          Railway + Cloudflare
```

---

## Implementation Phases

```
Phase 1 — Core (Build First)
  ✦ Workspace creation → AuthHub tenant provisioning
  ✦ Chunked upload with idempotency keys
  ✦ Asset versioning (version_number, content_hash)
  ✦ BullMQ processing pipeline (blur-hash, thumbnails)
  ✦ Pre-signed URL file access
  ✦ Zero-trust auth middleware
  ✦ Basic RBAC

Phase 2 — Product (First Users)
  ✦ WhatsApp Approval Workflow
  ✦ Offline Field Mode (mobile)
  ✦ Data-Saver previews
  ✦ Share link engine
  ✦ Notification system
  ✦ Rate limiting + quota enforcement
  ✦ Storage lifecycle / cleanup crons

Phase 3 — Scale
  ✦ MTN MoMo + Airtel Money billing
  ✦ Hot → cold storage auto-tiering
  ✦ AI auto-tagging
  ✦ OpenTelemetry observability
  ✦ Archive management UI
```

---

## AuthHub Tests This Covers

| Scenario | AuthHub Feature |
|---|---|
| Member logs into workspace | Tenant-scoped login with client_id |
| Same email in two workspaces | Isolated tenant user lookup |
| Worker updates asset status | M2M Client Credentials flow |
| User offline 4hrs, resumes | Refresh token longevity |
| Admin removes member mid-session | Real-time membership revocation |
| files:delete scope check | Fine-grained scope enforcement |
| New workspace created | Tenant + OAuth client provisioning via Admin API |

---

## Storage Model

```
Free Workspace    2GB total | 3 members | 5 active share links
Pro Workspace     50GB      | 20 members | unlimited links — UGX 35,000/mo
Agency Workspace  500GB     | unlimited | priority processing — UGX 120,000/mo

Storage Tiers:
  Hot   (0–90 days active)    → Cloudflare R2 Standard
  Cold  (90+ days inactive)   → R2 / Glacier equivalent (auto-moved weekly)

Auto-deleted:
  Generated previews          → 7 days after parent asset deleted
  Share link exports          → 7 days after last download
  Orphaned files              → 24hr cleanup cron
  Expired upload sessions     → 6hr cleanup cron
```
