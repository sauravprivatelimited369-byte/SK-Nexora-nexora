import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg' }) {
  return <button className={`button button--${variant} button--${size} ${className}`} {...props} />;
}

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`card ${className}`} {...props}>{children}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'lime' | 'blue' | 'orange' | 'red' | 'purple' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function ProgressBar({ value, label, color = 'lime', className = '' }: { value: number; label?: string; color?: 'lime' | 'blue' | 'purple' | 'orange'; className?: string }) {
  const bounded = Math.max(0, Math.min(100, Math.round(value)));
  return <div className={`progress ${className}`} aria-label={label || `${bounded}% complete`} role="progressbar" aria-valuenow={bounded} aria-valuemin={0} aria-valuemax={100}>
    <span className={`progress-fill progress-fill--${color}`} style={{ width: `${bounded}%` }} />
  </div>;
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-heading">
    <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description && <p className="section-description">{description}</p>}</div>
    {action && <div className="section-heading-action">{action}</div>}
  </div>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state">{icon && <div className="empty-state-icon">{icon}</div>}<h3>{title}</h3><p>{description}</p>{action && <div className="empty-state-action">{action}</div>}</div>;
}
