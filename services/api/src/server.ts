import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerApp } from './app';
import { config } from './config';
import { idempotencyMiddleware } from './middleware/idempotency.middleware';
import { rateLimitMiddleware } from './middleware/rateLimit.middleware';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: [config.webAppUrl],
    credentials: true
  });

  await app.register(helmet, {
    contentSecurityPolicy: false
  });

  app.addHook('preHandler', idempotencyMiddleware());
  app.addHook('preHandler', rateLimitMiddleware());

  await registerApp(app as unknown as Parameters<typeof registerApp>[0]);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});