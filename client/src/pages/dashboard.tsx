import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  ArrowRight,
  Clock,
  BarChart3,
  Files,
} from 'lucide-react';
import { Link } from 'wouter';
import { staggerContainer, staggerItem, cardHover } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { getTemplates } from '@/lib/templates';
import { useQuery } from '@tanstack/react-query';
import { getExtractions } from '@/lib/api';
import { useDateFormatter } from '@/lib/date-utils';

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { formatDate, formatRelativeTime } = useDateFormatter();

  // Fetch recent extractions
  const { data: recentData, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['extractions', 'recent'],
    queryFn: () => getExtractions(3),
  });

  const recentDocs = recentData?.extractions || [];

  // Get featured templates in specific order: Resume, Bank, Contract, Invoice, PO
  const allTemplates = getTemplates(t);
  const featuredIds = ['resume', 'bank', 'contract', 'invoice', 'po'];
  const featuredTemplates = featuredIds
    .map(id => allTemplates.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .map(template => {
      // Map colors to dashboard style with gold accent on hover
      const colorMap: Record<string, string> = {
        'bg-teal-100 text-teal-600': 'bg-teal-500/10 text-teal-600',
        'bg-orange-100 text-orange-600': 'bg-amber-500/10 text-amber-600',
        'bg-green-100 text-green-600': 'bg-emerald-500/10 text-emerald-600',
        'bg-purple-100 text-purple-600': 'bg-violet-500/10 text-violet-600',
        'bg-pink-100 text-pink-600': 'bg-pink-500/10 text-pink-600',
      };
      return {
        ...template,
        color: colorMap[template.color] || template.color
      };
    });

  const usagePercent = user ? (user.monthlyUsage / user.monthlyLimit) * 100 : 0;
  
  const displayName = user?.firstName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm mb-1">Good morning, {displayName}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{t('dash.welcome')}</h1>
      </div>

      {/* Featured Templates Section - Hero Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">{t('dash.featured_templates')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('dash.templates_subtitle') || 'AI-powered extraction for your documents'}</p>
          </div>
        </div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {featuredTemplates.map((template) => (
            <motion.div key={template.id} variants={staggerItem}>
              <Link href={`/extraction/${template.id}`}>
                <motion.div {...cardHover}>
                  <Card className="hover:border-[hsl(var(--gold))]/40 hover:shadow-[0_0_20px_-5px_hsl(var(--gold)/0.15)] transition-all duration-300 cursor-pointer group">
                    <CardContent className="p-6 flex items-center gap-5">
                      <div
                        className={cn(
                          'h-16 w-16 rounded-2xl flex items-center justify-center flex-shrink-0',
                          'transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg',
                          template.color
                        )}
                      >
                        <template.icon className="h-8 w-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base mb-1 group-hover:text-[hsl(var(--gold))] transition-colors">{template.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{template.desc}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-[hsl(var(--gold))] group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Secondary Grid: New Extraction + Usage */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* New Extraction Card - Compact */}
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <Link href="/extraction/general">
              <div className="flex items-center gap-4 group cursor-pointer">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base group-hover:text-primary transition-colors">{t('nav.general')}</h3>
                  <p className="text-sm text-muted-foreground">{t('dash.general_desc')}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Usage Card - Compact */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{t('common.usage')}</span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{user?.monthlyUsage}</span>
                <span className="text-sm text-muted-foreground">/ {user?.monthlyLimit}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                />
              </div>
              {usagePercent > 80 && (
                <Button variant="outline" size="sm" className="w-full mt-2">
                  {t('common.upgrade')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('dash.recent')}</h2>
          {recentDocs.length > 0 && (
            <Link href="/history" className="text-sm text-primary hover:underline flex items-center">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          )}
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoadingRecent ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <p className="text-sm">{t('empty.no_history')}</p>
                <p className="text-xs mt-1">{t('empty.no_history_desc')}</p>
              </div>
            ) : (
              <motion.div
                className="divide-y"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {recentDocs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    variants={staggerItem}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-muted rounded-xl">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{doc.fileName}</div>
                        <div className="text-xs text-muted-foreground capitalize">{doc.documentType}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Files className="mr-1 h-3 w-3" />
                        {doc.pagesProcessed}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="mr-1.5 h-3 w-3" />
                        {formatRelativeTime(new Date(doc.createdAt))}
                      </div>
                      <Badge variant={doc.status === 'completed' ? 'success' : doc.status === 'processing' ? 'default' : 'warning'}>
                        {doc.status}
                      </Badge>
                      <Link href="/history">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
