import { cn } from '@/lib/utils';

/**
 * TCC Technology logo — orange cross/plus mark
 * Matches the TCC Technology brand identity.
 */
interface TCCLogoProps {
  className?: string;
  size?: number;
  color?: string; // kept for backward compatibility, no longer used
}

export function TCCLogo({ className, size = 24 }: TCCLogoProps) {
  return (
    <img
      src="/TCC.png"
      alt="TCC Technology"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
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
      <TCCLogo size={iconSize} />

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
  return <TCCLogo size={size} className={className} />;
}

/**
 * Sidebar variant — dark background version
 */
export function TCCSidebarLogo({ className, size = 20 }: { className?: string; size?: number }) {
  return <TCCLogo size={size} className={className} />;
}
