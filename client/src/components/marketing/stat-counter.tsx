import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Stat {
  value: string;
  label: string;
  suffix?: string;
  highlight?: boolean;
  description?: string;
}

interface StatCounterProps {
  stats: Stat[];
  className?: string;
}

function AnimatedNumber({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState('0');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!isInView) return;

    // Extract numeric part
    const numericMatch = value.match(/[\d.]+/);
    if (!numericMatch) {
      setDisplayValue(value);
      return;
    }

    const targetNum = parseFloat(numericMatch[0]);
    const prefix = value.slice(0, value.indexOf(numericMatch[0]));
    const valueSuffix = value.slice(value.indexOf(numericMatch[0]) + numericMatch[0].length);
    const hasDecimal = numericMatch[0].includes('.');
    const decimalPlaces = hasDecimal ? numericMatch[0].split('.')[1].length : 0;

    const duration = 2000;
    const steps = 60;
    const increment = targetNum / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(current + increment, targetNum);

      if (step >= steps) {
        setDisplayValue(`${prefix}${hasDecimal ? targetNum.toFixed(decimalPlaces) : Math.round(targetNum)}${valueSuffix}`);
        clearInterval(timer);
      } else {
        setDisplayValue(`${prefix}${hasDecimal ? current.toFixed(decimalPlaces) : Math.round(current)}${valueSuffix}`);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {displayValue}
      {suffix}
    </span>
  );
}

export function StatCounter({ stats, className }: StatCounterProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-8 lg:gap-12', className)}>
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="text-center"
        >
          <div
            className={cn(
              'text-4xl lg:text-5xl font-display mb-2',
              stat.highlight ? 'text-[hsl(var(--gold))]' : 'text-foreground'
            )}
          >
            <AnimatedNumber value={stat.value} suffix={stat.suffix} />
          </div>
          <div className="text-sm text-muted-foreground">{stat.label}</div>
          {stat.description && (
            <div className="text-sm text-muted-foreground/70 mt-1">{stat.description}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Single stat component for individual use
interface SingleStatProps {
  value: string | number;
  label: string;
  className?: string;
}

export function SingleStat({ value, label, className }: SingleStatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn('text-center', className)}
    >
      <div className="text-3xl font-display text-foreground mb-1">
        <AnimatedNumber value={String(value)} />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </motion.div>
  );
}
