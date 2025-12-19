import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, Check, FileText, Sparkles, Building2, Receipt, ScrollText, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

interface DemoField {
  label: string;
  value: string;
  confidence: 'high' | 'medium';
}

interface DemoTemplate {
  id: string;
  nameKey: string;
  icon: typeof FileText;
  fields: DemoField[];
}

const demoTemplates: DemoTemplate[] = [
  {
    id: 'invoice',
    nameKey: 'demo.tab_invoice',
    icon: Receipt,
    fields: [
      { label: 'Vendor Name', value: 'Tech Solutions Co., Ltd.', confidence: 'high' },
      { label: 'Invoice Number', value: 'INV-2024-0847', confidence: 'high' },
      { label: 'Total Amount', value: '฿ 45,750.00', confidence: 'high' },
      { label: 'Tax ID', value: '0105556123456', confidence: 'high' },
      { label: 'Due Date', value: '15 December 2024', confidence: 'medium' },
    ],
  },
  {
    id: 'bank',
    nameKey: 'demo.tab_bank',
    icon: Building2,
    fields: [
      { label: 'Account Name', value: 'ABC Company Limited', confidence: 'high' },
      { label: 'Account Number', value: '123-4-56789-0', confidence: 'high' },
      { label: 'Statement Period', value: 'Nov 1 - Nov 30, 2024', confidence: 'high' },
      { label: 'Opening Balance', value: '฿ 1,234,567.89', confidence: 'high' },
      { label: 'Closing Balance', value: '฿ 1,456,789.12', confidence: 'high' },
    ],
  },
  {
    id: 'contract',
    nameKey: 'demo.tab_contract',
    icon: ScrollText,
    fields: [
      { label: 'Contract Type', value: 'Service Agreement', confidence: 'high' },
      { label: 'Party A', value: 'ABC Corporation', confidence: 'high' },
      { label: 'Party B', value: 'XYZ Services Ltd.', confidence: 'high' },
      { label: 'Effective Date', value: '1 January 2025', confidence: 'medium' },
      { label: 'Contract Value', value: '฿ 2,400,000.00', confidence: 'high' },
    ],
  },
  {
    id: 'po',
    nameKey: 'demo.tab_po',
    icon: FileCheck,
    fields: [
      { label: 'PO Number', value: 'PO-2024-1234', confidence: 'high' },
      { label: 'Supplier', value: 'Global Supplies Inc.', confidence: 'high' },
      { label: 'Total Items', value: '15 line items', confidence: 'high' },
      { label: 'Total Amount', value: '฿ 128,500.00', confidence: 'high' },
      { label: 'Delivery Date', value: '20 December 2024', confidence: 'medium' },
    ],
  },
];

interface DemoInteractiveProps {
  className?: string;
}

export function DemoInteractive({ className }: DemoInteractiveProps) {
  const { t } = useLanguage();
  const [activeTemplate, setActiveTemplate] = useState<DemoTemplate | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleTemplateClick = (template: DemoTemplate) => {
    setIsProcessing(true);
    setActiveTemplate(null);

    setTimeout(() => {
      setIsProcessing(false);
      setActiveTemplate(template);
    }, 1500);
  };

  const handleReset = () => {
    setActiveTemplate(null);
  };

  return (
    <section className={cn('py-24 lg:py-32 bg-section-dark relative overflow-hidden', className)}>
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(var(--gold))]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[hsl(192_70%_30%)]/10 rounded-full blur-3xl" />

      <div className="container relative mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-display text-white mb-4">
            {t('demo.section_title')}
          </h2>
          <p className="text-lg text-white/60">
            {t('demo.section_subtitle')}
          </p>
        </motion.div>

        {/* Demo Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          {/* Template Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {demoTemplates.map((template) => {
              const Icon = template.icon;
              const isActive = activeTemplate?.id === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  disabled={isProcessing}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium',
                    'transition-all duration-300 disabled:opacity-50',
                    isActive
                      ? 'bg-[hsl(var(--gold))] text-[hsl(192_85%_12%)] shadow-lg shadow-[hsl(var(--gold))]/20'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-white/10'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(template.nameKey)}
                </button>
              );
            })}
          </div>

          {/* Main Demo Area */}
          <div className="glass-dark rounded-3xl p-8 lg:p-10">
            <AnimatePresence mode="wait">
              {/* Idle State - Drop Zone */}
              {!activeTemplate && !isProcessing && (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    handleTemplateClick(demoTemplates[0]);
                  }}
                  onClick={() => handleTemplateClick(demoTemplates[0])}
                  className={cn(
                    'h-64 rounded-2xl border-2 border-dashed cursor-pointer',
                    'flex flex-col items-center justify-center gap-4',
                    'transition-all duration-300',
                    isDragOver
                      ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10 scale-[1.02]'
                      : 'border-white/20 hover:border-[hsl(var(--gold))]/50 hover:bg-white/5'
                  )}
                >
                  <div className={cn(
                    'h-16 w-16 rounded-2xl flex items-center justify-center',
                    'transition-colors duration-300',
                    isDragOver ? 'bg-[hsl(var(--gold))]/20' : 'bg-white/10'
                  )}>
                    <Upload className={cn(
                      'h-8 w-8 transition-colors',
                      isDragOver ? 'text-[hsl(var(--gold))]' : 'text-white/60'
                    )} />
                  </div>
                  <div className="text-center">
                    <p className="text-white/80 font-medium mb-1">{t('demo.drop_title')}</p>
                    <p className="text-white/40 text-sm">{t('demo.drop_subtitle')}</p>
                  </div>
                </motion.div>
              )}

              {/* Processing State */}
              {isProcessing && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-64 rounded-2xl bg-white/5 flex flex-col items-center justify-center gap-4"
                >
                  <div className="relative">
                    <Loader2 className="h-12 w-12 text-[hsl(var(--gold))] animate-spin" />
                    <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-[hsl(var(--gold))] animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium mb-1">{t('demo.processing_title')}</p>
                    <p className="text-white/40 text-sm">{t('demo.processing_subtitle')}</p>
                  </div>
                </motion.div>
              )}

              {/* Results State */}
              {activeTemplate && !isProcessing && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[hsl(var(--gold))]/20 flex items-center justify-center">
                        <activeTemplate.icon className="h-5 w-5 text-[hsl(var(--gold))]" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{t(activeTemplate.nameKey)}</p>
                        <p className="text-white/40 text-sm">{t('demo.extraction_complete')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30">
                      <Sparkles className="h-4 w-4 text-[hsl(var(--gold))]" />
                      <span className="text-sm font-semibold text-[hsl(var(--gold))]">99.2% {t('demo.accuracy')}</span>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-white/10 text-xs font-medium text-white/40 uppercase tracking-wider">
                      <span>{t('extract.field')}</span>
                      <span>{t('extract.value')}</span>
                      <span className="text-right">{t('extract.confidence')}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {activeTemplate.fields.map((field, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.08 }}
                          className="grid grid-cols-3 gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
                        >
                          <span className="text-white/60 text-sm">{field.label}</span>
                          <span className="text-white font-medium text-sm">{field.value}</span>
                          <div className="flex items-center justify-end gap-2">
                            <div className={cn(
                              'h-2 w-2 rounded-full',
                              field.confidence === 'high' ? 'bg-emerald-500' : 'bg-amber-500'
                            )} />
                            <span className={cn(
                              'text-xs',
                              field.confidence === 'high' ? 'text-emerald-400' : 'text-amber-400'
                            )}>
                              {field.confidence === 'high' ? 'High' : 'Medium'}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Reset Button */}
                  <div className="mt-6 text-center">
                    <Button
                      variant="ghost"
                      onClick={handleReset}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      {t('demo.try_another')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
