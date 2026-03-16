import { cn } from '@/lib/utils';

/**
 * TCC Technology logo — orange cross/plus mark
 * Matches the TCC Technology brand identity.
 */
interface TCCLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export function TCCLogo({ className, size = 24, color = '#F97316' }: TCCLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TCC Technology"
    >
      {/* Top square */}
      <rect x="10" y="0" width="12" height="12" rx="2" fill={color} />
      {/* Left square */}
      <rect x="0" y="10" width="12" height="12" rx="2" fill={color} />
      {/* Center square */}
      <rect x="10" y="10" width="12" height="12" rx="2" fill={color} />
      {/* Right square */}
      <rect x="20" y="10" width="12" height="12" rx="2" fill={color} />
      {/* Bottom square */}
      <rect x="10" y="20" width="12" height="12" rx="2" fill={color} />
    </svg>
  );
}

/**
 * Full TCC brand mark: logo icon + product name
 */
interface TCCBrandMarkProps {
  className?: string;
  iconSize?: number;
  showTagline?: boolean;
  textClass?: string;
  darkBg?: boolean;
}

export function TCCBrandMark({
  className,
  iconSize = 22,
  showTagline = false,
  textClass,
  darkBg = false,
}: TCCBrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Logo container - white bg version for dark backgrounds, orange bg for light */}
      {darkBg ? (
        <div
          className="flex items-center justify-center rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm"
          style={{ width: iconSize + 16, height: iconSize + 16 }}
        >
          <TCCLogo size={iconSize} color="#FB923C" />
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: iconSize + 16,
            height: iconSize + 16,
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
          }}
        >
          <TCCLogo size={iconSize} color="#F97316" />
        </div>
      )}

      {/* Text */}
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display font-bold tracking-tight leading-none',
            darkBg ? 'text-white' : 'text-foreground',
            textClass
          )}
        >
          TCC Document Intelligence
        </span>
        {showTagline && (
          <span
            className={cn(
              'text-[10px] font-medium tracking-widest uppercase mt-1',
              darkBg ? 'text-white/50' : 'text-muted-foreground/60'
            )}
          >
            by TCC Technology
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact logo mark for sidebar collapsed state — just the icon
 */
export function TCCLogoIcon({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl',
        className
      )}
      style={{
        width: size + 16,
        height: size + 16,
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
        border: '1px solid rgba(249, 115, 22, 0.2)',
      }}
    >
      <TCCLogo size={size} color="#F97316" />
    </div>
  );
}

/**
 * Sidebar variant — dark background version
 */
export function TCCSidebarLogo({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg',
        className
      )}
      style={{
        width: size + 14,
        height: size + 14,
        background: 'rgba(249, 115, 22, 0.15)',
        border: '1px solid rgba(249, 115, 22, 0.3)',
      }}
    >
      <TCCLogo size={size} color="#FB923C" />
    </div>
  );
}
