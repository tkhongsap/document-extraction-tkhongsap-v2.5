import { motion } from 'framer-motion';
import { Shield, Lock, Trash2, FileCheck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface SecuritySectionProps {
  className?: string;
}

export function SecuritySection({ className }: SecuritySectionProps) {
  const { t } = useLanguage();

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

  const badges = [
    { label: 'SSL Secured', icon: Lock },
    { label: 'SOC 2 Type II', icon: ShieldCheck },
    { label: 'ISO 27001', icon: Shield },
    { label: 'PDPA Compliant', icon: FileCheck },
  ];

  return (
    <section className={cn('py-24 lg:py-32 bg-section-dark relative overflow-hidden', className)}>
      {/* Background effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--gold))]/5 rounded-full blur-3xl" />

      <div className="container relative mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          {/* Shield Icon with Glow */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 mb-6 glow-gold"
          >
            <Shield className="h-10 w-10 text-[hsl(var(--gold))]" />
          </motion.div>

          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display text-white mb-4">
            {t('security.title')}
          </h2>
          <p className="text-lg text-white/60">
            {t('security.subtitle')}
          </p>
        </motion.div>

        {/* Security Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
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

        {/* Badge Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {badges.map((badge, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 border border-white/10 text-white/80"
            >
              <badge.icon className="h-4 w-4 text-[hsl(var(--gold))]" />
              <span className="text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
