export interface BadgeProps {
  tone?: 'approved' | 'pending' | 'revision_requested' | 'processing' | 'archived';
  children: unknown;
}

const tones = {
  approved: '#68b684',
  pending: '#e0b15e',
  revision_requested: '#cf5a52',
  processing: '#5b89d6',
  archived: '#8a8f99'
};

export function Badge({ tone = 'pending', children }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        border: '0.5px solid var(--vk-border)',
        borderRadius: '999px',
        padding: '0.25rem 0.55rem',
        fontFamily: 'var(--vk-mono)',
        fontSize: '0.72rem',
        color: tones[tone]
      }}
    >
      {children}
    </span>
  );
}