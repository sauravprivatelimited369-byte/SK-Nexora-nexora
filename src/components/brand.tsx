import { Hexagon } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-lockup${compact ? ' brand-lockup--compact' : ''}`}>
    <span className="brand-mark"><Hexagon size={21} strokeWidth={2.3} /><span className="brand-mark-core" /></span>
    {!compact && <span className="brand-name">NEXORA<span className="brand-period">.</span></span>}
  </span>;
}
