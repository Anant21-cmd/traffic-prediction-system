export default function StatCard({ label, value, accentVar }) {
  const style = accentVar ? { '--stat-accent': `var(${accentVar})` } : undefined;
  return (
    <div className="stat-card" style={style}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
}
