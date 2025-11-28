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
  UploadCloud,
  BarChart3,
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

  // Get top 4 templates for quick access (excluding 'general')
  const allTemplates = getTemplates(t);
  const quickTemplates = allTemplates.filter(t => t.id !== 'general').slice(0, 4);
  const templates = quickTemplates.map(template => {
    // Map colors to dashboard style
    const colorMap: Record<string, string> = {
      'bg-blue-100 text-blue-600': 'bg-primary/10 text-primary',
      'bg-green-100 text-green-600': 'bg-emerald-500/10 text-emerald-600',
      'bg-purple-100 text-purple-600': 'bg-violet-500/10 text-violet-600',
      'bg-orange-100 text-orange-600': 'bg-amber-500/10 text-amber-600',
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm mb-1">Good morning, {displayName}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{t('dash.welcome')}</h1>
        </div>
        <Button asChild size="lg">
          <Link href="/extraction/general">
            <FileText className="mr-2 h-4 w-4" />
            {t('dash.quick_start')}
          </Link>
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Upload Zone Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('nav.general')}</CardTitle>
                <CardDescription>{t('dash.general_desc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/extraction/general">
              <motion.div
                className={cn(
                  'h-40 rounded-2xl border-2 border-dashed border-border/70',
                  'flex flex-col items-center justify-center gap-3',
                  'bg-muted/30 hover:bg-muted/50 hover:border-primary/30',
                  'transition-all duration-200 cursor-pointer group'
                )}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                <div className="h-12 w-12 rounded-2xl bg-background shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {t('extract.upload_title')}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {t('extract.upload_desc')}
                </p>
              </motion.div>
            </Link>
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t('common.usage')}</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <motion.div
                  className="text-4xl font-semibold tracking-tight tabular-nums"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {user?.monthlyUsage}
                </motion.div>
                <p className="text-sm text-muted-foreground">of {user?.monthlyLimit} pages</p>
              </div>

              <div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>0</span>
                  <span>{user?.monthlyLimit} limit</span>
                </div>
              </div>

              {usagePercent > 80 && (
                <Button variant="outline" size="sm" className="w-full">
                  {t('common.upgrade')}
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{t('nav.templates')}</h2>
          <Link href="/templates" className="text-sm text-primary hover:underline flex items-center">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {templates.map((template) => (
            <motion.div key={template.id} variants={staggerItem}>
              <Link href={`/extraction/${template.id}`}>
                <motion.div {...cardHover}>
                  <Card className="hover:border-primary/30 transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                      <div
                        className={cn(
                          'h-14 w-14 rounded-2xl flex items-center justify-center',
                          'transition-transform duration-200 group-hover:scale-110',
                          template.color
                        )}
                      >
                        <template.icon className="h-6 w-6" />
                      </div>
                      <span className="font-medium text-sm">{template.name}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
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
