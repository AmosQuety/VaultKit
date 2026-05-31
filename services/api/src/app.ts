import { FastifyInstance } from 'fastify';
import { authRoutes } from './modules/auth/router';
import { workspaceRoutes } from './modules/workspaces/router';
import { collectionRoutes } from './modules/collections/router';
import { assetRoutes } from './modules/assets/router';
import { shareRoutes } from './modules/share/router';

export async function registerApp(app: FastifyInstance) {
  await authRoutes(app);
  await workspaceRoutes(app);
  await collectionRoutes(app);
  await assetRoutes(app);
  await shareRoutes(app);
}