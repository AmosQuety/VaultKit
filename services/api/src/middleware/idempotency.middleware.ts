import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gt } from 'drizzle-orm';
import db from '../db/client';
import { idempotency_keys } from '../db/schema';

export async function idempotencyPreHandler(request: FastifyRequest, reply: FastifyReply) {
  // Only apply to write operations
  if (!['POST', 'PUT', 'DELETE'].includes(request.method)) {
    return;
  }

  // Skip auth, health and public share views
  const url = request.url;
  if (
    url.startsWith('/api/v1/auth') ||
    url.startsWith('/auth') ||
    url.startsWith('/api/v1/s/') ||
    url.startsWith('/s/') ||
    url === '/health' ||
    url === '/api/v1/health'
  ) {
    return;
  }

  const key = request.headers['idempotency-key'];
  if (!key || Array.isArray(key) || key.trim().length === 0) {
    reply.status(400).send({
      success: false,
      error: {
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header required for POST/PUT/DELETE requests',
        status: 400
      }
    });
    return;
  }

  const stringKey = String(key);
  request.headers['x-idempotency-key'] = stringKey;

  try {
    const cached = await db
      .select()
      .from(idempotency_keys)
      .where(
        and(
          eq(idempotency_keys.key, stringKey),
          gt(idempotency_keys.expires_at, new Date())
        )
      )
      .limit(1);

    if (cached.length > 0) {
      const record = cached[0];
      // Fastify automatically parses object responses to JSON
      reply.status(record.response_status).send(record.response_body);
      return;
    }
  } catch (err) {
    request.log.error(err, 'Idempotency lookup failed');
  }
}

export async function idempotencyOnSend(request: FastifyRequest, reply: FastifyReply, payload: any): Promise<any> {
  if (!['POST', 'PUT', 'DELETE'].includes(request.method)) {
    return payload;
  }

  const key = request.headers['x-idempotency-key'];
  if (!key) {
    return payload;
  }

  const workspaceId = request.auth?.workspace?.id;
  const memberId = request.auth?.member?.id;

  // We need auth context to save proper audit records
  if (!workspaceId || !memberId) {
    return payload;
  }

  const stringKey = String(key);

  try {
    const statusCode = reply.statusCode;
    
    // Attempt to parse response body if it's stringified JSON
    let parsedBody: any = null;
    if (typeof payload === 'string') {
      try {
        parsedBody = JSON.parse(payload);
      } catch {
        parsedBody = { raw: payload };
      }
    } else {
      parsedBody = payload;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL

    await db
      .insert(idempotency_keys)
      .values({
        key: stringKey,
        workspace_id: workspaceId,
        member_id: memberId,
        request_path: request.url,
        response_status: statusCode,
        response_body: parsedBody,
        expires_at: expiresAt
      })
      .onConflictDoNothing();

  } catch (err) {
    request.log.error(err, 'Idempotency response cache save failed');
  }

  return payload;
}