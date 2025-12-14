import { useLanguage } from "@/lib/i18n";
import { useDateFormatter } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getExtraction } from "@/lib/api";
import { Link, useParams } from "wouter";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { StructuredResultsViewer } from "@/components/StructuredResultsViewer";
import type { DocumentType } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToJSON, exportToCSV, exportToExcel, exportToMarkdown, exportToText } from "@/lib/export";

export default function ExtractionDetail() {
  const { t } = useLanguage();
  const { formatDate } = useDateFormatter();
  const { id } = useParams<{ id: string }>();

  const { data: extractionData, isLoading: isLoadingExtraction } = useQuery({
    queryKey: ['extraction', id],
    queryFn: () => getExtraction(id!),
    enabled: !!id,
  });

  const extraction = extractionData?.extraction;
  const isGeneralExtraction = extraction?.documentType === 'general';

  if (isLoadingExtraction) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!extraction) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back') || 'Back'}
          </Link>
        </Button>
        <Card>
          <CardContent className="text-center p-12">
            <p className="text-muted-foreground">Extraction not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const extractedData = extraction.extractedData as any;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.back') || 'Back'}
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{extraction.fileName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="secondary" className="capitalize">
                {extraction.documentType}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDate(new Date(extraction.createdAt))}
              </span>
              <Badge 
                variant={extraction.status === 'completed' ? 'success' : extraction.status === 'processing' ? 'default' : 'warning'}
              >
                {extraction.status}
              </Badge>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              {t('docs.download') || 'Download'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportToJSON(extraction)}>
              {t('export.json') || 'JSON'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToCSV(extraction)}>
              {t('export.csv') || 'CSV'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToExcel(extraction)}>
              {t('export.excel') || 'Excel'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToMarkdown(extraction)}>
              {t('export.markdown') || 'Markdown'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportToText(extraction)}>
              {t('export.text') || 'Text'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content - Full Width */}
      <Card className="flex flex-col overflow-hidden flex-1">
        <CardHeader className="border-b bg-muted/30 py-3">
          <CardTitle className="text-sm font-medium">
            {t('extract.results') || 'Extracted Data'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {isGeneralExtraction ? (
            <MarkdownViewer 
              data={{
                markdown: extractedData?.markdown || '',
                text: extractedData?.text || '',
                pages: extractedData?.pages || [],
                pageCount: extraction.pagesProcessed,
                fileName: extraction.fileName,
                fileSize: extraction.fileSize,
                mimeType: 'application/pdf',
              }}
              className="h-full"
            />
          ) : (
            <StructuredResultsViewer
              headerFields={extractedData?.headerFields || []}
              lineItems={extractedData?.lineItems || []}
              extractedData={extractedData}
              documentType={extraction.documentType as DocumentType}
              className="h-full"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

