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
import type { DocumentType, ExtractedField } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToJSON, exportToCSV, exportToExcel, exportToMarkdown, exportToText } from "@/lib/export";

// Keys that should be treated as arrays and not converted to header fields
const RESUME_ARRAY_KEYS = [
  "experience", "education", "skills", "certifications", 
  "languages", "languagesWithProficiency", "projects"
];

/**
 * Convert raw extractedData to headerFields format
 * This is needed when loading from history where we only have raw data
 */
function convertToHeaderFields(
  data: Record<string, unknown>,
  documentType: DocumentType,
  confidenceScores?: Record<string, number>
): ExtractedField[] {
  const headerFields: ExtractedField[] = [];
  const arrayKeysToSkip = documentType === "resume" ? RESUME_ARRAY_KEYS : [];
  
  function flattenObject(
    obj: Record<string, unknown>,
    prefix: string = ""
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      // Skip array keys for resumes
      if (arrayKeysToSkip.includes(key)) continue;
      // Skip null/undefined values
      if (value === null || value === undefined) continue;
      // Skip arrays
      if (Array.isArray(value)) continue;
      
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === "object" && value !== null) {
        // Recursively flatten nested objects
        flattenObject(value as Record<string, unknown>, fullKey);
      } else {
        // Get confidence score if available
        const confidence = confidenceScores?.[fullKey] ?? confidenceScores?.[key] ?? 0.9;
        headerFields.push({
          key: fullKey,
          value: String(value),
          confidence: confidence
        });
      }
    }
  }
  
  flattenObject(data);
  return headerFields;
}

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

  const extractedData = extraction.extractedData as Record<string, unknown>;
  
  // Convert raw extractedData to headerFields if not already present
  // This happens when loading from history where we only have raw data
  const headerFields = extractedData?.headerFields as ExtractedField[] | undefined
    ?? convertToHeaderFields(
        extractedData || {},
        extraction.documentType as DocumentType,
        extractedData?.confidenceScores as Record<string, number> | undefined
      );

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
              headerFields={headerFields}
              lineItems={(extractedData?.lineItems as Array<Record<string, unknown>>) || []}
              extractedData={extractedData}
              confidenceScores={extractedData?.confidenceScores as Record<string, number> | undefined}
              documentType={extraction.documentType as DocumentType}
              className="h-full"
              fileName={extraction.fileName}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

