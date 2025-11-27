import { useLanguage } from '@/lib/i18n';
import { HeroEnterprise } from '@/components/marketing/hero-enterprise';
import { LogoStrip } from '@/components/marketing/logo-strip';
import { StatCounter } from '@/components/marketing/stat-counter';
import { FeatureGrid } from '@/components/marketing/feature-grid';
import { DemoInteractive } from '@/components/marketing/demo-interactive';
import { ComparisonSection } from '@/components/marketing/comparison-section';
import { TestimonialCarousel } from '@/components/marketing/testimonial-carousel';
import { SecuritySection } from '@/components/marketing/security-section';
import { PricingSection } from '@/components/marketing/pricing-section';
import { CTASection } from '@/components/marketing/cta-section';

export default function Home() {
  const { t } = useLanguage();

  const stats = [
    { value: '99.2', suffix: '%', label: t('stats.accuracy'), highlight: true },
    { value: '50M', suffix: '+', label: t('stats.pages') },
    { value: '500', suffix: '+', label: t('stats.enterprises') },
    { value: '24', suffix: '/7', label: t('stats.support') },
  ];

  const testimonials = [
    {
      quote: t('testimonials.quote_1'),
      author: t('testimonials.author_1'),
      title: t('testimonials.title_1'),
      company: t('testimonials.company_1'),
      rating: 5,
    },
    {
      quote: t('testimonials.quote_2'),
      author: t('testimonials.author_2'),
      title: t('testimonials.title_2'),
      company: t('testimonials.company_2'),
      rating: 5,
    },
    {
      quote: t('testimonials.quote_3'),
      author: t('testimonials.author_3'),
      title: t('testimonials.title_3'),
      company: t('testimonials.company_3'),
      rating: 5,
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Section 1: Hero - Dark dramatic opening with floating cards */}
      <HeroEnterprise />

      {/* Section 2: Social Proof - Logo strip + Stats */}
      <section className="py-16 lg:py-20 bg-cream">
        <div className="container mx-auto px-6">
          <LogoStrip title={t('logos.title')} className="mb-16" />
          <StatCounter stats={stats} />
        </div>
      </section>

      {/* Section 3: Features - 6 capabilities grid */}
      <FeatureGrid />

      {/* Section 4: Demo - Interactive document extraction */}
      <DemoInteractive />

      {/* Section 5: Comparison - Before/After transformation */}
      <ComparisonSection />

      {/* Section 6: Testimonials - Customer success stories */}
      <TestimonialCarousel testimonials={testimonials} />

      {/* Section 7: Security - Trust & compliance */}
      <SecuritySection />

      {/* Section 8: Pricing - Two tiers */}
      <PricingSection />

      {/* Section 9: Final CTA - Call to action */}
      <CTASection />
    </div>
  );
}
