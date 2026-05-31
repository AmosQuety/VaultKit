// Local wrapper to load zod at runtime while keeping TypeScript happy
// This intentionally uses `require` and exports `z` as `any` to avoid type declaration mismatches across environments.
// If you prefer proper typings, replace usages with direct 'import { z } from "zod"' and ensure dependencies/types align.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const zod = require('zod');
export const z: any = zod;
