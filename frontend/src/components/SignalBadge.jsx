const CLASS_MAP = {
  Low: 'badge-low',
  Medium: 'badge-medium',
  High: 'badge-high',
};

export default function SignalBadge({ level }) {
  const cls = CLASS_MAP[level] || 'badge-medium';
  return <span className={`badge ${cls}`}>{level}</span>;
}
