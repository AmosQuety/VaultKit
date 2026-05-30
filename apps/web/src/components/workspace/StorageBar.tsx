export function StorageBar({ used, quota }: { used: number; quota: number }) {
  const percent = Math.min(100, Math.round((used / quota) * 100));
  const color = percent >= 95 ? '#cf5a52' : percent >= 80 ? '#e0b15e' : 'var(--vk-accent)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontFamily: 'var(--vk-mono)' }}>
        <span>Storage</span>
        <span>{percent}%</span>
      </div>
      <div style={{ height: '10px', borderRadius: '999px', border: '0.5px solid var(--vk-border)', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}