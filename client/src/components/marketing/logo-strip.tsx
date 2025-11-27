import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Mock Thai company logos (using initials as placeholder)
const companies = [
  { name: 'SCB Securities', initials: 'SCB' },
  { name: 'PTT Digital', initials: 'PTT' },
  { name: 'Central Group', initials: 'CG' },
  { name: 'Bangkok Bank', initials: 'BBL' },
  { name: 'True Corporation', initials: 'TRUE' },
  { name: 'CP All', initials: 'CPA' },
];

interface LogoStripProps {
  title?: string;
  className?: string;
}

export function LogoStrip({ title = 'Trusted by leading Thai enterprises', className }: LogoStripProps) {
  return (
    <div className={cn('text-center', className)}>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-sm text-muted-foreground mb-8"
      >
        {title}
      </motion.p>
      <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
        {companies.map((company, i) => (
          <motion.div
            key={company.name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group"
          >
            <div className="h-12 px-6 flex items-center justify-center rounded-lg bg-muted/50 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 cursor-default">
              <span className="text-lg font-bold tracking-tight text-foreground/80 group-hover:text-primary transition-colors">
                {company.initials}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
