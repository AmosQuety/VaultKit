import { createPublicKey, verify } from 'crypto';
import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, isNull } from 'drizzle-orm';
import { config } from '../config';
import db from '../db/client';
import { workspaces, workspace_members } from '../db/schema';
import { AuthScope, UserRole } from '@vaultkit/shared';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: {
      userId: string;
      email: string;
      scopes: AuthScope[];
      workspace: {
        id: string;
        name: string;
        slug: string;
        authhub_tenant_id: string;
        authhub_client_id: string;
        storage_used_bytes: number;
        storage_quota_bytes: number;
        plan: string;
        logo_url?: string | null;
      };
      member: {
        id: string;
        role: UserRole;
        display_name?: string | null;
        avatar_url?: string | null;
      };
    };
  }
}

interface JwtHeader {
  alg: string;
  kid: string;
}

interface Jwk {
  kty: string;
  kid: string;
  n?: string;
  e?: string;
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

let cachedJwks: Jwk[] | null = null;
let lastJwksFetch = 0;
const JWKS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function loadJwks(): Promise<Jwk[]> {
  const now = Date.now();
  if (cachedJwks && (now - lastJwksFetch) < JWKS_CACHE_TTL) {
    return cachedJwks;
  }

  const response = await fetch(config.authhubJwksUrl);
  if (!response.ok) {
    if (cachedJwks) {
      console.warn(`Failed to fetch JWKS from AuthHub. Falling back to cached keys. Status: ${response.status}`);
      return cachedJwks;
    }
    throw new Error(`Unable to fetch AuthHub JWKS: ${response.status}`);
  }

  const payload = (await response.json()) as { keys?: Jwk[] };
  cachedJwks = payload.keys ?? [];
  lastJwksFetch = now;
  return cachedJwks;
}

async function verifyJwt(token: string): Promise<Record<string, unknown>> {
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  if (!headerPart || !payloadPart || !signaturePart) {
    throw new Error('Invalid JWT format');
  }

  const header = JSON.parse(base64UrlDecode(headerPart).toString('utf8')) as JwtHeader;
  const jwks = await loadJwks();
  const jwk = jwks.find((key) => key.kid === header.kid);
  if (!jwk) {
    throw new Error('Signing key not found');
  }

  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const signedData = Buffer.from(`${headerPart}.${payloadPart}`);
  const signature = base64UrlDecode(signaturePart);
  const isValid = verify('RSA-SHA256', signedData, publicKey, signature);
  if (!isValid) {
    throw new Error('JWT signature verification failed');
  }

  const decodedPayload = JSON.parse(base64UrlDecode(payloadPart).toString('utf8')) as Record<string, any>;
  
  // Verify expiration
  if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
    throw new Error('JWT token expired');
  }

  return decodedPayload;
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authorization = request.headers.authorization;
  if (!authorization || Array.isArray(authorization) || !authorization.startsWith('Bearer ')) {
    reply.status(401).send({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Missing bearer token', status: 401 }
    });
    return;
  }

  try {
    const token = authorization.slice('Bearer '.length);
    const payload = await verifyJwt(token);
    
    const clientId = payload.client_id ? String(payload.client_id) : undefined;
    if (!clientId) {
      reply.status(400).send({
        success: false,
        error: { code: 'MISSING_WORKSPACE', message: 'Client ID is missing in token', status: 400 }
      });
      return;
    }

    // 1. Resolve Workspace
    const resolvedWorkspaces = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.authhub_client_id, clientId), isNull(workspaces.deleted_at)))
      .limit(1);

    if (resolvedWorkspaces.length === 0) {
      reply.status(404).send({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Workspace tenant not found', status: 404 }
      });
      return;
    }

    const workspace = resolvedWorkspaces[0];

    // 2. Resolve Workspace Member
    const resolvedMembers = await db
      .select()
      .from(workspace_members)
      .where(
        and(
          eq(workspace_members.workspace_id, workspace.id),
          eq(workspace_members.authhub_user_id, String(payload.sub)),
          isNull(workspace_members.deleted_at)
        )
      )
      .limit(1);

    if (resolvedMembers.length === 0) {
      reply.status(403).send({
        success: false,
        error: { code: 'NOT_A_MEMBER', message: 'You are not a member of this workspace', status: 403 }
      });
      return;
    }

    const member = resolvedMembers[0];
    
    // Parse scopes
    const scopeString = String(payload.scope ?? '');
    const scopes = scopeString.split(' ').filter(Boolean) as AuthScope[];

    // Attach credentials context to request
    request.auth = {
      userId: String(payload.sub),
      email: String(payload.email ?? ''),
      scopes,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        authhub_tenant_id: workspace.authhub_tenant_id,
        authhub_client_id: workspace.authhub_client_id,
        storage_used_bytes: workspace.storage_used_bytes,
        storage_quota_bytes: workspace.storage_quota_bytes,
        plan: workspace.plan,
        logo_url: workspace.logo_url
      },
      member: {
        id: member.id,
        role: member.role as UserRole,
        display_name: member.display_name,
        avatar_url: member.avatar_url
      }
    };

  } catch (err: any) {
    reply.status(401).send({
      success: false,
      error: { code: 'INVALID_TOKEN', message: err.message || 'JWT invalid or expired', status: 401 }
    });
  }
}

export function requireScope(requiredScope: AuthScope) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth || !request.auth.scopes.includes(requiredScope)) {
      reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSION',
          message: `Requires scope: ${requiredScope}`,
          status: 403
        }
      });
    }
  };
}

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth || !roles.includes(request.auth.member.role)) {
      reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSION',
          message: `Requires role: ${roles.join(' or ')}`,
          status: 403
        }
      });
    }
  };
}