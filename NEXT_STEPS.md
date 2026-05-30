# Next Steps

Start here next time:

1. Fix the remaining repo-wide TypeScript/build issues only if you need a full monorepo build.
2. Otherwise, run the API locally and smoke-test workspace creation against the live Neon database.
3. Verify the workspace flow still does this in order: provision AuthHub tenant, create workspace row, create first admin member.
4. If you need the setup commands, use `pnpm install`, `pnpm --filter @vaultkit/api dev`, and `pnpm --filter @vaultkit/api migrate`.
5. Keep using the single root `.env` file; do not add service-specific env files.

Current known state:

- Neon migrations are applied successfully.
- The API migration runner reads the root `.env` file.
- Workspace tenant provisioning is routed through `services/api/src/modules/workspaces/authhub.provisioner.ts`.
- The repo still has unrelated build-time TypeScript errors outside the workspace flow.