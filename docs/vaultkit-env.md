# VaultKit — Environment Variables Reference
> Copy this to .env.local and fill in real values before running anything.
> Never commit real values to git.

---

## services/api/.env

```env
# ─────────────────────────────────────────────
# SERVER
# ─────────────────────────────────────────────
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# ─────────────────────────────────────────────
# DATABASE — Neon PostgreSQL
# ─────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/vaultkit?sslmode=require
DATABASE_POOL_SIZE=10

# ─────────────────────────────────────────────
# REDIS — Upstash or Railway Redis
# ─────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
# For Upstash: rediss://default:xxxxx@xxx.upstash.io:6379

# ─────────────────────────────────────────────
# AUTHHUB — Your custom OIDC provider
# ─────────────────────────────────────────────
AUTHHUB_BASE_URL=https://authhub-npym.onrender.com/api/v1
AUTHHUB_JWKS_URL=https://authhub-npym.onrender.com/api/v1/.well-known/jwks.json
AUTHHUB_ADMIN_TOKEN=your_admin_token_here

# VaultKit's own OAuth client (for dashboard login)
AUTHHUB_DASHBOARD_CLIENT_ID=vaultkit-dashboard-client-id
AUTHHUB_DASHBOARD_CLIENT_SECRET=vaultkit-dashboard-client-secret

# ─────────────────────────────────────────────
# STORAGE — Cloudflare R2
# ─────────────────────────────────────────────
STORAGE_PROVIDER=r2                             # r2 | s3 | local
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=vaultkit-assets
R2_PUBLIC_URL=https://cdn.vaultkit.app         # Cloudflare CDN URL for thumbnails

# ─────────────────────────────────────────────
# FRONTEND URLS (for CORS + redirects)
# ─────────────────────────────────────────────
WEB_APP_URL=http://localhost:5173
MOBILE_REDIRECT_URI=vaultkit://auth/callback

# ─────────────────────────────────────────────
# SECURITY
# ─────────────────────────────────────────────
JWT_SECRET=a_very_long_random_secret_for_signing_internal_tokens
WEBHOOK_SECRET=secret_for_signing_outgoing_webhooks

# ─────────────────────────────────────────────
# RATE LIMITING
# ─────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_FREE=300
RATE_LIMIT_MAX_PRO=600

# ─────────────────────────────────────────────
# NOTIFICATIONS (push)
# ─────────────────────────────────────────────
EXPO_PUSH_ACCESS_TOKEN=your_expo_push_token    # For React Native push notifications

# ─────────────────────────────────────────────
# PAYMENTS
# ─────────────────────────────────────────────
MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
MTN_MOMO_SUBSCRIPTION_KEY=your_mtn_subscription_key
MTN_MOMO_API_USER=your_api_user_id
MTN_MOMO_API_KEY=your_api_key
MTN_MOMO_ENVIRONMENT=sandbox                   # sandbox | production

AIRTEL_MONEY_BASE_URL=https://openapi.airtel.africa
AIRTEL_MONEY_CLIENT_ID=your_airtel_client_id
AIRTEL_MONEY_CLIENT_SECRET=your_airtel_secret
AIRTEL_MONEY_COUNTRY=UG
AIRTEL_MONEY_CURRENCY=UGX

STRIPE_SECRET_KEY=sk_test_xxx                  # Card payment fallback

# ─────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────
LOG_LEVEL=info                                 # debug | info | warn | error
```

---

## services/workers/.env

```env
NODE_ENV=development

# Same Neon DB as API
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/vaultkit?sslmode=require

# Same Redis as API
REDIS_URL=redis://localhost:6379

# Same R2 as API
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=vaultkit-assets

# AuthHub — workers use Client Credentials, not user tokens
AUTHHUB_BASE_URL=https://authhub-npym.onrender.com/api/v1

# Worker concurrency
WORKER_CONCURRENCY=5                           # Max parallel jobs per worker instance
THUMBNAIL_QUALITY=85                           # WebP quality 0-100
```

---

## apps/web/.env

```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_AUTHHUB_BASE_URL=https://authhub-npym.onrender.com/api/v1
VITE_AUTHHUB_DASHBOARD_CLIENT_ID=vaultkit-dashboard-client-id
VITE_REDIRECT_URI=http://localhost:5173/auth/callback
```

---

## apps/mobile/.env (via app.config.js extra)

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
EXPO_PUBLIC_AUTHHUB_BASE_URL=https://authhub-npym.onrender.com/api/v1
EXPO_PUBLIC_REDIRECT_URI=vaultkit://auth/callback
```

---

## Production checklist before deployment

- [ ] `NODE_ENV=production` on all services
- [ ] All `*_SECRET` and `*_KEY` values rotated from dev values
- [ ] `DATABASE_URL` points to production Neon branch (not dev branch)
- [ ] `R2_BUCKET_NAME` is the production bucket (separate from dev)
- [ ] `AUTHHUB_BASE_URL` confirmed reachable from Railway (check Render cold-start)
- [ ] `MTN_MOMO_ENVIRONMENT=production` (not sandbox)
- [ ] `STRIPE_SECRET_KEY` is `sk_live_xxx` (not `sk_test_xxx`)
- [ ] `LOG_LEVEL=warn` or `error` in production (not `debug`)
- [ ] All values stored in Railway environment variables (not `.env` files in repo)
