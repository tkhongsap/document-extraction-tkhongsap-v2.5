import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/mock-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Check,
  Zap,
  Shield,
  Globe,
  Lock,
  ArrowRight,
  Clock,
  FileCheck,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { heroContainer, heroItem, staggerContainer, staggerItem, viewportOnce } from '@/lib/animations';
import { TrustBadge, SecurityBadgeRow } from '@/components/marketing/trust-badge';
import { StatCounter } from '@/components/marketing/stat-counter';
import { TestimonialCarousel } from '@/components/marketing/testimonial-carousel';
import { FeatureDemo } from '@/components/marketing/feature-demo';
import { ComparisonTable } from '@/components/marketing/comparison-table';
import { cn } from '@/lib/utils';

const stats = [
  { value: '500+', label: 'Businesses Trust Us' },
  { value: '2M+', label: 'Pages Processed' },
  { value: '99.2%', label: 'Accuracy Rate' },
  { value: '<5s', label: 'Avg. Processing' },
];

const testimonials = [
  {
    quote: 'DocExtract cut our document processing time by 80%. Our accounting team can now focus on analysis instead of data entry.',
    author: 'Somchai Jaidee',
    title: 'CFO',
    company: 'ABC Corporation',
    rating: 5,
  },
  {
    quote: 'The bilingual support is incredible. It handles our Thai invoices and English contracts with the same accuracy.',
    author: 'Nattaya Srisawat',
    title: 'Operations Manager',
    company: 'Global Trade Co.',
    rating: 5,
  },
  {
    quote: 'We process hundreds of bank statements monthly. DocExtract made what took days into a matter of minutes.',
    author: 'Piyawat Wongsawat',
    title: 'Finance Director',
    company: 'Tech Ventures Ltd.',
    rating: 5,
  },
];

const comparisonItems = [
  {
    before: '4+ hours of manual data entry per day',
    after: 'Done in under 5 minutes',
  },
  {
    before: 'Frequent typos and transcription errors',
    after: '99.2% extraction accuracy',
  },
  {
    before: 'Documents scattered across folders',
    after: 'All data organized and searchable',
  },
  {
    before: 'Delayed reports waiting for data',
    after: 'Instant export to Excel/JSON',
  },
];

const securityBadges = ['Bank-grade Encryption', 'PDPA Compliant', 'Auto-delete after 24hrs'];

export default function Home() {
  const { t } = useLanguage();
  const { login } = useAuth();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 gradient-mesh" />

        <div className="container relative mx-auto px-6 py-32 lg:py-40">
          <motion.div
            className="max-w-2xl mx-auto text-center space-y-8"
            variants={heroContainer}
            initial="initial"
            animate="animate"
          >
            {/* Trust badge */}
            <motion.div variants={heroItem}>
              <TrustBadge text="Trusted by 500+ Thai businesses" className="mx-auto" />
            </motion.div>

            {/* Main headline */}
            <motion.h1
              variants={heroItem}
              className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground"
            >
              {t('hero.title')}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={heroItem}
              className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
            >
              {t('hero.subtitle')}
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              variants={heroItem}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <Button size="lg" onClick={() => login()} className="text-base px-8">
                {t('hero.cta')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8">
                See How It Works
              </Button>
            </motion.div>

            {/* Security reassurance */}
            <motion.div
              variants={heroItem}
              className="flex items-center justify-center gap-6 pt-6 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Bank-grade encryption
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                PDPA Compliant
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border/50 bg-muted/20">
        <div className="container mx-auto px-6">
          <StatCounter stats={stats} className="max-w-4xl mx-auto" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 lg:py-32" id="about">
        <div className="container mx-auto px-6">
          <motion.div
            className="max-w-xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Designed for accuracy, built for speed
            </h2>
            <p className="text-lg text-muted-foreground">
              Every feature crafted to save you hours of manual data entry
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={viewportOnce}
          >
            {[
              {
                icon: Zap,
                title: 'Instant Extraction',
                description:
                  'Upload any document and get structured data back in seconds. Powered by advanced AI models.',
              },
              {
                icon: Shield,
                title: 'Enterprise Grade',
                description:
                  'Secure, reliable, and scalable. Built for businesses that process thousands of documents.',
              },
              {
                icon: Globe,
                title: 'Bilingual Support',
                description:
                  'Native support for Thai and English documents, including complex layouts and mixed languages.',
              },
            ].map((feature, i) => (
              <motion.div key={i} variants={staggerItem} className="text-center space-y-4">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-24 lg:py-32 bg-muted/20">
        <div className="container mx-auto px-6">
          <motion.div
            className="max-w-xl mx-auto text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              See the magic in action
            </h2>
            <p className="text-lg text-muted-foreground">
              Watch how DocExtract transforms documents into structured data
            </p>
          </motion.div>

          <FeatureDemo className="max-w-5xl mx-auto" />
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-6">
          <motion.div
            className="max-w-xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              The old way vs. DocExtract
            </h2>
            <p className="text-lg text-muted-foreground">
              Stop wasting time on manual data entry
            </p>
          </motion.div>

          <ComparisonTable
            items={comparisonItems}
            beforeTitle="Manual Data Entry"
            afterTitle="With DocExtract"
            className="max-w-4xl mx-auto"
          />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 lg:py-32 bg-muted/20">
        <div className="container mx-auto px-6">
          <motion.div
            className="max-w-xl mx-auto text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Loved by businesses across Thailand
            </h2>
          </motion.div>

          <TestimonialCarousel testimonials={testimonials} className="max-w-4xl mx-auto" />
        </div>
      </section>

      {/* Security Section */}
      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-6">
          <motion.div
            className="max-w-xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Your documents are safe with us
            </h2>
            <p className="text-lg text-muted-foreground">
              Enterprise-grade security for sensitive business documents
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={viewportOnce}
          >
            {[
              {
                icon: Lock,
                title: 'Bank-grade Encryption',
                description: 'All documents encrypted in transit and at rest with AES-256',
              },
              {
                icon: Trash2,
                title: 'Auto-delete',
                description: 'Documents automatically removed within 24 hours of processing',
              },
              {
                icon: ShieldCheck,
                title: 'PDPA Compliant',
                description: 'Full compliance with Thai Personal Data Protection Act',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                className="text-center p-6 rounded-2xl bg-card border border-border/50"
              >
                <div className="h-12 w-12 mx-auto rounded-xl bg-primary/5 flex items-center justify-center text-primary mb-4">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>

          <SecurityBadgeRow badges={securityBadges} className="max-w-2xl mx-auto" />
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 lg:py-32 bg-muted/20" id="pricing">
        <div className="container mx-auto px-6">
          <motion.div
            className="max-w-xl mx-auto text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              Simple pricing, no surprises. Start free, upgrade when you need more.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={viewportOnce}
          >
            {/* Free Tier */}
            <motion.div variants={staggerItem}>
              <Card className="relative overflow-hidden h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">{t('pricing.free')}</CardTitle>
                  <CardDescription>Perfect for individuals and testing</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">฿0</span>
                    <span className="text-muted-foreground"> / month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {[
                      `100 ${t('pricing.pages_month')}`,
                      'General Extraction',
                      'Standard Support',
                      'JSON Export',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                  <Button className="w-full" variant="outline" onClick={() => login()}>
                    Get Started Free
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Pro Tier */}
            <motion.div variants={staggerItem}>
              <Card
                className={cn(
                  'relative overflow-hidden h-full',
                  'border-primary',
                  'shadow-[0_0_0_1px_hsl(var(--primary)),0_4px_20px_-4px_hsl(var(--primary)/0.2)]'
                )}
              >
                {/* Top accent bar */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-primary/60" />

                {/* Popular badge */}
                <div className="absolute top-4 right-4">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    {t('pricing.most_popular')}
                  </span>
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">{t('pricing.pro')}</CardTitle>
                  <CardDescription>For growing businesses</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">฿990</span>
                    <span className="text-muted-foreground"> / month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {[
                      `1,000 ${t('pricing.pages_month')}`,
                      'All 4 Pro Templates',
                      'Priority Support',
                      'Export to Excel/CSV',
                      'API Access',
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4 flex-col gap-3">
                  <Button className="w-full" onClick={() => login()}>
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    7-day money back guarantee
                  </p>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 lg:py-32">
        <div className="container mx-auto px-6">
          <motion.div
            className="max-w-2xl mx-auto text-center space-y-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Ready to save hours every week?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join 500+ Thai businesses already using DocExtract to streamline their document processing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => login()} className="text-base px-8">
                Start Free - 100 Pages
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required. Free forever on the starter plan.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
