import { motion } from 'framer-motion';
import { Brain, Globe, Layers, Download, Files, Code, LucideIcon, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface Feature {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const allFeatures: Feature[] = [
  { icon: Brain, titleKey: 'features.ai_title', descKey: 'features.ai_desc' },
  { icon: Globe, titleKey: 'features.bilingual_title', descKey: 'features.bilingual_desc' },
  { icon: Layers, titleKey: 'features.templates_title', descKey: 'features.templates_desc' },
  { icon: Download, titleKey: 'features.export_title', descKey: 'features.export_desc' },
  { icon: Files, titleKey: 'features.batch_title', descKey: 'features.batch_desc' },
  { icon: Code, titleKey: 'features.api_title', descKey: 'features.api_desc' },
];

// Condensed version: Only show 3 key features
const condensedFeatures: Feature[] = [
  { icon: Brain, titleKey: 'features.ai_title', descKey: 'features.ai_desc' },
  { icon: Globe, titleKey: 'features.bilingual_title', descKey: 'features.bilingual_desc' },
  { icon: Download, titleKey: 'features.export_title', descKey: 'features.export_desc' },
];

interface FeatureGridProps {
  className?: string;
  condensed?: boolean;
}

export function FeatureGrid({ className, condensed = false }: FeatureGridProps) {
  const { t } = useLanguage();
  const features = condensed ? condensedFeatures : allFeatures;

  return (
    <section className={cn('py-12 lg:py-16 bg-cream', className)}>
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className={cn('mx-auto text-center', condensed ? 'max-w-xl mb-10' : 'max-w-2xl mb-16')}
        >
          <span className="text-sm font-semibold text-[hsl(var(--gold))] uppercase tracking-wider mb-3 block">
            {t('features.eyebrow')}
          </span>
          <h2 className={cn('font-display text-foreground mb-3', condensed ? 'text-2xl lg:text-3xl' : 'text-3xl lg:text-4xl xl:text-5xl mb-4')}>
            {t('features.title')}
          </h2>
          {!condensed && (
            <p className="text-lg text-muted-foreground">
              {t('features.subtitle')}
            </p>
          )}
        </motion.div>

        {/* Feature Cards Grid */}
        <div className={cn('grid gap-6 lg:gap-8', condensed ? 'md:grid-cols-3 mb-8' : 'md:grid-cols-2 lg:grid-cols-3')}>
          {features.map((feature, i) => (
            <FeatureCard
              key={i}
              icon={feature.icon}
              title={t(feature.titleKey)}
              description={t(feature.descKey)}
              index={i}
              condensed={condensed}
            />
          ))}
        </div>

        {/* View All Link for Condensed Version */}
        {condensed && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center"
          >
            <Link href="/capabilities">
              <Button
                variant="outline"
                className="group h-12 px-6 border-[hsl(var(--gold))]/30 hover:border-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10 transition-all duration-300"
              >
                {t('capabilities.view_all')}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
  condensed?: boolean;
}

export function FeatureCard({ icon: Icon, title, description, index, condensed = false }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group"
    >
      <div className={cn(
        'h-full bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:border-[hsl(var(--gold))]/30 transition-all duration-300 hover:-translate-y-1',
        condensed ? 'p-6' : 'p-8'
      )}>
        {/* Icon */}
        <div className={cn(
          'rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--gold))]/20 transition-colors',
          condensed ? 'h-12 w-12' : 'h-14 w-14 mb-6'
        )}>
          <Icon className={cn('text-[hsl(var(--gold))]', condensed ? 'h-6 w-6' : 'h-7 w-7')} />
        </div>

        {/* Content */}
        <h3 className={cn('font-semibold mb-2 text-foreground', condensed ? 'text-lg' : 'text-xl mb-3')}>
          {title}
        </h3>
        <p className={cn('text-muted-foreground leading-relaxed', condensed ? 'text-sm' : '')}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}

// Export all features for use in capabilities page
export { allFeatures };
