import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

interface Testimonial {
  quote: string;
  author: string;
  title: string;
  company: string;
  avatar?: string;
  rating?: number;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  autoPlayInterval?: number;
  className?: string;
}

export function TestimonialCarousel({
  testimonials,
  autoPlayInterval = 5000,
  className,
}: TestimonialCarouselProps) {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (autoPlayInterval <= 0) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlayInterval, testimonials.length]);

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  const testimonial = testimonials[current];

  return (
    <section className={cn('py-24 lg:py-32 bg-cream', className)}>
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
            {t('testimonials.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('testimonials.subtitle')}
          </p>
        </motion.div>

        {/* Testimonial Card */}
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-white rounded-3xl shadow-xl border border-border/50 p-8 lg:p-12">
            {/* Large Quote Mark */}
            <div className="absolute top-8 left-8 lg:top-12 lg:left-12">
              <Quote className="h-12 w-12 text-[hsl(var(--gold))]/20" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10"
              >
                {/* Quote */}
                <blockquote className="text-xl lg:text-2xl font-display italic text-foreground leading-relaxed mb-8 pl-8">
                  "{testimonial.quote}"
                </blockquote>

                {/* Author Info */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pl-8">
                  {/* Avatar */}
                  <div className="h-14 w-14 rounded-full bg-[hsl(var(--gold))]/10 flex items-center justify-center text-[hsl(var(--gold))] font-semibold text-lg border-2 border-[hsl(var(--gold))]/20">
                    {testimonial.avatar ? (
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.author}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      testimonial.author.charAt(0)
                    )}
                  </div>

                  <div className="text-center sm:text-left">
                    <div className="font-semibold text-foreground text-lg">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.title}, {testimonial.company}
                    </div>

                    {/* Star Rating */}
                    {testimonial.rating && (
                      <div className="flex gap-0.5 mt-2 justify-center sm:justify-start">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-4 w-4',
                              i < testimonial.rating!
                                ? 'fill-[hsl(var(--gold))] text-[hsl(var(--gold))]'
                                : 'fill-muted text-muted'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="h-10 w-10 rounded-full border border-border hover:bg-[hsl(var(--gold))]/10 hover:border-[hsl(var(--gold))]/30"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    i === current
                      ? 'bg-[hsl(var(--gold))] w-8'
                      : 'bg-muted-foreground/20 hover:bg-muted-foreground/40 w-2'
                  )}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="h-10 w-10 rounded-full border border-border hover:bg-[hsl(var(--gold))]/10 hover:border-[hsl(var(--gold))]/30"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
