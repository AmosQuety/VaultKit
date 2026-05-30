import { authRoutes } from './modules/auth/router';
import { workspaceRoutes } from './modules/workspaces/router';
import { collectionRoutes } from './modules/collections/router';
import { assetRoutes } from './modules/assets/router';
import { shareRoutes } from './modules/share/router';

type AppLike = {
  get: (path: string, handler: unknown) => void;
  post: (path: string, handler: unknown) => void;
  patch: (path: string, handler: unknown) => void;
  put: (path: string, handler: unknown) => void;
  delete: (path: string, handler: unknown) => void;
  addHook: (name: string, handler: unknown) => void;
};

export async function registerApp(app: AppLike) {
  await authRoutes(app);
  await workspaceRoutes(app);
  await collectionRoutes(app);
  await assetRoutes(app);
  await shareRoutes(app);
}