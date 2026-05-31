import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

function getApiBaseUrl(): string {
  const env = import.meta as ImportMeta & { env: { VITE_API_BASE_URL?: string } };
  return env.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';
}

function getWorkspaceSlugFromLocation(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('workspace') ?? sessionStorage.getItem('vaultkit:last-workspace-slug') ?? '';
}

export function LoginPage() {
  const [workspaceSlug, setWorkspaceSlug] = useState(getWorkspaceSlugFromLocation());
  const [error, setError] = useState('');

  const startLogin = () => {
    const slug = workspaceSlug.trim();
    if (!slug) {
      setError('Enter a workspace slug to continue.');
      return;
    }

    sessionStorage.setItem('vaultkit:last-workspace-slug', slug);
    window.location.href = `${getApiBaseUrl()}/auth/login?workspace=${encodeURIComponent(slug)}`;
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <Card>
        <div style={{ maxWidth: '420px', display: 'grid', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>VaultKit</h1>
          <p style={{ margin: 0, color: 'var(--vk-text-muted)' }}>Sign in through AuthHub to continue.</p>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--vk-text-muted)', fontSize: '0.9rem' }}>
              Workspace slug
              <Input
                value={workspaceSlug}
                placeholder="agency-alpha"
                onChange={(value) => {
                  setWorkspaceSlug(value);
                  setError('');
                }}
              />
            </label>
            {error ? <p style={{ margin: 0, color: 'var(--vk-danger)', fontSize: '0.9rem' }}>{error}</p> : null}
            <Button onClick={startLogin}>Continue with AuthHub</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}