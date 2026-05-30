# VaultKit — API Design
> REST + GraphQL | Version 1.0
> Base URL: https://api.vaultkit.app/api/v1

---

## Design Principles

1. **Idempotency-Key required** on all POST/PUT/DELETE — reject 400 if missing
2. **Cursor-based pagination** — never offset-based
3. **Mobile-first payloads** — only return fields the screen needs
4. **Consistent error format** across all endpoints
5. **Pre-signed URLs** for all file access — never direct storage links
6. **Scope-gated** — token scopes enforced per endpoint

---

## Authentication

All endpoints (except `/auth/*` and `/s/:token`) require:

```http
Authorization: Bearer <access_token>
X-Workspace-ID: <workspace_id>
Idempotency-Key: <uuid>       (on mutating requests only)
```

Token is validated against AuthHub JWKS endpoint on every request.

---

## Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "cursor": "...",
    "hasMore": true,
    "total": 120
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "You need files:delete scope to perform this action",
    "status": 403
  }
}
```

---

## Error Codes

| Code | Status | Meaning |
|---|---|---|
| `MISSING_IDEMPOTENCY_KEY` | 400 | Idempotency-Key header not provided |
| `MISSING_WORKSPACE` | 400 | X-Workspace-ID not provided |
| `INVALID_TOKEN` | 401 | JWT invalid or expired |
| `NOT_A_MEMBER` | 403 | User is not a member of this workspace |
| `INSUFFICIENT_PERMISSION` | 403 | Role or scope insufficient |
| `RESOURCE_NOT_FOUND` | 404 | Asset/collection/link not found |
| `QUOTA_EXCEEDED` | 409 | Workspace storage quota exceeded |
| `CONFLICT` | 409 | Version conflict on asset write |
| `LINK_EXPIRED` | 410 | Share link has expired |
| `LINK_REVOKED` | 410 | Share link was revoked |
| `RATE_LIMITED` | 429 | Too many requests |

---

## REST Endpoints

---

### Workspaces

#### `POST /workspaces`
Create a new workspace. Registers a new AuthHub tenant automatically.

**Required scope**: authenticated (no workspace scope needed — this creates one)

**Request:**
```json
{
  "name": "Agency Alpha",
  "slug": "agency-alpha"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "wsp_...",
    "name": "Agency Alpha",
    "slug": "agency-alpha",
    "authhub_client_id": "abc123",
    "plan": "free",
    "storage_quota_bytes": 2147483648,
    "storage_used_bytes": 0,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

#### `GET /workspaces/:id`
Get workspace details. Member only.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "wsp_...",
    "name": "Agency Alpha",
    "slug": "agency-alpha",
    "plan": "pro",
    "storage_quota_bytes": 53687091200,
    "storage_used_bytes": 10737418240,
    "storage_used_percent": 20,
    "member_count": 8
  }
}
```

---

#### `POST /workspaces/:id/members/invite`
Invite a user to the workspace by email.

**Required scope**: `workspace:manage` | **Required role**: admin

**Request:**
```json
{
  "email": "designer@agency.co",
  "role": "editor"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "invite_id": "inv_...",
    "email": "designer@agency.co",
    "role": "editor",
    "expires_at": "2025-01-08T00:00:00Z"
  }
}
```

---

#### `PATCH /workspaces/:id/members/:member_id`
Update a member's role.

**Required scope**: `workspace:manage` | **Required role**: admin

**Request:**
```json
{ "role": "viewer" }
```

---

#### `DELETE /workspaces/:id/members/:member_id`
Remove a member from the workspace.

**Required scope**: `workspace:manage` | **Required role**: admin

---

### Collections (Folders)

#### `POST /collections`
Create a new folder.

**Required scope**: `files:upload` | **Required role**: editor, admin

**Request:**
```json
{
  "name": "Acme Campaign Q1",
  "parent_id": null
}
```

---

#### `GET /collections`
List root collections in workspace. Cursor paginated.

**Query params**: `cursor`, `limit` (default 20, max 100)

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "col_...",
      "name": "Clients",
      "path": "/clients",
      "asset_count": 45,
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": { "cursor": "col_xyz", "hasMore": true }
}
```

---

#### `GET /collections/:id/assets`
List assets inside a collection. Cursor paginated.

**Query params**: `cursor`, `limit`, `sort` (name|created_at|size|updated_at), `order` (asc|desc), `type` (image|video|document|audio)

**Response `200`** — mobile-optimized payload:
```json
{
  "success": true,
  "data": [
    {
      "id": "ast_...",
      "name": "hero-banner-v3.jpg",
      "file_type": "image/jpeg",
      "size_bytes": 2457600,
      "version_number": 3,
      "approval_status": "pending",
      "blur_hash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
      "previews": {
        "sm": "https://cdn.vaultkit.app/...",
        "md": "https://cdn.vaultkit.app/..."
      },
      "uploaded_by": { "id": "mem_...", "name": "Amos N." },
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": { "cursor": "ast_xyz", "hasMore": false, "total": 12 }
}
```

---

### Assets

#### `POST /assets/upload/init`
Initiate a chunked upload session.

**Required scope**: `files:upload` | **Required role**: editor, admin

**Request:**
```json
{
  "filename": "campaign-video.mp4",
  "file_type": "video/mp4",
  "size_bytes": 52428800,
  "total_chunks": 100,
  "collection_id": "col_...",
  "content_hash": "sha256:abc123..."
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "session_id": "ups_...",
    "chunk_size_bytes": 524288,
    "total_chunks": 100,
    "uploaded_chunks": 0,
    "expires_at": "2025-01-02T00:00:00Z"
  }
}
```

---

#### `PUT /assets/upload/:session_id/chunk/:index`
Upload a single chunk. Binary body.

**Headers:**
```http
Content-Type: application/octet-stream
Content-Length: 524288
X-Chunk-Checksum: md5:abc123
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "chunk_index": 5,
    "uploaded_chunks": 6,
    "total_chunks": 100,
    "percent": 6
  }
}
```

---

#### `POST /assets/upload/:session_id/complete`
Finalize the upload after all chunks sent.

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "asset_id": "ast_...",
    "name": "campaign-video.mp4",
    "status": "processing",
    "message": "Your file is processing. You'll be notified when it's ready."
  }
}
```

---

#### `GET /assets/:id`
Get full asset details including all versions and previews.

**Required scope**: `files:read`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "ast_...",
    "name": "hero-banner.jpg",
    "file_type": "image/jpeg",
    "size_bytes": 2457600,
    "content_hash": "sha256:abc123",
    "version_number": 3,
    "status": "ready",
    "approval_status": "approved",
    "blur_hash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
    "previews": {
      "sm": "https://cdn.vaultkit.app/...",
      "md": "https://cdn.vaultkit.app/...",
      "lg": "https://cdn.vaultkit.app/..."
    },
    "download_url": "https://r2.vaultkit.app/signed/...",  // pre-signed, 1hr
    "download_url_expires_at": "2025-01-01T01:00:00Z",
    "versions": [
      { "version_number": 3, "size_bytes": 2457600, "created_at": "..." },
      { "version_number": 2, "size_bytes": 1900000, "created_at": "..." }
    ],
    "tags": ["acme", "campaign", "q1"],
    "uploaded_by": { "id": "mem_...", "name": "Amos N." },
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

#### `PATCH /assets/:id`
Update asset metadata.

**Required scope**: `files:upload` | **Required role**: editor, admin

**Request:**
```json
{
  "name": "hero-banner-final.jpg",
  "collection_id": "col_...",
  "tags": ["acme", "final"]
}
```

**Conflict detection** — include `version_number` to detect stale writes:
```json
{
  "name": "updated-name.jpg",
  "version_number": 2    // if server has v3, returns 409 CONFLICT
}
```

---

#### `DELETE /assets/:id`
Soft-delete an asset.

**Required scope**: `files:delete` | **Required role**: editor (own files), admin (any)

---

#### `GET /assets/:id/presign`
Generate a fresh pre-signed download URL. Useful when existing URL expires.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "url": "https://r2.vaultkit.app/signed/...",
    "expires_at": "2025-01-01T01:00:00Z"
  }
}
```

---

### Share Links

#### `POST /share`
Create a share link for an asset or collection.

**Required scope**: `files:read` | **Required role**: editor, admin

**Request:**
```json
{
  "asset_id": "ast_...",
  "permission": "download",
  "expires_in": "24h",
  "password": "mypassword123",
  "is_whatsapp": true,
  "single_use": false
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "lnk_...",
    "token": "xyz789abc",
    "url": "https://vaultkit.app/s/xyz789abc",
    "whatsapp_url": "https://wa.me/?text=Review+this+file+https%3A%2F%2Fvaultkit.app%2Fs%2Fxyz789abc",
    "permission": "download",
    "expires_at": "2025-01-02T00:00:00Z",
    "password_protected": true
  }
}
```

---

#### `GET /s/:token` (Public — no auth)
Access a share link. Returns approval view data.

**Query param**: `password` (if password protected)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "asset": {
      "name": "hero-banner.jpg",
      "file_type": "image/jpeg",
      "size_bytes": 2457600,
      "blur_hash": "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
      "preview_url": "https://r2.vaultkit.app/signed/...",  // low-res, 1hr
      "download_url": null   // null if permission is 'view'
    },
    "workspace": { "name": "Agency Alpha" },
    "permission": "view",
    "is_whatsapp": true,
    "approval_status": "pending"
  }
}
```

---

#### `POST /s/:token/action` (Public — no auth)
Submit client approval or revision request.

**Request:**
```json
{
  "action": "revision_requested",
  "note": "Please change the font to something bolder"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Your response has been sent to Agency Alpha."
  }
}
```

---

#### `DELETE /share/:id`
Revoke a share link immediately.

**Required role**: creator of link or admin

---

### Notifications

#### `GET /notifications`
Get unread notifications for current member.

**Query params**: `cursor`, `limit` (default 20), `unread_only` (boolean)

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ntf_...",
      "type": "approval",
      "title": "Client approved your file",
      "body": "hero-banner.jpg was approved",
      "asset_id": "ast_...",
      "read_at": null,
      "created_at": "..."
    }
  ]
}
```

---

#### `POST /notifications/read`
Mark notifications as read.

**Request:**
```json
{ "notification_ids": ["ntf_...", "ntf_..."] }
```

---

## GraphQL API

Used for complex relational queries where REST would require multiple round trips — particularly on mobile.

**Endpoint**: `POST /graphql`

**Example — workspace overview (single request):**
```graphql
query WorkspaceDashboard($workspaceId: ID!, $cursor: String) {
  workspace(id: $workspaceId) {
    id
    name
    storageUsedPercent
    memberCount

    recentAssets(first: 10, after: $cursor) {
      edges {
        node {
          id
          name
          blurHash
          previews { sm md }
          approvalStatus
          uploadedBy { name avatarUrl }
          updatedAt
        }
      }
      pageInfo { endCursor hasNextPage }
    }

    pendingApprovals {
      id
      name
      blurHash
      previews { sm }
      shareLinks { url expiresAt }
    }
  }
}
```

**Example — asset search:**
```graphql
query SearchAssets($workspaceId: ID!, $query: String!, $tags: [String!]) {
  searchAssets(workspaceId: $workspaceId, query: $query, tags: $tags) {
    id
    name
    fileType
    blurHash
    previews { sm }
    collection { name path }
    approvalStatus
  }
}
```

---

## Webhooks

VaultKit can send webhooks to external systems (e.g., notify a CRM when a client approves).

**Events:**
```
asset.approved
asset.revision_requested
asset.uploaded
member.joined
share_link.accessed
```

**Payload:**
```json
{
  "event": "asset.approved",
  "workspace_id": "wsp_...",
  "timestamp": "2025-01-01T00:00:00Z",
  "data": {
    "asset_id": "ast_...",
    "asset_name": "hero-banner.jpg",
    "share_link_id": "lnk_...",
    "client_note": null
  }
}
```

Webhook requests include `X-VaultKit-Signature` HMAC header for verification.

---

## Rate Limits

| Endpoint | Free | Pro | Agency |
|---|---|---|---|
| Global (all requests) | 300 req/min | 600 req/min | 2000 req/min |
| Upload init | 50/min | 200/min | 500/min |
| Share link creation | 20/min | 100/min | 300/min |
| Presign generation | 60/min | 300/min | 1000/min |

Rate limit headers returned on every response:
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 247
X-RateLimit-Reset: 1704067260
```
