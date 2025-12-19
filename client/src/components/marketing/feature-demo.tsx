import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface DemoField {
  label: string;
  value: string;
  confidence: 'high' | 'medium';
}

interface DemoTemplate {
  id: string;
  name: string;
  nameTh: string;
  fields: DemoField[];
}

const demoTemplates: DemoTemplate[] = [
  {
    id: 'bank',
    name: 'Bank',
    nameTh: 'ธนาคาร',
    fields: [
      { label: 'Account Name', value: 'ABC Company Limited', confidence: 'high' },
      { label: 'Account No.', value: '123-4-56789-0', confidence: 'high' },
      { label: 'Opening Balance', value: '฿ 1,234,567.89', confidence: 'high' },
      { label: 'Closing Balance', value: '฿ 1,456,789.12', confidence: 'high' },
    ],
  },
  {
    id: 'invoice',
    name: 'Invoice',
    nameTh: 'ใบแจ้งหนี้',
    fields: [
      { label: 'Vendor', value: 'Tech Solutions Co., Ltd.', confidence: 'high' },
      { label: 'Invoice No.', value: 'INV-2024-0847', confidence: 'high' },
      { label: 'Amount', value: '฿ 45,750.00', confidence: 'high' },
      { label: 'Due Date', value: '15 Dec 2024', confidence: 'medium' },
    ],
  },
  {
    id: 'contract',
    name: 'Contract',
    nameTh: 'สัญญา',
    fields: [
      { label: 'Contract Type', value: 'Service Agreement', confidence: 'medium' },
      { label: 'Party A', value: 'ABC Corporation', confidence: 'high' },
      { label: 'Party B', value: 'XYZ Services Ltd.', confidence: 'high' },
      { label: 'Contract Value', value: '฿ 2,400,000.00', confidence: 'high' },
    ],
  },
  {
    id: 'any',
    name: 'Any',
    nameTh: 'อื่นๆ',
    fields: [
      { label: 'Document Type', value: 'Purchase Order', confidence: 'high' },
      { label: 'Reference', value: 'PO-2024-1234', confidence: 'high' },
      { label: 'Total Amount', value: '฿ 128,500.00', confidence: 'high' },
      { label: 'Date', value: '20 Dec 2024', confidence: 'medium' },
    ],
  },
];

interface FeatureDemoProps {
  className?: string;
}

export function FeatureDemo({ className }: FeatureDemoProps) {
  const { t, language } = useLanguage();
  const [activeTemplate, setActiveTemplate] = useState<DemoTemplate | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleTemplateClick = (template: DemoTemplate) => {
    setIsProcessing(true);
    setActiveTemplate(null);

    setTimeout(() => {
      setIsProcessing(false);
      setActiveTemplate(template);
    }, 1200);
  };

  const handleReset = () => {
    setActiveTemplate(null);
  };

  return (
    <div className={cn('', className)}>
      {/* Drop Zone / Results Area */}
      <div className="mb-6">
        <AnimatePresence mode="wait">
          {!activeTemplate && !isProcessing && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
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
              className={cn(
                'h-48 rounded-xl border-2 border-dashed transition-all duration-200',
                'flex flex-col items-center justify-center gap-3 cursor-pointer',
                isDragOver
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
              onClick={() => handleTemplateClick(demoTemplates[0])}
            >
              <Upload className={cn(
                'h-6 w-6 transition-colors',
                isDragOver ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className="text-sm text-muted-foreground">
                {t('demo.drop')}
              </span>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-48 rounded-xl bg-muted/30 flex flex-col items-center justify-center gap-3"
            >
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">
                {t('demo.processing')}
              </span>
            </motion.div>
          )}

          {activeTemplate && !isProcessing && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('extract.field')}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('extract.value')}
                  </span>
                </div>
              </div>

              {/* Data Rows */}
              <div className="divide-y divide-border">
                {activeTemplate.fields.map((field, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        field.confidence === 'high' ? 'bg-emerald-500' : 'bg-amber-500'
                      )} />
                      <span className="text-sm text-muted-foreground">{field.label}</span>
                    </div>
                    <span className="text-sm font-medium">{field.value}</span>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={handleReset}
                  className="text-xs text-primary hover:underline"
                >
                  {t('demo.try_another')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Template Pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {demoTemplates.map((template) => {
          const isActive = activeTemplate?.id === template.id;
          const displayName = language === 'th' ? template.nameTh : template.name;

          return (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              disabled={isProcessing}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
