import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function ApprovalCard() {
  return (
    <Card>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <strong>Approve this asset?</strong>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button>Approve</Button>
          <Button variant="secondary">Request Revision</Button>
        </div>
      </div>
    </Card>
  );
}