import { motion } from 'framer-motion';
import { Shield, Lock, Trash2, ShieldCheck, FileCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

const securityFeatures = [
  {
    icon: Lock,
    titleKey: 'security.encryption_title',
    descKey: 'security.encryption_desc',
  },
  {
    icon: ShieldCheck,
    titleKey: 'security.pdpa_title',
    descKey: 'security.pdpa_desc',
  },
  {
    icon: Trash2,
    titleKey: 'security.autodelete_title',
    descKey: 'security.autodelete_desc',
  },
];

const certifications = [
  { labelKey: 'security.badge_ssl', icon: Lock },
  { labelKey: 'security.badge_soc2', icon: ShieldCheck },
  { labelKey: 'security.badge_iso', icon: Shield },
  { labelKey: 'security.badge_pdpa', icon: FileCheck },
];

export default function Security() {
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
              {t('security.eyebrow')}
            </span>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-display text-foreground mt-3 mb-6">
              {t('security.title')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('security.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Security Features Grid */}
      <section className="py-16 lg:py-24 bg-section-dark relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--gold))]/5 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-6">
          {/* Shield Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-12"
          >
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 glow-gold">
              <Shield className="h-10 w-10 text-[hsl(var(--gold))]" />
            </div>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {securityFeatures.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 border border-white/10 mb-6">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-white/60 leading-relaxed">
                  {t(feature.descKey)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications Section */}
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
              {t('security.certifications_eyebrow')}
            </span>
            <h2 className="text-3xl lg:text-4xl font-display text-foreground mt-3 mb-4">
              {t('security.certifications_title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('security.certifications_subtitle')}
            </p>
          </motion.div>

          {/* Certification Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto"
          >
            {certifications.map((cert, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-center gap-3 px-6 py-4 bg-white rounded-xl border border-border/50 shadow-sm hover:shadow-md hover:border-[hsl(var(--gold))]/30 transition-all"
              >
                <div className="h-10 w-10 rounded-lg bg-[hsl(var(--gold))]/10 flex items-center justify-center">
                  <cert.icon className="h-5 w-5 text-[hsl(var(--gold))]" />
                </div>
                <span className="font-semibold text-foreground">{t(cert.labelKey)}</span>
              </motion.div>
            ))}
          </motion.div>
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
              {t('security.cta_title')}
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
              {t('security.cta_subtitle')}
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
                {t('security.cta_primary')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-10 text-lg border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  {t('security.cta_secondary')}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
