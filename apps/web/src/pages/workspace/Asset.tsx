import { Card } from '../../components/ui/Card';
import { ApprovalCard } from '../../components/share/ApprovalCard';

export function AssetPage() {
  return (
    <div style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
      <Card>
        <div style={{ minHeight: '280px', border: '0.5px solid var(--vk-border)', borderRadius: '14px' }} />
      </Card>
      <ApprovalCard />
    </div>
  );
}