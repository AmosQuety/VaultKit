import { FastifyRequest, FastifyReply } from 'fastify';
import redis from '../lib/redis';
import { config } from '../config';

const limits = {
  free: 300,
  pro: 600,
  agency: 2000
} as const;

export async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // If not authenticated (e.g., health, public routes), bypass rate limiting
  if (!request.auth) {
    return;
  }

  const userId = request.auth.userId;
  const plan = request.auth.workspace.plan as keyof typeof limits;
  const limit = limits[plan] ?? limits.free;

  const now = Date.now();
  const windowSizeMs = config.rateLimitWindowMs; // e.g. 60000 ms
  const windowStart = Math.floor(now / windowSizeMs) * windowSizeMs;

  const key = `ratelimit:${userId}:${windowStart}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, Math.ceil(windowSizeMs / 1000));
    }

    const remaining = Math.max(0, limit - count);
    const resetTimeSeconds = Math.ceil((windowStart + windowSizeMs - now) / 1000);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', limit);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', resetTimeSeconds);

    if (count > limit) {
      reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          status: 429
        }
      });
    }
  } catch (err) {
    request.log.error(err, 'Rate limiting check failed');
    // Fail open: continue request processing if Redis is temporarily unreachable
  }
}