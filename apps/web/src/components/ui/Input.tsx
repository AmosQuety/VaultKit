export function Input(props: { value?: string; placeholder?: string; onChange?: (value: string) => void }) {
  return (
    <input
      value={props.value}
      placeholder={props.placeholder}
      onChange={(event) => props.onChange?.((event.target as HTMLInputElement).value)}
      style={{
        width: '100%',
        background: 'var(--vk-surface-2)',
        color: 'var(--vk-text)',
        border: '0.5px solid var(--vk-border)',
        borderRadius: '14px',
        padding: '0.8rem 0.9rem'
      }}
    />
  );
}