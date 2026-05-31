import Fastify from 'fastify';
// Global safety nets: log unhandled errors to avoid the dev server exiting when
// external services (like Redis) are flaky during local E2E runs.
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception (logged):', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection (logged):', reason);
});
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerApp } from './app';
import { config } from './config';
import { idempotencyOnSend, idempotencyPreHandler } from './middleware/idempotency.middleware';
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

  app.addHook('preHandler', idempotencyPreHandler);
  app.addHook('preHandler', rateLimitMiddleware);
  app.addHook('onSend', idempotencyOnSend);

  await registerApp(app as unknown as Parameters<typeof registerApp>[0]);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
