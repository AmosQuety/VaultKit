import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export interface AssetCardProps {
  name: string;
  blurHash?: string;
  status?: string;
}

export function AssetCard({ name, blurHash, status = 'processing' }: AssetCardProps) {
  return (
    <Card>
      <div style={{ aspectRatio: '1 / 1', borderRadius: '14px', border: '0.5px solid var(--vk-border)', background: 'var(--vk-surface-2)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.9rem' }}>
        <strong>{name}</strong>
        <Badge tone={status as never}>{status}</Badge>
      </div>
      <div style={{ fontFamily: 'var(--vk-mono)', color: 'var(--vk-text-muted)', marginTop: '0.35rem' }}>{blurHash ?? 'loading...'}</div>
    </Card>
  );
}