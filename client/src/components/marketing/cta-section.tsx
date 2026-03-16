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
    window.location.href = "/login";
  };

  return (
    <section className={cn('py-24 lg:py-32 relative overflow-hidden', className)}
      style={{
        background: 'linear-gradient(180deg, hsl(222 47% 8%) 0%, hsl(230 50% 12%) 50%, hsl(240 40% 15%) 100%)'
      }}
    >
      {/* Brand accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--brand))]/40 to-transparent" />

      {/* Background effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-[150px]" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-violet-500/3 rounded-full blur-[120px]" />

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
            className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 mb-8"
          >
            <Sparkles className="h-7 w-7 text-blue-400" />
          </motion.div>

          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display text-white mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-xl mx-auto">
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
              className="h-14 px-10 text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold shadow-xl shadow-blue-600/25 border border-blue-400/20 animate-pulse-glow transition-all duration-300"
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
            className="text-slate-500 text-sm mt-6"
          >
            {t('cta.fine_print')}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
