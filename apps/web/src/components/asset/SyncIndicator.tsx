export function SyncIndicator({ state }: { state: 'synced' | 'uploading' | 'queued' | 'failed' }) {
  const colors = { synced: '#68b684', uploading: '#5b89d6', queued: '#e0b15e', failed: '#cf5a52' };
  return <span style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', fontFamily: 'var(--vk-mono)', color: colors[state] }}>● {state}</span>;
}