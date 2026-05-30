import { LoginPage } from './pages/auth/Login';
import { AuthCallbackPage } from './pages/auth/Callback';
import { DashboardPage } from './pages/workspace/Dashboard';
import { CollectionPage } from './pages/workspace/Collection';
import { AssetPage } from './pages/workspace/Asset';
import { ShareLinksPage } from './pages/workspace/ShareLinks';
import { ShareViewPage } from './pages/public/ShareView';

function path() {
  return window.location.pathname;
}

export function App() {
  const currentPath = path();
  if (currentPath === '/login') return <LoginPage />;
  if (currentPath === '/auth/callback') return <AuthCallbackPage />;
  if (currentPath.startsWith('/w/') && currentPath.endsWith('/share')) return <ShareLinksPage />;
  if (currentPath.startsWith('/w/') && currentPath.includes('/assets/')) return <AssetPage />;
  if (currentPath.startsWith('/w/') && currentPath.includes('/collections/')) return <CollectionPage />;
  if (currentPath.startsWith('/s/')) return <ShareViewPage />;
  return <DashboardPage />;
}