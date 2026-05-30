import { URLSearchParams } from 'url';
import redis from '../../lib/redis';
import { config } from '../../config';

export interface M2MToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

const CACHE_PREFIX = 'm2m:';

export async function getM2MToken(clientId: string, clientSecret: string, scope?: string): Promise<string> {
  const cacheKey = `${CACHE_PREFIX}${clientId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { access_token: string; expires_at: number };
      if (parsed.expires_at > Date.now()) {
        return parsed.access_token;
      }
    }
  } catch (err) {
    // Log but continue to request a fresh token
    console.warn('Redis read failed for m2m token', err);
  }

  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  if (scope) params.set('scope', scope);

  const res = await fetch(new URL('/api/v1/oauth/token', config.authhubBaseUrl).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`M2M token request failed: ${res.status} ${text}`);
  }

  const body = (await res.json()) as M2MToken;

  const expiresAt = Date.now() + (body.expires_in * 1000) - 60000; // expire 60s early

  try {
    await redis.set(cacheKey, JSON.stringify({ access_token: body.access_token, expires_at: expiresAt }));
    await redis.pexpireat(cacheKey, expiresAt);
  } catch (err) {
    console.warn('Failed to cache m2m token in Redis', err);
  }

  return body.access_token;
}
