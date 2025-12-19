import { ShieldCheck, Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustBadgeProps {
  variant?: 'security' | 'check' | 'lock';
  text: string;
  className?: string;
}

const icons = {
  security: ShieldCheck,
  check: Check,
  lock: Lock,
};

export function TrustBadge({ variant = 'security', text, className }: TrustBadgeProps) {
  const Icon = icons[variant];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-primary/5 border border-primary/10',
        'text-primary text-xs font-medium',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{text}</span>
    </div>
  );
}

interface TrustIndicatorProps {
  icon: 'shield' | 'lock' | 'check';
  text: string;
  className?: string;
}

export function TrustIndicator({ icon, text, className }: TrustIndicatorProps) {
  const iconMap = {
    shield: ShieldCheck,
    lock: Lock,
    check: Check,
  };
  const Icon = iconMap[icon];

  return (
    <span className={cn('flex items-center gap-1.5 text-sm text-muted-foreground', className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{text}</span>
    </span>
  );
}

interface SecurityBadgeRowProps {
  badges: string[];
  className?: string;
}

export function SecurityBadgeRow({ badges, className }: SecurityBadgeRowProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-4', className)}>
      {badges.map((badge, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          {badge}
        </span>
      ))}
    </div>
  );
}
