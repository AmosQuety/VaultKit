import { AssetGrid } from '../../components/asset/AssetGrid';
import { StorageBar } from '../../components/workspace/StorageBar';
import { Card } from '../../components/ui/Card';

export function DashboardPage() {
  return (
    <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
      <Card>
        <StorageBar used={1024 * 1024 * 200} quota={1024 * 1024 * 1024 * 2} />
      </Card>
      <AssetGrid />
    </div>
  );
}