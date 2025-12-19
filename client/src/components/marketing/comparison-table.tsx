import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem, viewportOnce } from '@/lib/animations';

interface ComparisonItem {
  before: string;
  after: string;
}

interface ComparisonTableProps {
  items: ComparisonItem[];
  beforeTitle?: string;
  afterTitle?: string;
  className?: string;
}

export function ComparisonTable({
  items,
  beforeTitle = 'Before',
  afterTitle = 'After',
  className,
}: ComparisonTableProps) {
  return (
    <motion.div
      className={cn('grid md:grid-cols-2 gap-6 md:gap-8', className)}
      variants={staggerContainer}
      initial="initial"
      whileInView="animate"
      viewport={viewportOnce}
    >
      {/* Before Column */}
      <motion.div variants={staggerItem} className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="h-4 w-4 text-destructive" />
          </div>
          <h3 className="font-semibold text-lg">{beforeTitle}</h3>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/10"
            >
              <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{item.before}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* After Column */}
      <motion.div variants={staggerItem} className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-lg">{afterTitle}</h3>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
            >
              <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <span className="text-foreground">{item.after}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface SimpleComparisonProps {
  items: { icon: typeof Check; text: string; type: 'positive' | 'negative' }[];
  className?: string;
}

export function SimpleComparison({ items, className }: SimpleComparisonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, i) => {
        const Icon = item.icon;
        const isPositive = item.type === 'positive';

        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 text-sm',
              isPositive ? 'text-foreground' : 'text-muted-foreground line-through'
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                isPositive ? 'text-emerald-600' : 'text-destructive'
              )}
            />
            {item.text}
          </div>
        );
      })}
    </div>
  );
}
