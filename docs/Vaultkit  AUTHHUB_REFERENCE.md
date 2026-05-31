# AuthHub — Complete System Reference
> For AI agents building integrations against AuthHub.
> Read this before writing any authentication code for VaultKit.
> 
> ⚠️ AGENT RULE: Do not guess about AuthHub. If something is unclear,
>    look it up in the actual AuthHub codebase first. Do not invent endpoints.

---

## What is AuthHub?

AuthHub is a **custom-built multi-tenant OIDC/OAuth 2.0 identity provider** — 
the equivalent of Auth0 or Keycloak, but built from scratch as a Node.js/TypeScript 
backend. It is NOT a third-party library. It is a separate deployed service.

**Live URLs:**
- API Base: `https://authhub-npym.onrender.com/api/v1`
- API Docs: `https://authhub-npym.onrender.com/api/v1/docs`
- Frontend Dashboard: `https://auth-hubb.vercel.app`
- GitHub (backend): `https://github.com/AmosQuety/AuthHub/tree/main/backend`

---

## Core Concepts

### 1. Developers (Dashboard Users)
People who register on AuthHub to use it as a service.
- Have their own accounts in AuthHub's own user store
- Are NOT tenant-scoped — they exist globally
- Log into the AuthHub dashboard at `auth-hubb.vercel.app`
- Can create Tenants (applications)

### 2. Tenants
A Tenant = a registered application in AuthHub.
- When a developer creates a VaultKit Workspace, VaultKit calls AuthHub's Admin API to create a new Tenant
- Each Tenant gets a `tenant_id` and an OAuth Client (`client_id` + `client_secret`)
- Tenants are isolated — users in Tenant A cannot see or collide with users in Tenant B

### 3. OAuth Clients
Every Tenant has at least one OAuth Client.
- Identified by `client_id` and `client_secret`
- The `client_id` is what VaultKit passes in every authorization request to tell AuthHub which tenant context to use
- VaultKit Workspace ↔ AuthHub Tenant ↔ OAuth Client is a 1:1:1 relationship

### 4. Tenant Users (End Users)
Users inside a specific Tenant.
- Stored per-tenant — `alice@gmail.com` in Tenant A and `alice@gmail.com` in Tenant B are DIFFERENT user records
- Lookup is ALWAYS: `WHERE email = $1 AND tenant_id = $2` — never email alone
- In VaultKit, these are the Workspace Members

---

## Identity Model

```
AuthHub
├── developer_accounts          ← VaultKit dashboard admin (globally unique email)
│
└── tenants[]
    ├── tenant_id: "vaultkit-agency-alpha"
    ├── oauth_clients[]
    │   ├── client_id: "abc123"
    │   └── client_secret: "xyz789"
    └── users[]                 ← Workspace members (email unique PER tenant only)
        ├── alice@gmail.com     ← Alice in Agency Alpha
        └── bob@corp.com
```

---

## Base URL

```
https://authhub-npym.onrender.com/api/v1
```

All VaultKit integration code MUST use this base URL from an environment variable:
```env
AUTHHUB_BASE_URL=https://authhub-npym.onrender.com/api/v1
AUTHHUB_ADMIN_TOKEN=<your admin token>
AUTHHUB_JWKS_URL=https://authhub-npym.onrender.com/api/v1/.well-known/jwks.json
```

---

## Authentication Flows

### Flow 1: Developer Login (Dashboard → AuthHub Dashboard)
Used when the developer (Amos) logs into `auth-hubb.vercel.app`.
This is AuthHub authenticating its OWN users — not VaultKit's concern.

### Flow 2: VaultKit Workspace Member Login (Authorization Code Flow)
Used when a team member logs into a VaultKit Workspace.

**Step 1 — Redirect to AuthHub**
```
GET {AUTHHUB_BASE_URL}/oauth/authorize
  ?response_type=code
  &client_id={workspace_client_id}        ← REQUIRED. Identifies the tenant.
  &redirect_uri=https://vaultkit.app/auth/callback
  &scope=openid profile email files:read files:upload
  &state={random_csrf_token}
```

**Step 2 — AuthHub authenticates user within that tenant**
AuthHub looks up the user: `WHERE email = ? AND tenant_id = (resolved from client_id)`
Returns authorization code to redirect_uri.

**Step 3 — VaultKit exchanges code for tokens**
```
POST {AUTHHUB_BASE_URL}/oauth/token
Content-Type: application/x-www-form-urlencoded
grant_type=authorization_code

-- NOTE (PKCE + public-client): VaultKit implements a public-client PKCE flow for browser/mobile apps.
-- The browser/mobile app initiates the flow (code_challenge) but DOES NOT hold client_secret.
-- The VaultKit backend performs the code->token exchange server-side using the stored PKCE `code_verifier`.

grant_type=authorization_code
&code={authorization_code}
&client_id={workspace_client_id}
&redirect_uri=https://vaultkit.app/auth/callback
```

**Response:**
```json
{
  "access_token":  "eyJ...",
  "refresh_token": "...",
  "id_token":      "eyJ...",
  "token_type":    "Bearer",
  "expires_in":    900
}
```

Note: For web clients VaultKit sets `HttpOnly` cookies for `access` and `refresh` tokens when the backend completes the exchange. The client-side JavaScript should not store token material in localStorage/sessionStorage in production — instead it should rely on the browser to send cookies (`fetch(..., { credentials: 'include' })`).

**Step 4 — Decode and use the access_token**
```json
{
  "sub":       "authhub_user_id_456",
  "email":     "alice@gmail.com",
  "tenant_id": "vaultkit-agency-alpha-tenant",
  "client_id": "workspace_abc123",
  "scope":     "openid profile email files:read files:upload",
  "iat":       1704067200,
  "exp":       1704068100
}
```

### Flow 3: Token Refresh
Used when access_token expires (after 15 min). Triggered silently by VaultKit.
```
POST {AUTHHUB_BASE_URL}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={refresh_token}

-- When VaultKit uses HttpOnly cookies, the client need not include the `refresh_token` in the body: the VaultKit server will read the `vaultkit_refresh` cookie and call AuthHub's token endpoint server-side.
&client_id={workspace_client_id}

```

**Response:** New `access_token` + rotated `refresh_token`.

If refresh_token is expired (>7 days): returns 401 → user must log in again.
VaultKit should catch this and redirect to login with message: 
`"Your session expired. Please sign in again."`

Implementation notes (VaultKit server):
- PKCE state (CSRF + code_verifier) is stored in Redis with a TTL. Recent change: increase TTL from 60s to 5 minutes to reduce false-expiry errors for slow networks or user delays.
- The Redis `csrf:{state}` entry is single-use and is deleted only after a successful code→token exchange (deferred delete). If the state is missing the callback returns a `restartUrl` so the client can re-initiate login.
- The server sets `vaultkit_access` and `vaultkit_refresh` cookies as `HttpOnly` and `Secure` (Secure is disabled in development to allow local testing). Ensure CORS is configured with `credentials: true` and web client uses `credentials: 'include'`.

### Flow 4: Machine-to-Machine (Worker Auth — Client Credentials)
Used by VaultKit's background workers (thumbnail processing, cleanup jobs) to
authenticate against AuthHub without a user.
```
POST {AUTHHUB_BASE_URL}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={workspace_client_id}
&client_secret={workspace_client_secret}
&scope=files:read files:upload
```

**Response:** `access_token` only (no refresh_token, no id_token).

Cache this token in Redis until 60 seconds before expiry.

---

## Token Validation (Per Request — Zero Trust)

Never trust the token without validating it. Every incoming request to VaultKit:

**Step 1 — Verify JWT signature**
```typescript
import jwksClient from 'jwks-rsa'
import jwt from 'jsonwebtoken'

const client = jwksClient({
  jwksUri: process.env.AUTHHUB_JWKS_URL,
  cache: true,
  cacheMaxAge: 600000,         // cache JWKS for 10 minutes
  rateLimit: true,
})

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey()
    callback(err, signingKey)
  })
}

function verifyToken(token: string): Promise<TokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) reject(err)
      else resolve(decoded as TokenPayload)
    })
  })
}
```

**Step 2 — Resolve workspace from client_id in token**
```typescript
const workspace = await db.query(
  'SELECT id, plan FROM workspaces WHERE authhub_client_id = $1 AND deleted_at IS NULL',
  [payload.client_id]
)
if (!workspace) return 403 // tenant not registered in VaultKit
```

**Step 3 — Verify workspace membership**
```typescript
const member = await db.query(
  `SELECT id, role FROM workspace_members
   WHERE workspace_id = $1 AND authhub_user_id = $2 AND deleted_at IS NULL`,
  [workspace.id, payload.sub]
)
if (!member) return 403 // NOT_A_MEMBER
```

**Step 4 — Check scope for the operation**
```typescript
const scopes = payload.scope.split(' ')
if (!scopes.includes(requiredScope)) return 403 // INSUFFICIENT_PERMISSION
```

---

## Tenant Provisioning (Admin API)

When a new VaultKit Workspace is created, call AuthHub's Admin API.

### Phase 1 Provisioning Model

Phase 1 does not provision AuthHub tenants or clients programmatically. The developer creates the AuthHub app manually in the AuthHub dashboard, then copies the resulting credentials into VaultKit when creating the workspace.

Copy these values into the `POST /workspaces` request body:
- `authhub_client_id`
- `authhub_tenant_id`
- `authhub_client_secret`

VaultKit stores the client secret server-side only and never returns it in API responses.

Manual flow:
1. Create the AuthHub app in the dashboard.
2. Copy the tenant ID, client ID, and client secret.
3. Submit those values with the new workspace request.
4. VaultKit uses the stored credentials for login redirects, code exchange, and refresh.

Phase 2 may reintroduce provisioning, but only through a dedicated AuthHub service account flow.

**⚠️ AGENT: Read the actual AuthHub admin routes before implementing this.**
**These endpoints are based on the AuthHub architecture — verify exact paths.**

```typescript
// authhub.provisioner.ts

const AUTHHUB_BASE = process.env.AUTHHUB_BASE_URL
const ADMIN_TOKEN  = process.env.AUTHHUB_ADMIN_TOKEN

async function provisionWorkspace(name: string, slug: string) {
  // 1. Create tenant
  const tenantRes = await fetch(`${AUTHHUB_BASE}/admin/tenants`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, slug }),
  })

  if (!tenantRes.ok) throw new Error(`AuthHub tenant creation failed: ${tenantRes.status}`)
  const { tenant_id } = await tenantRes.json()

  // 2. Register OAuth client for this tenant
  const clientRes = await fetch(`${AUTHHUB_BASE}/admin/clients`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenant_id,
      name: `${name} — VaultKit`,
      redirect_uris: ['https://vaultkit.app/auth/callback'],
      grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
      scopes: ['openid', 'profile', 'email', 'files:read', 'files:upload', 'files:delete', 'workspace:manage'],
    }),
  })

  if (!clientRes.ok) throw new Error(`AuthHub client creation failed: ${clientRes.status}`)
  const { client_id, client_secret } = await clientRes.json()

  return { tenant_id, client_id, client_secret }
}
```

---

## User Registration in a Tenant

When a user accepts a workspace invite, register them in AuthHub under that tenant:
```typescript
async function registerTenantUser(tenantId: string, email: string, password: string) {
  const res = await fetch(`${AUTHHUB_BASE}/admin/tenants/${tenantId}/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}
```

---

## Error Handling

| AuthHub Status | Meaning | VaultKit Action |
|---|---|---|
| `401 invalid_token` | JWT expired or invalid signature | Return 401, prompt re-login |
| `401 token_expired` | Access token past expiry | Silently refresh, retry once |
| `401 refresh_expired` | Refresh token expired | Return 401, force login |
| `403 insufficient_scope` | Token lacks required scope | Return 403, tell user what's needed |
| `404 tenant_not_found` | client_id doesn't match any tenant | Return 400, log for investigation |
| `409 user_exists` | Email already in tenant | Return 409, suggest login instead |

---

## Known Issues Fixed (Do Not Reintroduce)

### Bug 1 — Email-only user lookup (FIXED)
Previously AuthHub was looking up users by email alone, causing ambiguity for
the same email across tenants. Fix: always include `tenant_id` in the lookup.

**Wrong:**
```sql
SELECT * FROM users WHERE email = $1
```
**Correct:**
```sql
SELECT * FROM users WHERE email = $1 AND tenant_id = $2
```

### Bug 2 — Missing client_id in authorization request
The frontend was not always sending `client_id` in the `/oauth/authorize` call.
Without `client_id`, AuthHub cannot resolve the tenant. **Always require it. Reject 400 if missing.**

### Bug 3 — Password comparison inconsistency
Passwords must be hashed with `bcrypt` at registration and compared with `bcrypt.compare()` at login.
Verify this is consistent across all registration paths (dashboard users + tenant users).

### Bug 4 — Auth middleware blocking login endpoints
Auth middleware must NOT be applied to:
- `POST /oauth/token`
- `GET /oauth/authorize`
- `POST /admin/tenants` (protected by admin token, not user JWT)

---

## Scopes Reference (VaultKit)

| Scope | What it allows |
|---|---|
| `openid` | Basic OIDC — required on all flows |
| `profile` | Name, avatar |
| `email` | Email address |
| `files:read` | View and download assets |
| `files:upload` | Upload new assets |
| `files:delete` | Archive assets |
| `workspace:manage` | Invite/remove members, change roles, workspace settings |
| `billing:manage` | Manage subscription (Admin only) |

---

## What AuthHub Is NOT

- ❌ Not Supabase Auth
- ❌ Not Firebase Auth
- ❌ Not NextAuth.js / Auth.js
- ❌ Not a hosted service you configure through a UI
- ❌ Not a library you import into VaultKit

It is a **separate deployed API** that VaultKit calls over HTTP.
All auth logic lives there. VaultKit has zero auth logic of its own —
it only validates tokens and resolves workspace context.

---

## ⚠️ AGENT CHECKLIST — Before Writing Auth Code

Before writing any auth-related code for VaultKit:

1. [ ] Open `https://authhub-npym.onrender.com/api/v1/docs` and read the actual endpoint definitions
2. [ ] Check `github.com/AmosQuety/AuthHub/tree/main/backend` for exact route paths and request shapes
3. [ ] Confirm the JWT payload fields (`sub`, `tenant_id`, `client_id`, `scope`) match what AuthHub actually issues
4. [ ] Confirm the JWKS endpoint URL
5. [ ] Confirm admin endpoint paths for tenant + client creation
6. [ ] Never guess endpoint paths — derive them from the actual code or docs
7. [ ] If the docs endpoint is down (Render free tier cold start), wait 30s and retry before assuming the path is wrong
