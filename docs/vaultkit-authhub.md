# VaultKit — AuthHub Integration Guide
> How VaultKit uses AuthHub as its identity backbone
> Version 1.0

---

## Overview

VaultKit uses AuthHub exclusively for all authentication and identity management. Zero auth logic lives in VaultKit's codebase — AuthHub owns it all. This document defines exactly how the two systems connect.

---

## Identity Model Mapping

```
AuthHub Concept          VaultKit Concept
─────────────────────    ────────────────────────────────
Developer account     →  VaultKit dashboard account (you, Amos)
Tenant                →  VaultKit Workspace
OAuth Client          →  VaultKit Workspace's credentials
End User              →  Workspace Member
Token Scope           →  Permission gate on API endpoints
Client Credentials    →  Worker-to-AuthHub M2M auth
```

---

## 1. VaultKit Dashboard Login (Developer Flow)

This is you — Amos — logging into VaultKit to manage your own workspaces.
This is a **direct AuthHub login**, not tenant-scoped.

**Flow:**
```
1. User visits vaultkit.app/login
2. Redirect to AuthHub:
   GET https://auth.authhub.app/authorize
     ?client_id=vaultkit-dashboard          ← VaultKit's own OAuth client
     &response_type=code
     &scope=openid profile email
     &redirect_uri=https://vaultkit.app/auth/callback
     &state=random_state_string

3. User authenticates on AuthHub (email + password)

4. AuthHub redirects back:
   GET https://vaultkit.app/auth/callback
     ?code=authorization_code
     &state=random_state_string

5. VaultKit backend exchanges code for tokens:
   POST https://auth.authhub.app/token
   {
     grant_type: authorization_code,
     code: authorization_code,
     client_id: vaultkit-dashboard,
     client_secret: <secret>,
     redirect_uri: https://vaultkit.app/auth/callback
   }

6. AuthHub returns:
   {
     access_token: "eyJ...",    // 15 min expiry
     refresh_token: "...",      // 7 day expiry
     id_token: "eyJ...",        // user identity
     token_type: "Bearer"
   }

7. VaultKit creates/updates local developer session
8. User lands on dashboard
```

**Token payload (id_token):**
```json
{
  "sub": "authhub_user_id_123",
  "email": "amos@example.com",
  "name": "Amos Nabasa",
  "iat": 1704067200,
  "exp": 1704068100
}
```

---

## 2. Workspace Member Login (Tenant Flow)

This is Alice — a member of "Agency Alpha" workspace — logging into VaultKit.
The `client_id` here is the **workspace's OAuth client**, not VaultKit's own.

**Flow:**
```
1. User visits vaultkit.app/w/agency-alpha (workspace URL)
2. Redirect to AuthHub with workspace's client_id:
   GET https://auth.authhub.app/authorize
     ?client_id=workspace_abc123            ← Agency Alpha's OAuth client_id
     &response_type=code
     &scope=openid profile email files:read files:upload
     &redirect_uri=https://vaultkit.app/auth/callback
     &state=random_state_string

3. AuthHub knows: client_id = agency-alpha tenant
   → Looks up user ONLY within agency-alpha tenant
   → alice@gmail.com in agency-alpha ≠ alice@gmail.com in other-workspace
   → No ambiguity

4. Same code exchange as above
5. Access token issued with workspace scope

6. VaultKit resolves workspace from token:
   token.aud === workspace_abc123 → workspace_id = wsp_agency_alpha
```

**Access token payload:**
```json
{
  "sub": "authhub_user_id_456",
  "email": "alice@gmail.com",
  "tenant_id": "agency-alpha-tenant",
  "client_id": "workspace_abc123",
  "scope": "openid profile email files:read files:upload",
  "iat": 1704067200,
  "exp": 1704068100
}
```

**Key points:**
- `client_id` is always present → workspace is always resolved
- Email lookup in AuthHub: `WHERE email = $1 AND tenant_id = $2` — never email alone
- If Alice is in 2 workspaces, she has 2 separate AuthHub sessions with 2 different `client_id`s

---

## 3. Workspace Provisioning (Creating a New Workspace)

When a developer creates a new VaultKit workspace, VaultKit calls AuthHub's Admin API to provision a new tenant + OAuth client.

```typescript
// authhub.provisioner.ts

async function provisionWorkspace(workspaceSlug: string, workspaceName: string) {
  // Step 1: Create a new tenant in AuthHub
  const tenantResponse = await fetch('https://auth.authhub.app/admin/tenants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTHHUB_ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: workspaceName,
      slug: workspaceSlug
    })
  })
  const { tenant_id } = await tenantResponse.json()

  // Step 2: Register an OAuth client for this tenant
  const clientResponse = await fetch('https://auth.authhub.app/admin/clients', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTHHUB_ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tenant_id,
      name: `${workspaceName} - VaultKit`,
      redirect_uris: [`https://vaultkit.app/auth/callback`],
      grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
      scopes: ['openid', 'profile', 'email', 'files:read', 'files:upload', 'files:delete', 'workspace:manage']
    })
  })
  const { client_id, client_secret } = await clientResponse.json()

  return { tenant_id, client_id, client_secret }
}
```

---

## 4. Machine-to-Machine (Worker Auth)

Processing workers (thumbnail generation, lifecycle jobs) need to access file metadata and update asset status. They authenticate using the **Client Credentials** grant — no user involved.

```typescript
// m2m.service.ts

async function getWorkerToken(workspaceClientId: string, workspaceClientSecret: string) {
  const response = await fetch('https://auth.authhub.app/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: workspaceClientId,
      client_secret: workspaceClientSecret,
      scope: 'files:read files:upload'
    })
  })

  const { access_token, expires_in } = await response.json()
  return access_token
  // Cache this token in Redis for (expires_in - 60) seconds
}
```

**Worker uses this token** to call VaultKit's internal API endpoints when updating asset status after processing.

---

## 5. Zero-Trust Middleware (Per Request)

Every API request goes through this chain — no exceptions.

```typescript
// middleware/auth.middleware.ts

export async function authMiddleware(req, res, next) {

  // Step 1: Extract token
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: { code: 'INVALID_TOKEN' } })

  // Step 2: Verify JWT signature using AuthHub's JWKS endpoint
  // JWKS is cached in memory — refetched only on key rotation
  const payload = await verifyJWT(token, AUTHHUB_JWKS_URL)
  if (!payload) return res.status(401).json({ error: { code: 'INVALID_TOKEN' } })

  // Step 3: Extract workspace from token
  const workspaceClientId = payload.client_id
  if (!workspaceClientId) return res.status(400).json({ error: { code: 'MISSING_WORKSPACE' } })

  // Step 4: Resolve workspace from client_id
  const workspace = await db.query(
    'SELECT id, plan, storage_quota_bytes FROM workspaces WHERE authhub_client_id = $1 AND deleted_at IS NULL',
    [workspaceClientId]
  )
  if (!workspace) return res.status(404).json({ error: { code: 'RESOURCE_NOT_FOUND' } })

  // Step 5: Confirm user is an active member of this workspace
  const member = await db.query(
    `SELECT id, role FROM workspace_members
     WHERE workspace_id = $1 AND authhub_user_id = $2 AND deleted_at IS NULL`,
    [workspace.id, payload.sub]
  )
  if (!member) return res.status(403).json({ error: { code: 'NOT_A_MEMBER' } })

  // Step 6: Attach context to request
  req.auth = {
    userId: payload.sub,
    email: payload.email,
    scopes: payload.scope.split(' '),
    workspace,
    member
  }

  next()
}

// Scope enforcement (used per-route)
export function requireScope(scope: string) {
  return (req, res, next) => {
    if (!req.auth.scopes.includes(scope)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSION', message: `Requires ${scope} scope` }
      })
    }
    next()
  }
}

// Role enforcement (used per-route)
export function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.auth.member.role)) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSION', message: `Requires role: ${roles.join(' or ')}` }
      })
    }
    next()
  }
}
```

**Route usage:**
```typescript
router.delete('/assets/:id',
  authMiddleware,
  requireScope('files:delete'),
  requireRole('editor', 'admin'),
  deleteAssetHandler
)
```

---

## 6. Token Refresh (Offline Recovery)

When a user returns after 4+ hours offline, their access token has expired.
VaultKit handles this transparently using the refresh token.

```typescript
// token.service.ts

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch('https://auth.authhub.app/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })
  })

  if (!response.ok) {
    // Refresh token expired (>7 days offline) — must re-login
    throw new Error('SESSION_EXPIRED')
  }

  return response.json()
  // { access_token, refresh_token (rotated), expires_in }
}
```

**Mobile app strategy:**
- On app foreground: check if `access_token` expires within 5 minutes
- If yes: silently refresh before making any API calls
- Store new tokens securely (Expo SecureStore)
- If refresh fails: redirect to login with message "Your session expired. Please sign in again."

---

## 7. Cross-Tenant User Identity

**Scenario**: Alice is an Editor in "Agency Alpha" and a Viewer in "Agency Beta".
Both workspaces use AuthHub. Alice has **one AuthHub identity** but **two workspace memberships**.

```
AuthHub User: sub = "authhub_user_456" (alice@gmail.com)
                    |
        ┌───────────┴───────────┐
        ▼                       ▼
Agency Alpha tenant       Agency Beta tenant
alice = Editor            alice = Viewer
```

**How this works:**
- Alice logs into Agency Alpha → AuthHub issues token with `client_id = workspace_abc`
- Alice logs into Agency Beta → AuthHub issues token with `client_id = workspace_xyz`
- VaultKit stores `authhub_user_id` in `workspace_members` for each workspace separately
- No cross-contamination — role in one workspace does not affect the other

**Inviting cross-tenant:**
```
Agency Alpha admin invites alice@gmail.com as viewer
    ↓
VaultKit sends invite email with token
    ↓
Alice clicks link: vaultkit.app/invite/:token
    ↓
AuthHub checks: does alice@gmail.com exist in agency-beta tenant?
  - Yes → link accounts, create workspace_member row
  - No  → register alice in agency-beta tenant, create row
    ↓
Alice now appears in workspace_members for both workspaces
```

---

## 8. AuthHub Stress Test — VaultKit Scenarios

| Test | Endpoint | What AuthHub Must Handle |
|---|---|---|
| Same email, two workspaces | `/authorize?client_id=ws_A` vs `?client_id=ws_B` | Isolated tenant lookup — no collision |
| Offline 4hrs, token expired | Mobile app resumes | Refresh token still valid, new access token issued |
| Worker updates asset status | `POST /assets/:id` with M2M token | Client Credentials token accepted, scoped correctly |
| Admin revokes member mid-session | Next request from revoked member | `NOT_A_MEMBER` returned — token valid but membership gone |
| Client opens WhatsApp link | `GET /s/:token` (no auth) | No AuthHub call — share link is scope-limited public access |
| `files:delete` required, user has `files:read` only | `DELETE /assets/:id` | `INSUFFICIENT_PERMISSION` — scope enforcement works |
| JWKS key rotation | Any authenticated request | JWKS cache refreshed — no downtime |
