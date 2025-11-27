import { motion } from 'framer-motion';
import { Brain, Globe, Layers, Download, Files, Code, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface Feature {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const features: Feature[] = [
  { icon: Brain, titleKey: 'features.ai_title', descKey: 'features.ai_desc' },
  { icon: Globe, titleKey: 'features.bilingual_title', descKey: 'features.bilingual_desc' },
  { icon: Layers, titleKey: 'features.templates_title', descKey: 'features.templates_desc' },
  { icon: Download, titleKey: 'features.export_title', descKey: 'features.export_desc' },
  { icon: Files, titleKey: 'features.batch_title', descKey: 'features.batch_desc' },
  { icon: Code, titleKey: 'features.api_title', descKey: 'features.api_desc' },
];

interface FeatureGridProps {
  className?: string;
}

export function FeatureGrid({ className }: FeatureGridProps) {
  const { t } = useLanguage();

  return (
    <section className={cn('py-24 lg:py-32 bg-cream', className)}>
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <span className="text-sm font-semibold text-[hsl(var(--gold))] uppercase tracking-wider mb-4 block">
            {t('features.eyebrow')}
          </span>
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display text-foreground mb-4">
            {t('features.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('features.subtitle')}
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, i) => (
            <FeatureCard
              key={i}
              icon={feature.icon}
              title={t(feature.titleKey)}
              description={t(feature.descKey)}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group"
    >
      <div className="h-full p-8 bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:border-[hsl(var(--gold))]/30 transition-all duration-300 hover:-translate-y-1">
        {/* Icon */}
        <div className="h-14 w-14 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center mb-6 group-hover:bg-[hsl(var(--gold))]/20 transition-colors">
          <Icon className="h-7 w-7 text-[hsl(var(--gold))]" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold mb-3 text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
