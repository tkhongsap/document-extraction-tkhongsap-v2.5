import { motion } from 'framer-motion';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface PricingSectionProps {
  className?: string;
}

export function PricingSection({ className }: PricingSectionProps) {
  const { t } = useLanguage();
  
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const starterFeatures = [
    t('pricing.starter_feature_1'),
    t('pricing.starter_feature_2'),
    t('pricing.starter_feature_3'),
    t('pricing.starter_feature_4'),
  ];

  const businessFeatures = [
    t('pricing.business_feature_1'),
    t('pricing.business_feature_2'),
    t('pricing.business_feature_3'),
    t('pricing.business_feature_4'),
    t('pricing.business_feature_5'),
  ];

  return (
    <section className={cn('py-24 lg:py-32 bg-cream', className)} id="pricing">
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
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('pricing.subtitle')}
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Starter Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-full p-8 bg-white rounded-3xl border border-border shadow-sm">
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-foreground mb-2">
                  {t('pricing.starter_name')}
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {t('pricing.starter_desc')}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-display text-foreground">฿0</span>
                  <span className="text-muted-foreground">/{t('pricing.per_month')}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {starterFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                size="lg"
                onClick={handleLogin}
                className="w-full h-12"
              >
                {t('pricing.starter_cta')}
              </Button>
            </div>
          </motion.div>

          {/* Business Plan - Grayed out with masked pricing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="h-full p-8 bg-gray-50 rounded-3xl border-2 border-gray-200 shadow-sm relative overflow-hidden">
              {/* Coming Soon Badge */}
              <div className="absolute top-6 right-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">
                  <Sparkles className="h-3 w-3" />
                  {t('pricing.popular_badge')}
                </span>
              </div>

              {/* Gray top accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300" />

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-400 mb-2">
                  {t('pricing.business_name')}
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  {t('pricing.business_desc')}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-display text-gray-400">฿XX,XXX</span>
                  <span className="text-gray-400">/{t('pricing.per_month')}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {businessFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                    <span className="text-gray-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                disabled
                className="w-full h-12 bg-gray-200 hover:bg-gray-200 text-gray-500 font-semibold cursor-not-allowed"
              >
                {t('pricing.business_cta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-center text-xs text-gray-400 mt-4">
                Contact sales for pricing
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
