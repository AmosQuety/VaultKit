import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from '../../lib/zod';
import crypto from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { config } from '../../config';
import db from '../../db/client';
import { workspaces } from '../../db/schema';
import redis from '../../lib/redis';
import {
  buildAuthorizeUrl,
  createPkcePair,
  exchangeAuthorizationCode,
  refreshAccessToken
} from './authhub.client';
import { validateBody } from '../../middleware/validate.middleware';

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().optional()
});

const logoutSchema = z.object({
  refreshToken: z.string().optional()
});

export async function authRoutes(app: FastifyInstance) {
  // GET /auth/login?workspace=<slug>
  app.get<{ Querystring: { workspace?: string } }>('/auth/login', async (request, reply: FastifyReply) => {
    const slug = (request.query as any).workspace as string | undefined;
    if (!slug) {
      reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Query parameter "workspace" (slug) is required', status: 400 }
      });
      return;
    }

    const resolved = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.slug, slug), isNull(workspaces.deleted_at)))
      .limit(1);

    if (resolved.length === 0) {
      reply.status(404).send({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Workspace not found', status: 404 }
      });
      return;
    }

    const workspace = resolved[0];
    const state = crypto.randomBytes(16).toString('hex');
    const pkce = createPkcePair();

    // Store CSRF state and PKCE verifier in Redis (5 minute TTL) mapped to the workspace ID
    const statePayload = { workspaceId: workspace.id, codeVerifier: pkce.codeVerifier, issuedAt: Date.now(), attempts: 0 };
    await redis.set(`csrf:${state}`, JSON.stringify(statePayload), 'EX', 60 * 5);
    app.log.info({ state, workspace: workspace.id }, 'PKCE state created');

    const authorizeUrl = buildAuthorizeUrl({
      clientId: workspace.authhub_client_id,
      redirectUri: `${config.webAppUrl}/auth/callback`,
      scope: 'openid profile email files:read files:upload files:delete workspace:manage',
      state,
      codeChallenge: pkce.codeChallenge
    });

    reply.redirect(authorizeUrl);
  });

  // GET /auth/callback?code=...&state=...
  app.get<{ Querystring: { code?: string; state?: string } }>('/auth/callback', async (request, reply: FastifyReply) => {
    const { code, state } = request.query as any;
    if (!code || !state) {
      reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing code or state query parameters', status: 400 }
      });
      return;
    }

    // Verify CSRF state exists in Redis
    const stateData = await redis.get(`csrf:${state}`);
    if (!stateData) {
      // Provide a clear restart URL so the client can re-initiate login
      reply.status(400).send({
        success: false,
        error: { code: 'CSRF_STATE_EXPIRED', message: 'CSRF state missing or expired', status: 400 },
        data: { restartUrl: `${config.webAppUrl}/login` }
      });
      return;
    }

    let workspaceId: string;
    let codeVerifier: string;
    try {
      const parsed = JSON.parse(stateData) as { workspaceId?: string; codeVerifier?: string };
      workspaceId = parsed.workspaceId ?? '';
      codeVerifier = parsed.codeVerifier ?? '';
    } catch {
      workspaceId = stateData;
      codeVerifier = '';
    }

    if (!workspaceId || !codeVerifier) {
      reply.status(400).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'PKCE state payload missing', status: 400 }
      });
      return;
    }

    // Look up the workspace credentials
    const resolved = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), isNull(workspaces.deleted_at)))
      .limit(1);

    if (resolved.length === 0) {
      reply.status(404).send({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Workspace not found for callback exchange', status: 404 }
      });
      return;
    }

    const workspace = resolved[0];

    try {
      // Exchange code for OIDC tokens
      const tokenResponse = await exchangeAuthorizationCode({
        code,
        clientId: workspace.authhub_client_id,
        redirectUri: `${config.webAppUrl}/auth/callback`,
        codeVerifier
      });

      // Helper to serialize cookies
      function serializeCookie(name: string, value: string | undefined, opts: { httpOnly?: boolean; secure?: boolean; sameSite?: string; path?: string; maxAge?: number | undefined }) {
        if (!value) return '';
        let str = `${name}=${encodeURIComponent(value)}`;
        if (opts.maxAge !== undefined) str += `; Max-Age=${opts.maxAge}`;
        if (opts.httpOnly) str += '; HttpOnly';
        if (opts.secure) str += '; Secure';
        if (opts.sameSite) str += `; SameSite=${opts.sameSite}`;
        if (opts.path) str += `; Path=${opts.path}`;
        return str;
      }

      const accessMaxAge = typeof tokenResponse.expires_in === 'number' ? tokenResponse.expires_in : undefined;
      const refreshMaxAge = 60 * 60 * 24 * 30; // 30 days
      const cookies: string[] = [];
      const secureCookie = config.nodeEnv !== 'development';
      cookies.push(serializeCookie('vaultkit_access', tokenResponse.access_token, { httpOnly: true, secure: secureCookie, sameSite: 'Lax', path: '/', maxAge: accessMaxAge }));
      cookies.push(serializeCookie('vaultkit_refresh', tokenResponse.refresh_token, { httpOnly: true, secure: secureCookie, sameSite: 'Lax', path: '/', maxAge: refreshMaxAge }));

      // Set cookies in response header; CORS is already configured for credentials
      reply.header('Set-Cookie', cookies.filter(Boolean));

      // Single-use: remove state now that exchange succeeded
      try {
        await redis.del(`csrf:${state}`);
      } catch (e) {
        app.log.warn({ state }, 'Failed to delete PKCE state after successful exchange');
      }

      // Return non-sensitive session metadata; tokens live in HttpOnly cookies for web clients
      reply.status(200).send({
        success: true,
        data: {
          idToken: tokenResponse.id_token,
          expiresIn: tokenResponse.expires_in,
          clientId: workspace.authhub_client_id
        }
      });
    } catch (err: any) {
      reply.status(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: err.message || 'AuthHub token exchange failed', status: 401 }
      });
    }
  });

  // POST /auth/refresh
  app.post<{ Body: any }>('/auth/refresh', {
    preHandler: [validateBody(refreshSchema)]
  }, async (request, reply: FastifyReply) => {
    let { refreshToken, clientId, clientSecret } = request.body as any;

    // If refresh token not supplied, attempt to read from HttpOnly cookie
    if (!refreshToken) {
      const cookieHeader = request.headers.cookie;
      if (cookieHeader) {
        const parsed = Object.fromEntries(cookieHeader.split(';').map((c) => {
          const [k, ...v] = c.split('=');
          return [k.trim(), decodeURIComponent((v || []).join('=').trim())];
        }));
        refreshToken = parsed['vaultkit_refresh'] as string | undefined;
      }
    }

    try {
      const tokenResponse = await refreshAccessToken({
        refreshToken,
        clientId,
        clientSecret
      });

      // Rotate cookies with new tokens
      function serializeCookie(name: string, value: string | undefined, opts: { httpOnly?: boolean; secure?: boolean; sameSite?: string; path?: string; maxAge?: number | undefined }) {
        if (!value) return '';
        let str = `${name}=${encodeURIComponent(value)}`;
        if (opts.maxAge !== undefined) str += `; Max-Age=${opts.maxAge}`;
        if (opts.httpOnly) str += '; HttpOnly';
        if (opts.secure) str += '; Secure';
        if (opts.sameSite) str += `; SameSite=${opts.sameSite}`;
        if (opts.path) str += `; Path=${opts.path}`;
        return str;
      }

      const accessMaxAge = typeof tokenResponse.expires_in === 'number' ? tokenResponse.expires_in : undefined;
      const refreshMaxAge = 60 * 60 * 24 * 30;
      const cookies: string[] = [];
      const secureCookie = config.nodeEnv !== 'development';
      cookies.push(serializeCookie('vaultkit_access', tokenResponse.access_token, { httpOnly: true, secure: secureCookie, sameSite: 'Lax', path: '/', maxAge: accessMaxAge }));
      cookies.push(serializeCookie('vaultkit_refresh', tokenResponse.refresh_token, { httpOnly: true, secure: secureCookie, sameSite: 'Lax', path: '/', maxAge: refreshMaxAge }));
      reply.header('Set-Cookie', cookies.filter(Boolean));

      reply.status(200).send({
        success: true,
        data: {
          idToken: tokenResponse.id_token,
          expiresIn: tokenResponse.expires_in,
          clientId: clientId
        }
      });
    } catch (err: any) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session expired. Please sign in again.',
          status: 401
        }
      });
    }
  });

  // POST /auth/logout
  app.post<{ Body: any }>('/auth/logout', {
    preHandler: [validateBody(logoutSchema)]
  }, async (request, reply: FastifyReply) => {
    // Invalidate sessions locally if active or delete tokens.
    // Since OIDC is stateless, client deletes local cookies/tokens.
    reply.status(200).send({
      success: true,
      data: { message: 'Successfully logged out' }
    });
  });
}