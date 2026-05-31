# Done

Completed tasks and notes
 
- [2026-05-31] Updated `NEXT_STEPS.md` to align with Phase 1 Agent Prompt and docs; consolidated actionable next steps and recorded design decisions (public clients + PKCE; web uses server `GET /auth/login`).

- [2026-05-31] Updated the workspace provisioning model for Phase 1 so VaultKit accepts pre-provisioned AuthHub credentials at workspace creation time instead of trying to create tenants programmatically.
	- Result: `POST /workspaces` now requires the AuthHub tenant ID, client ID, and client secret in the request body; the secret is stored server-side only.
	- Rationale: AuthHub does not expose a VaultKit-friendly provisioning token flow in Phase 1, so workspace creation now depends on manually created dashboard credentials.

- [2026-05-31] Recorded decisions moved from `NEXT_STEPS.md` to this `DONE.md` file.

- [2026-05-31] Ran targeted TypeScript checks for edited files in `@vaultkit/api` and validated the edits; captured full `tsc` output which shows unrelated repository-wide type and build issues.

- [2026-05-31] Mobile PKCE flow — Implemented
	✓ Implemented — `apps/mobile/src/lib/authhub.client.ts` calls server `GET /auth/login?workspace={slug}`, opens the AuthHub redirect with `expo-linking`, and posts back to `GET /auth/callback?code&state`; tokens stored in `expo-secure-store` via `apps/mobile/src/lib/storage.ts`.
	✓ TypeScript support — added ambient declaration files for the mobile JSX/runtime gaps so the package-level strict typecheck passes without `any` in the files we introduced.
	✓ Validation — `pnpm --filter @vaultkit/mobile exec tsc -p tsconfig.json --noEmit` passes.

Notes:
- The full `tsc` run reported 60 type errors across multiple modules unrelated to the auth edits; investigation is in progress.

- [2026-05-31] Web token storage & refresh — Implemented (Task 2)
	✓ Implemented — Web tokens are now stored in HTTP-only cookies set by `GET /auth/callback` and rotated by `POST /auth/refresh` (cookies: `vaultkit_access`, `vaultkit_refresh`).
	✓ Implemented — `apps/web/src/lib/authSession.ts` stores only non-sensitive session metadata (`clientId`) in `sessionStorage`; token material is HttpOnly and not accessible to JS.
	✓ Implemented — `apps/web/src/lib/api.client.ts` now sends requests with `credentials: 'include'` and relies on server-side cookie authentication; it attempts a `POST /auth/refresh` on 401 to rotate cookies.
	✓ Validation — `pnpm --filter @vaultkit/web exec tsc -p tsconfig.json --noEmit` passes for the web package.

- [2026-05-31] PKCE lifecycle hardening — Implemented (Task 3)
	✓ Implemented — Increased PKCE CSRF state TTL from 60s to 5 minutes and added state metadata and logging in `services/api/src/modules/auth/router.ts`.
	✓ Implemented — Deferred deletion of the Redis `csrf:{state}` key until the authorization code exchange succeeds (single-use delete post-success), and return a helpful `restartUrl` when state is missing.
	✓ Validation — `pnpm --filter @vaultkit/api exec tsc -p tsconfig.json --noEmit` reports no errors for the API package.

- [2026-05-31] Docs: Update `AUTHHUB_REFERENCE.md` — Implemented (Task 4)
	✓ Implemented — `docs/Vaultkit  AUTHHUB_REFERENCE.md` updated to document the PKCE public-client pattern, the server-side code→token exchange that sets HttpOnly cookies, the Redis PKCE state TTL change (60s → 5min), and the deferred delete behavior.
	✓ Note — Added guidance for client-side code to use `credentials: 'include'`, and reminders about CORS/secure cookie configuration for deployments.

- [2026-05-31] Tests: Provisioning, login redirect, and callback/token-exchange coverage — Implemented (Task 5)
	✓ Implemented — Added `services/api/test/workspace-provisioning.test.js` to cover workspace provisioning, the PKCE login redirect, and the `/auth/callback` code→token exchange path.
	✓ Validation — `pnpm --filter @vaultkit/api test` passes for the current harness.

