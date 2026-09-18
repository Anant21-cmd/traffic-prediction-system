import { Loader2 } from 'lucide-react';

export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="loading-row">
      <Loader2 size={16} className="spin" />
      {label}
    </div>
  );
}
