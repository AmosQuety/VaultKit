export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: unknown;
  onClick?: () => void;
}

const variantStyles = {
  primary: { background: 'var(--vk-accent)', color: '#fff' },
  secondary: { background: 'var(--vk-surface-2)', color: 'var(--vk-text)' },
  ghost: { background: 'transparent', color: 'var(--vk-text)' },
  danger: { background: 'var(--vk-danger)', color: '#fff' }
};

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        border: '0.5px solid var(--vk-border)',
        borderRadius: '999px',
        padding: '0.8rem 1rem',
        cursor: 'pointer',
        transition: 'opacity 150ms ease',
        ...variantStyles[variant]
      }}
    >
      {children}
    </button>
  );
}