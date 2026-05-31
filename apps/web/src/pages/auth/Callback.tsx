import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { saveAuthSession } from '../../lib/authSession';

function getApiBaseUrl(): string {
  const env = import.meta as ImportMeta & { env: { VITE_API_BASE_URL?: string } };
  return env.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api/v1';
}

export function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState('Processing AuthHub callback...');

  const search = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const code = search.get('code');
    const state = search.get('state');
    const error = search.get('error');

    if (error) {
      setStatus('error');
      setMessage(search.get('error_description') ?? error);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setMessage('Missing authorization code or state.');
      return;
    }

    const workspaceSlug = sessionStorage.getItem('vaultkit:last-workspace-slug');

    void (async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
        const payload = await response.json();

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message ?? 'AuthHub callback exchange failed');
        }

        // Server sets HttpOnly cookies for tokens; store only non-sensitive client metadata locally
        if (payload.data?.clientId) saveAuthSession(payload.data.clientId);
        setStatus('success');
        setMessage('Signed in successfully. Redirecting...');

        const redirectTarget = workspaceSlug ? `/w/${encodeURIComponent(workspaceSlug)}` : '/';
        window.setTimeout(() => {
          window.location.replace(redirectTarget);
        }, 700);
      } catch (caughtError) {
        setStatus('error');
        setMessage(caughtError instanceof Error ? caughtError.message : 'Unable to complete sign-in.');
      }
    })();
  }, [search]);

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <Card>
        <div style={{ maxWidth: '460px', display: 'grid', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>AuthHub Callback</h1>
          <p style={{ margin: 0, color: status === 'error' ? 'var(--vk-danger)' : 'var(--vk-text-muted)' }}>{message}</p>
          {status === 'error' ? <Button onClick={() => window.location.assign('/login')}>Back to login</Button> : null}
        </div>
      </Card>
    </div>
  );
}