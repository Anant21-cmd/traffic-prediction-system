export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={30} strokeWidth={1.5} style={{ marginBottom: '0.75rem', color: 'var(--color-ink-muted)' }} />}
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
