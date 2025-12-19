import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface ComparisonSectionProps {
  className?: string;
}

export function ComparisonSection({ className }: ComparisonSectionProps) {
  const { t } = useLanguage();

  const beforeItems = [
    t('comparison.before_1'),
    t('comparison.before_2'),
    t('comparison.before_3'),
    t('comparison.before_4'),
  ];

  const afterItems = [
    t('comparison.after_1'),
    t('comparison.after_2'),
    t('comparison.after_3'),
    t('comparison.after_4'),
  ];

  return (
    <section className={cn('py-16 lg:py-20 bg-cream', className)}>
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display text-foreground mb-4">
            {t('comparison.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('comparison.subtitle')}
          </p>
        </motion.div>

        {/* Comparison Grid */}
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Before Column */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 mb-4">
                  <X className="h-6 w-6" />
                </span>
                <h3 className="text-xl font-semibold text-foreground">
                  {t('comparison.before_title')}
                </h3>
              </div>
              <div className="space-y-4">
                {beforeItems.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-red-50/50 border border-red-100"
                  >
                    <X className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground line-through decoration-red-300">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* After Column */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="text-center mb-8">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] mb-4">
                  <Check className="h-6 w-6" />
                </span>
                <h3 className="text-xl font-semibold text-foreground">
                  {t('comparison.after_title')}
                </h3>
              </div>
              <div className="space-y-4">
                {afterItems.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-[hsl(var(--gold))]/5 border border-[hsl(var(--gold))]/20"
                  >
                    <Check className="h-5 w-5 text-[hsl(var(--gold))] shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
