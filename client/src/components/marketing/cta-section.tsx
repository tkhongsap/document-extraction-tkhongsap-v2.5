import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface CTASectionProps {
  className?: string;
}

export function CTASection({ className }: CTASectionProps) {
  const { t } = useLanguage();
  
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <section className={cn('py-24 lg:py-32 bg-section-dark relative overflow-hidden', className)}>
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
            {t('cta.title')}
          </h2>
          <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
            {t('cta.subtitle')}
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              size="lg"
              onClick={handleLogin}
              className="h-14 px-10 text-lg bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-[hsl(192_85%_12%)] font-semibold shadow-xl shadow-[hsl(var(--gold))]/30 animate-pulse-glow"
            >
              {t('cta.button')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-white/40 text-sm mt-6"
          >
            {t('cta.fine_print')}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
