import { useLanguage } from '@/lib/i18n';
import { HeroRecruitment } from '@/components/marketing/hero-recruitment';
import { StatCounter } from '@/components/marketing/stat-counter';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { CTASection } from '@/components/marketing/cta-section';
import { PricingSection } from '@/components/marketing/pricing-section';

export default function Home() {
  const { t } = useLanguage();

  const stats = [
    { value: '99.2', suffix: '%', label: t('stats.accuracy'), description: t('stats.accuracyDesc'), highlight: true },
    { value: '50M', suffix: '+', label: t('stats.pages'), description: t('stats.pagesDesc') },
    { value: '24', suffix: '/7', label: t('stats.support'), description: t('stats.supportDesc') },
  ];

  return (
    <div className="flex flex-col">
      {/* Section 1: Hero - Recruitment-focused with Resume/CV extraction */}
      <HeroRecruitment />

      {/* Section 2: Social Proof - Stats */}
      <section className="py-16 lg:py-20 bg-cream">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-[hsl(var(--gold))] uppercase tracking-wider">
              {t('stats.eyebrow')}
            </span>
            <h2 className="text-3xl lg:text-4xl font-display text-foreground mt-3">
              {t('stats.headline')}
            </h2>
          </div>
          <StatCounter stats={stats} />
        </div>
      </section>

      {/* Section 3: Features - Condensed 3 capabilities preview */}
      <FeatureGrid condensed />

      {/* Section 4: Pricing */}
      <PricingSection />

      {/* Section 5: Final CTA - Call to action */}
      <CTASection />
    </div>
  );
}
