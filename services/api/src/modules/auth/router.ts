import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { config } from '../../config';
import db from '../../db/client';
import { workspaces } from '../../db/schema';
import redis from '../../lib/redis';
import {
  buildAuthorizeUrl,
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
  app.get('/auth/login', async (request: FastifyRequest<{ Querystring: { workspace?: string } }>, reply: FastifyReply) => {
    const slug = request.query.workspace;
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
    
    // Store CSRF state in Redis (60s TTL) mapped to the workspace ID
    await redis.set(`csrf:${state}`, workspace.id, 'EX', 60);

    const authorizeUrl = buildAuthorizeUrl({
      clientId: workspace.authhub_client_id,
      redirectUri: `${config.webAppUrl}/auth/callback`,
      scope: 'openid profile email files:read files:upload files:delete workspace:manage',
      state
    });

    reply.redirect(authorizeUrl);
  });

  // GET /auth/callback?code=...&state=...
  app.get('/auth/callback', async (request: FastifyRequest<{ Querystring: { code?: string; state?: string } }>, reply: FastifyReply) => {
    const { code, state } = request.query;
    if (!code || !state) {
      reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing code or state query parameters', status: 400 }
      });
      return;
    }

    // Verify CSRF state exists in Redis
    const workspaceId = await redis.get(`csrf:${state}`);
    if (!workspaceId) {
      reply.status(400).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'CSRF state verification failed or expired', status: 400 }
      });
      return;
    }

    // Single-use delete
    await redis.del(`csrf:${state}`);

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
        redirectUri: `${config.webAppUrl}/auth/callback`
      });

      reply.status(200).send({
        success: true,
        data: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          idToken: tokenResponse.id_token,
          expiresIn: tokenResponse.expires_in
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
  app.post('/auth/refresh', {
    preHandler: [validateBody(refreshSchema)]
  }, async (request: FastifyRequest<{ Body: z.infer<typeof refreshSchema> }>, reply: FastifyReply) => {
    const { refreshToken, clientId, clientSecret } = request.body;

    try {
      const tokenResponse = await refreshAccessToken({
        refreshToken,
        clientId,
        clientSecret
      });

      reply.status(200).send({
        success: true,
        data: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          idToken: tokenResponse.id_token,
          expiresIn: tokenResponse.expires_in
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
  app.post('/auth/logout', {
    preHandler: [validateBody(logoutSchema)]
  }, async (request: FastifyRequest<{ Body: z.infer<typeof logoutSchema> }>, reply: FastifyReply) => {
    // Invalidate sessions locally if active or delete tokens.
    // Since OIDC is stateless, client deletes local cookies/tokens.
    reply.status(200).send({
      success: true,
      data: { message: 'Successfully logged out' }
    });
  });
}