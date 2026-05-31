# Next Steps

Summary — alignment with Phase 1 Agent Prompt and docs

- VaultKit's AuthHub provisioner and auth routes were updated to use the AuthHub developer API endpoints (`/api/v1/developer/clients`), to register workspace users via `/api/v1/auth/register`, and to implement PKCE (code_challenge on authorize, code_verifier on token exchange).
- Server now accepts `AUTHHUB_DEVELOPER_ACCESS_TOKEN` (falls back to `AUTHHUB_ADMIN_TOKEN`) and uses Redis to store short-lived CSRF + PKCE verifier state for the authorization flow.
- These changes were implemented to follow the Phase 1 constraints in `docs/Vaultkit AGENT_PROMPT_PHASE1.md`: Auth is delegated to AuthHub, VaultKit integrates via AuthHub APIs, and we avoid embedding auth provider logic in VaultKit itself.

Files of interest (edited):
- `services/api/src/modules/auth/authhub.client.ts`
- `services/api/src/modules/auth/router.ts`
- `services/api/src/modules/workspaces/authhub.provisioner.ts`
- `services/api/src/modules/workspaces/workspace.service.ts`
- `packages/shared/src/types/auth.types.ts`
- `services/api/src/config.ts`
- `apps/web/src/pages/auth/Login.tsx`
- `apps/web/src/pages/auth/Callback.tsx`


Actionable next steps (aligned to Phase 1 scope and docs)

1. Wire the web login flow and callback (completed — moved to [DONE.md](DONE.md))

2. Token storage & refresh (web) — next up
	- Production strategy: we implemented HTTP-only cookies for token storage in `GET /auth/callback` and rotation in `POST /auth/refresh`.
	- Client changes: web client now sends requests with `credentials: 'include'` and stores only `clientId` in `sessionStorage` (no JS-accessible tokens).
	- Next: update docs and test E2E flows with secure cookies (ensure `config.webAppUrl` and CORS credentials are correct in deployed env).

3. PKCE lifecycle hardening — completed
	- Change: PKCE CSRF state TTL increased from 60s → 5 minutes to allow for slower client flows and retries.
	- Change: `csrf:{state}` is now deleted only after a successful code exchange (single-use delete deferred), and the callback returns a `restartUrl` when state is missing to aid UX.

4. Docs update — completed
		- `docs/Vaultkit  AUTHHUB_REFERENCE.md` updated to reflect:
			- PKCE public-client pattern (no client_secret in browser/mobile clients).
			- Server-side code→token exchange that sets HttpOnly cookies (`vaultkit_access`, `vaultkit_refresh`).
			- Redis PKCE state TTL increased (60s → 5 minutes) and deferred delete on successful exchange.
			- Client requirements: `fetch(..., { credentials: 'include' })`, CORS `credentials: true`, and `Secure` cookies in production.

5. Decide client confidentiality policy (design decision)
		- Decide whether VaultKit will store confidential client secrets. If not, continue using public clients + PKCE (recommended for Phase 1). If yes, add secure secret storage and update `authhub.provisioner.ts` to persist `client_secret` only when needed.

6. Phase 2 AuthHub provisioning
	- Implement programmatic AuthHub provisioning using a dedicated service account JWT — requires AuthHub to support M2M login or a separate provisioning token.

3. Decide client confidentiality policy (design decision)
	- Decide whether VaultKit will store confidential client secrets. If not, continue using public clients + PKCE (recommended for Phase 1). If yes, add secure secret storage and update `authhub.provisioner.ts` to persist `client_secret` only when needed.


E2E Verification (attempted)
---------------------------------
- What I ran: retried workspace creation with the pre-provisioned AuthHub credentials, then attempted the login redirect flow.
- Result: Workspace creation succeeded. The login redirect did not complete because the API connection to Redis was reset while trying to store PKCE state.

Observed errors / blockers
- POST `/auth/login?workspace=e2e-test` failed with `curl: (56) Recv failure: Connection was reset`.
- The login handler writes PKCE state to Redis before redirecting, so a Redis reset blocks the redirect and the callback/cookie steps cannot run yet.

Possible causes
- Redis connectivity / availability issue in the running API process.
- The local API process may need a clean restart after Redis recovers.

Recommended next steps to unblock E2E
 1. Verify Redis connectivity, then retry `GET /auth/login?workspace=e2e-test`.
 2. If Redis is healthy, re-run the redirect/callback flow and confirm the `vaultkit_access` and `vaultkit_refresh` cookies are returned.
 3. If the API still resets the connection, restart the API process so it reconnects to Redis.
 4. Re-run workspace create only if the workspace needs to be recreated; the current workspace record already exists.

After resolving the AuthHub token or availability issue, re-run the E2E sequence:
	- `GET /auth/login?workspace={slug}` → verify redirect URL includes `code_challenge`
	- Complete AuthHub login (manual) → verify `GET /auth/callback` returns `Set-Cookie` headers
	- Make authenticated request to a protected endpoint (e.g., `GET /workspaces/:id` with cookies) → expect 200
4. Documentation and compliance with required reading (always do before changing behavior)
	- Update `docs/Vaultkit  AUTHHUB_REFERENCE.md` and other docs that reference the old admin tenant APIs so they reflect the developer-client + `/auth/register` pattern used now.

5. Tests and verification
	- Completed — API tests now cover workspace provisioning, the PKCE login redirect flow, and the `/auth/callback` code→token exchange path.
	- Validation — `pnpm --filter @vaultkit/api test` passes.
	- Follow-up — re-run the live E2E sequence only if Redis connectivity is restored in the running API process.

6. Token storage and UX
	- Decide and implement secure client-side token storage for web (HTTP-only cookie vs secure local storage wrapper + refresh logic). For Phase 1, storing tokens in localStorage is acceptable for a prototype but document limitations.

7. PKCE lifecycle and error handling
	- Harden handling for expired or missing `csrf:{state}` entries (60s TTL): add retry UX and redis cleanup on failures.

8. Build / CI hygiene
	- Investigate and fix the repository TypeScript build issue (TS5055 outDir overwrite) so CI can build. This is now the next active task.



Completed tasks have been moved to [DONE.md](DONE.md).

Validation notes

- Targeted type checks passed for the edited files.
- API test coverage was added and now passes with `pnpm --filter @vaultkit/api test`.
- Full package build currently fails due to an unrelated TypeScript outDir overwrite issue; fixing that is required for CI and full release.




Not yet done / pending

End-to-end verification: Live AuthHub E2E test (web login → AuthHub → callback → server token exchange) not run — requires valid AuthHub credentials and a healthy Redis path.
Token storage & refresh UX: Decide/implement secure client-side storage and refresh flows (web/mobile).
PKCE lifecycle hardening: Retry/UX for expired or missing csrf:{state} (60s TTL) not implemented.
Automated tests: Provisioning, login redirect, and callback/token exchange coverage are added and passing.
Docs update: docs/Vaultkit AUTHHUB_REFERENCE.md and other docs still need the new patterns written in.
Client confidentiality decision: Whether to persist confidential client secrets (design decision) — not decided/implemented.
Repo-level build hygiene: TS5055 outDir collisions / CI build setup still needs final resolution across monorepo (next task).
Run/dev readiness: I attempted pnpm --filter @vaultkit/api dev but it exited (likely missing .env, DB, or Redis). Migrations/seeds and starting services remain to be run to fully exercise the app.
