import { motion } from 'framer-motion';
import { Building2, Shield, Heart, Scale, Check, ArrowRight, Sparkles, type LucideIcon } from 'lucide-react';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface UseCase {
  icon: LucideIcon;
  industryKey: string;
  headlineKey: string;
  descriptionKey: string;
  docsKey: string;
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

const features = [
  'usecases.feature_1',
  'usecases.feature_2',
  'usecases.feature_3',
  'usecases.feature_4',
  'usecases.feature_5',
  'usecases.feature_6',
];

export default function UseCases() {
  const { t } = useLanguage();

  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-cream">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="text-sm font-semibold text-[hsl(var(--gold))] uppercase tracking-wider">
              {t('usecases.eyebrow')}
            </span>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-display text-foreground mt-3 mb-6">
              {t('usecases.title')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('usecases.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Industry Use Cases Grid */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {useCases.map((useCase, index) => (
              <UseCaseCard
                key={useCase.industryKey}
                useCase={useCase}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-cream">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center mb-12"
          >
            <span className="text-sm font-semibold text-[hsl(var(--gold))] uppercase tracking-wider">
              {t('usecases.features_eyebrow')}
            </span>
            <h2 className="text-3xl lg:text-4xl font-display text-foreground mt-3 mb-4">
              {t('usecases.features_title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('usecases.features_subtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 max-w-4xl mx-auto">
            {features.map((featureKey, index) => (
              <motion.div
                key={featureKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border/50 shadow-sm"
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[hsl(var(--gold))]/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-[hsl(var(--gold))]" />
                </div>
                <span className="text-foreground font-medium">{t(featureKey)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 bg-section-dark relative overflow-hidden">
        {/* Gold accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[hsl(var(--gold))] to-transparent" />

        {/* Background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[hsl(var(--gold))]/5 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Decorative element */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 mb-8"
            >
              <Sparkles className="h-7 w-7 text-[hsl(var(--gold))]" />
            </motion.div>

            <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display text-white mb-6">
              {t('usecases.cta_title')}
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
              {t('usecases.cta_subtitle')}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                size="lg"
                onClick={handleLogin}
                className="h-14 px-10 text-lg bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-[hsl(192_85%_12%)] font-semibold shadow-xl shadow-[hsl(var(--gold))]/30 animate-pulse-glow"
              >
                {t('usecases.cta_primary')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-10 text-lg border-white/20 text-white hover:bg-white/10"
                >
                  {t('usecases.cta_secondary')}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

interface UseCaseCardProps {
  useCase: UseCase;
  index: number;
}

function UseCaseCard({ useCase, index }: UseCaseCardProps) {
  const { t } = useLanguage();
  const Icon = useCase.icon;
  const documentTypes = t(useCase.docsKey).split(', ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <div className="h-full p-8 bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:border-[hsl(var(--gold))]/30 transition-all duration-300 hover:-translate-y-1">
        {/* Icon */}
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30 mb-6 group-hover:bg-[hsl(var(--gold))]/20 transition-colors">
          <Icon className="h-7 w-7 text-[hsl(var(--gold))]" />
        </div>

        {/* Industry Label */}
        <span className="block text-sm font-semibold text-[hsl(var(--gold))] uppercase tracking-wider mb-2">
          {t(useCase.industryKey)}
        </span>

        {/* Headline */}
        <h3 className="text-xl lg:text-2xl font-display text-foreground mb-3">
          {t(useCase.headlineKey)}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {t(useCase.descriptionKey)}
        </p>

        {/* Document Type Badges */}
        <div className="flex flex-wrap gap-2">
          {documentTypes.map((doc, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full bg-cream text-sm font-medium text-foreground border border-border/50"
            >
              {doc}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
