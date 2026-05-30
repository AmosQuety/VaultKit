export function Card({ children }: { children: unknown }) {
  return (
    <section
      style={{
        background: 'var(--vk-surface)',
        border: '0.5px solid var(--vk-border)',
        borderRadius: 'var(--vk-radius)',
        boxShadow: 'var(--vk-shadow)',
        padding: '1rem'
      }}
    >
      {children}
    </section>
  );
}