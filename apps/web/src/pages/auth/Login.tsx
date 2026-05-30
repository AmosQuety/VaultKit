import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function LoginPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <Card>
        <div style={{ maxWidth: '420px', display: 'grid', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>VaultKit</h1>
          <p style={{ margin: 0, color: 'var(--vk-text-muted)' }}>Sign in through AuthHub to continue.</p>
          <Button>Continue with AuthHub</Button>
        </div>
      </Card>
    </div>
  );
}