import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { ComparisonSection } from '@/components/marketing/comparison-section';
import { CTASection } from '@/components/marketing/cta-section';

export default function Capabilities() {
  const { t } = useLanguage();

  const handleLogin = () => {
    window.location.href = "/api/login";
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
              {t('capabilities.eyebrow')}
            </span>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-display text-foreground mt-3 mb-6">
              {t('capabilities.title')}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              {t('capabilities.subtitle')}
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                size="lg"
                onClick={handleLogin}
                className="h-12 px-8 bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-[hsl(192_85%_12%)] font-semibold shadow-lg shadow-[hsl(var(--gold))]/20"
              >
                {t('capabilities.cta_primary')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 border-border hover:border-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/10"
                >
                  {t('capabilities.cta_secondary')}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* All Capabilities Section */}
      <FeatureGrid />

      {/* Comparison Section */}
      <ComparisonSection />

      {/* CTA Section */}
      <CTASection />
    </div>
  );
}

