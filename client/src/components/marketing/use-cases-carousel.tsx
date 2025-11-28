import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Building2, Shield, Heart, Scale, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

interface UseCase {
  icon: LucideIcon;
  industryKey: string;
  headlineKey: string;
  descriptionKey: string;
  docsKey: string;
}

interface UseCasesCarouselProps {
  autoPlayInterval?: number;
  className?: string;
}

const useCases: UseCase[] = [
  {
    icon: Building2,
    industryKey: 'usecases.finance.industry',
    headlineKey: 'usecases.finance.headline',
    descriptionKey: 'usecases.finance.description',
    docsKey: 'usecases.finance.docs',
  },
  {
    icon: Shield,
    industryKey: 'usecases.insurance.industry',
    headlineKey: 'usecases.insurance.headline',
    descriptionKey: 'usecases.insurance.description',
    docsKey: 'usecases.insurance.docs',
  },
  {
    icon: Heart,
    industryKey: 'usecases.healthcare.industry',
    headlineKey: 'usecases.healthcare.headline',
    descriptionKey: 'usecases.healthcare.description',
    docsKey: 'usecases.healthcare.docs',
  },
  {
    icon: Scale,
    industryKey: 'usecases.legal.industry',
    headlineKey: 'usecases.legal.headline',
    descriptionKey: 'usecases.legal.description',
    docsKey: 'usecases.legal.docs',
  },
];

export function UseCasesCarousel({
  autoPlayInterval = 5000,
  className,
}: UseCasesCarouselProps) {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (autoPlayInterval <= 0) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % useCases.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlayInterval]);

  const next = () => setCurrent((prev) => (prev + 1) % useCases.length);
  const prev = () => setCurrent((prev) => (prev - 1 + useCases.length) % useCases.length);

  const useCase = useCases[current];
  const Icon = useCase.icon;

  // Split docs string into array for badges
  const documentTypes = t(useCase.docsKey).split(', ');

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
          <span className="text-sm font-semibold text-[hsl(var(--gold))] uppercase tracking-wider">
            {t('usecases.eyebrow')}
          </span>
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display text-foreground mt-3 mb-4">
            {t('usecases.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('usecases.subtitle')}
          </p>
        </motion.div>

        {/* Use Case Card */}
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-white rounded-3xl shadow-xl border border-border/50 p-8 lg:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10"
              >
                {/* Icon */}
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30 mb-6">
                  <Icon className="h-8 w-8 text-[hsl(var(--gold))]" />
                </div>

                {/* Industry Label */}
                <span className="block text-sm font-semibold text-[hsl(var(--gold))] uppercase tracking-wider mb-2">
                  {t(useCase.industryKey)}
                </span>

                {/* Headline */}
                <h3 className="text-2xl lg:text-3xl font-display text-foreground mb-4">
                  {t(useCase.headlineKey)}
                </h3>

                {/* Description */}
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  {t(useCase.descriptionKey)}
                </p>

                {/* Document Type Badges */}
                <div className="flex flex-wrap gap-2">
                  {documentTypes.map((doc, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 rounded-full bg-cream text-sm font-medium text-foreground border border-border/50"
                    >
                      {doc}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="h-10 w-10 rounded-full border border-border hover:bg-[hsl(var(--gold))]/10 hover:border-[hsl(var(--gold))]/30"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Dots */}
            <div className="flex gap-2">
              {useCases.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    i === current
                      ? 'bg-[hsl(var(--gold))] w-8'
                      : 'bg-muted-foreground/20 hover:bg-muted-foreground/40 w-2'
                  )}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="h-10 w-10 rounded-full border border-border hover:bg-[hsl(var(--gold))]/10 hover:border-[hsl(var(--gold))]/30"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
