import { useLanguage } from "@/lib/i18n";
import { useDateFormatter } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileText, 
  RefreshCw, 
  Search,
  Plus
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDocumentsWithExtractions } from "@/lib/api";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { exportToJSON, exportToCSV, exportToExcel, exportToMarkdown, exportToText } from "@/lib/export";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getDocumentTypeIcon(type: string) {
  return FileText; // Default icon, can be enhanced later
}

export default function History() {
  const { t } = useLanguage();
  const { formatDate, formatRelativeTime } = useDateFormatter();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ['documents-with-extractions'],
    queryFn: () => getDocumentsWithExtractions(20),
  });

  const documents = data?.documents || [];

  // Filter documents by filename
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.fileName.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.history')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('docs.subtitle') || 'View and manage your extracted documents'}
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('docs.search_placeholder') || 'Search documents...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Cards */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="text-center p-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {searchQuery 
                ? (t('docs.no_results') || 'No documents found')
                : (t('docs.empty_title') || 'No documents yet')
              }
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? (t('docs.no_results_desc') || 'Try a different search term')
                : (t('docs.empty_desc') || 'Upload your first document to get started')
              }
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link href="/extraction/general">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('docs.upload_new') || 'New Upload'}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => {
            const TypeIcon = getDocumentTypeIcon(doc.documentType);
            const latest = doc.latestExtraction;
            
            return (
              <Card key={doc.fileName} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Document Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base mb-1 truncate">{doc.fileName}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className="capitalize">{doc.documentType}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            {doc.totalExtractions} {t('docs.extractions_count') || 'extraction(s)'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Latest: {formatRelativeTime(new Date(latest.createdAt))}
                          </span>
                          <Badge 
                            variant={latest.status === 'completed' ? 'success' : latest.status === 'processing' ? 'default' : 'warning'}
                          >
                            {latest.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <Link href={`/extraction/${doc.documentType}`}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t('docs.reextract') || 'Re-extract'}
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled>
                            <Download className="mr-2 h-4 w-4" />
                            {t('docs.download') || 'Download'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled onClick={() => exportToJSON(doc.latestExtraction)}>
                            {t('export.json') || 'JSON'}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled onClick={() => exportToCSV(doc.latestExtraction)}>
                            {t('export.csv') || 'CSV'}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled onClick={() => exportToExcel(doc.latestExtraction)}>
                            {t('export.excel') || 'Excel'}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled onClick={() => exportToMarkdown(doc.latestExtraction)}>
                            {t('export.markdown') || 'Markdown'}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled onClick={() => exportToText(doc.latestExtraction)}>
                            {t('export.text') || 'Text'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
