import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Shield, Lock, FileCheck, Sparkles, ArrowRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, rotateX: -15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: 0.7,
      delay: 0.4 + i * 0.15,
      ease: [0.16, 1, 0.3, 1]
    }
  })
};

interface HeroEnterpriseProps {
  className?: string;
}

export function HeroEnterprise({ className }: HeroEnterpriseProps) {
  const { t } = useLanguage();
  
  const handleLogin = () => {
    window.location.href = "/login";
  };

  const trustIndicators = [
    { icon: Lock, label: t('hero.trust_encryption') },
    { icon: Shield, label: t('hero.trust_pdpa') },
    { icon: FileCheck, label: t('hero.trust_soc2') },
  ];

  return (
    <section className={cn('relative min-h-[90vh] bg-hero-gradient overflow-hidden', className)}>
      {/* Noise overlay for texture */}
      <div className="noise-overlay absolute inset-0" />

      {/* Gradient orbs for visual interest */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-[hsl(var(--gold))]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-[hsl(192_70%_30%)]/20 rounded-full blur-3xl" />

      <div className="container relative mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left: Content */}
          <motion.div
            className="lg:col-span-6 xl:col-span-7 space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Accuracy Badge */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30 text-[hsl(var(--gold))]">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">{t('hero.accuracy_badge')}</span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display text-white leading-[1.1]"
            >
              {t('hero.headline')}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg lg:text-xl text-white/70 max-w-xl leading-relaxed"
            >
              {t('hero.subheadline')}
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                onClick={handleLogin}
                className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-[hsl(192_85%_12%)] h-12 px-8 text-base font-semibold shadow-lg shadow-[hsl(var(--gold))]/20"
              >
                {t('nav.signin')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10 h-12 px-8 text-base"
              >
                <Play className="mr-2 h-4 w-4" />
                {t('hero.cta_secondary')}
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-6 pt-4"
            >
              {trustIndicators.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-white/60">
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Floating Cards Visual */}
          <div className="lg:col-span-6 xl:col-span-5 relative">
            <div className="relative h-[400px] lg:h-[500px]">
              {/* Background glow */}
              <div className="absolute inset-0 bg-[hsl(var(--gold))]/5 rounded-3xl blur-2xl" />

              {/* Card 1: Document */}
              <motion.div
                custom={0}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="absolute top-0 left-0 w-64 glass rounded-2xl p-5 shadow-2xl"
                style={{ perspective: 1000 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Invoice_2024.pdf</div>
                    <div className="text-xs text-muted-foreground">Uploaded</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="h-2 rounded-full bg-muted" style={{ width: `${80 - i * 15}%` }} />
                  ))}
                </div>
              </motion.div>

              {/* Card 2: Processing */}
              <motion.div
                custom={1}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="absolute top-24 left-32 w-56 glass rounded-2xl p-5 shadow-2xl animate-float"
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="h-6 w-6 text-[hsl(var(--gold))]" />
                  </motion.div>
                  <span className="font-semibold text-sm">AI Extracting...</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--primary))]"
                    initial={{ width: '0%' }}
                    animate={{ width: '75%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  />
                </div>
              </motion.div>

              {/* Card 3: Results */}
              <motion.div
                custom={2}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="absolute bottom-0 right-0 w-72 glass rounded-2xl p-5 shadow-2xl border-[hsl(var(--gold))]/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Extracted Data
                  </span>
                  <div className="flex items-center gap-1 text-[hsl(var(--gold))]">
                    <Sparkles className="h-3 w-3" />
                    <span className="text-xs font-semibold">99.2%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Vendor', value: 'Tech Solutions Co.' },
                    { label: 'Amount', value: '฿ 45,750.00' },
                    { label: 'Due Date', value: '15 Dec 2024' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-600">High Confidence</span>
                </div>
              </motion.div>

              {/* Connecting dots/particles */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                <motion.circle
                  cx="160"
                  cy="180"
                  r="4"
                  fill="hsl(var(--gold))"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <motion.circle
                  cx="220"
                  cy="240"
                  r="3"
                  fill="hsl(var(--gold))"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
                <motion.circle
                  cx="280"
                  cy="300"
                  r="4"
                  fill="hsl(var(--gold))"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
