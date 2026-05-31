import Redis from 'ioredis';
import { config } from '../config';

// Allow forcing a pure in-memory fallback for local E2E/debugging via env var.
const useInMemory = process.env.USE_IN_MEMORY_REDIS === '1';
let client: Redis | null = null;
if (!useInMemory) {
  client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null
  });

  // Prevent unhandled 'error' events from crashing the process when Redis is flaky.
  client.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('[ioredis] client error (falling back to in-memory):', err && err.message ? err.message : err);
  });
  client.on('end', () => {
    // eslint-disable-next-line no-console
    console.info('[ioredis] connection ended, using in-memory cache until reconnect');
  });
}

// Prevent unhandled 'error' events from crashing the process when Redis is flaky.
client.on('error', (err) => {
  // Keep a minimal log; the rest of the code will fallback to in-memory operations.
  // Avoid throwing here.
  // eslint-disable-next-line no-console
  console.warn('[ioredis] client error (falling back to in-memory):', err && err.message ? err.message : err);
});
client.on('end', () => {
  // eslint-disable-next-line no-console
  console.info('[ioredis] connection ended, using in-memory cache until reconnect');
});

type MemoryEntry = { value: string; expiresAt?: number };
const memory = new Map<string, MemoryEntry>();

function setInMemory(key: string, value: string, ttlSeconds?: number) {
  const entry: MemoryEntry = { value };
  if (typeof ttlSeconds === 'number') entry.expiresAt = Date.now() + ttlSeconds * 1000;
  memory.set(key, entry);
  return 'OK';
}

function getFromMemory(key: string) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

export const redis = {
  async get(key: string) {
    // Try the Redis client but short-circuit to in-memory fallback if it
    // doesn't respond quickly (local E2E should not block on a flaky Redis).
    if (!client) return getFromMemory(key);
    const p = client.get(key);
    try {
      const res = await Promise.race([
        p,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
      ]);
      if (res === null) return getFromMemory(key);
      return res as string | null;
    } catch (e) {
      return getFromMemory(key);
    }
  },
  async set(key: string, value: string, ...args: any[]) {
    // Attempt Redis set but with a timeout to avoid locking the request
    if (!client) {
      let ttl: number | undefined;
      for (let i = 0; i < args.length; i++) {
        if ((args[i] === 'EX' || args[i] === 'PX') && i + 1 < args.length) {
          const num = Number(args[i + 1]);
          if (!Number.isNaN(num)) ttl = args[i] === 'EX' ? num : Math.ceil(num / 1000);
        }
      }
      return setInMemory(key, value, ttl);
    }
    const p = (client as any).set(key, value, ...args) as Promise<any>;
    try {
      const res = await Promise.race([
        p,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
      ]);
      if (res === null) {
        // parse EX TTL if provided
        let ttl: number | undefined;
        for (let i = 0; i < args.length; i++) {
          if ((args[i] === 'EX' || args[i] === 'PX') && i + 1 < args.length) {
            const num = Number(args[i + 1]);
            if (!Number.isNaN(num)) ttl = args[i] === 'EX' ? num : Math.ceil(num / 1000);
          }
        }
        return setInMemory(key, value, ttl);
      }
      return res;
    } catch (e) {
      let ttl: number | undefined;
      for (let i = 0; i < args.length; i++) {
        if ((args[i] === 'EX' || args[i] === 'PX') && i + 1 < args.length) {
          const num = Number(args[i + 1]);
          if (!Number.isNaN(num)) ttl = args[i] === 'EX' ? num : Math.ceil(num / 1000);
        }
      }
      return setInMemory(key, value, ttl);
    }
  },
  async del(key: string) {
    if (!client) return memory.delete(key) ? 1 : 0;
    const p = client.del(key);
    try {
      const res = await Promise.race([
        p,
        new Promise<number>((resolve) => setTimeout(() => resolve(0), 500))
      ]);
      if (res === 0) return memory.delete(key) ? 1 : 0;
      return res as number;
    } catch (e) {
      return memory.delete(key) ? 1 : 0;
    }
  },
  on: (event: string, cb: (...args: any[]) => void) => client.on(event, cb)
};

export default redis;
