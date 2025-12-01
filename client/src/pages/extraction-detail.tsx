import { useLanguage } from "@/lib/i18n";
import { useDateFormatter } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getExtraction } from "@/lib/api";
import { Link, useParams } from "wouter";
import { DocumentPreview } from "@/components/DocumentPreview";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { StructuredResultsViewer } from "@/components/StructuredResultsViewer";
import type { DocumentType } from "@/lib/api";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Document } from "@shared/schema";
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

  // Fetch document if documentId exists
  const { data: documentData } = useQuery({
    queryKey: ['document', extraction?.documentId],
    queryFn: async () => {
      if (!extraction?.documentId) return null;
      const res = await fetch(`/api/documents/${extraction.documentId}`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      return res.json() as Promise<{ document: Document }>;
    },
    enabled: !!extraction?.documentId,
  });

  const document = documentData?.document;

  // Create a File object from document if available (for DocumentPreview)
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    if (document?.objectPath) {
      // objectPath is already in format /objects/... so use it directly
      const objectUrl = document.objectPath.startsWith('/objects') 
        ? document.objectPath 
        : `/objects/${document.objectPath}`;
      
      // Fetch document from GCS
      fetch(objectUrl, {
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
          return res.blob();
        })
        .then(blob => {
          const file = new File([blob], document.fileName, { type: document.mimeType });
          setDocumentFile(file);
        })
        .catch(err => {
          console.error('Failed to load document:', err);
          setDocumentFile(null);
        });
    } else {
      setDocumentFile(null);
    }
  }, [document]);

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

      {/* Main Content - Side by Side */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel: Document Preview */}
        <ResizablePanel defaultSize={35} minSize={30}>
          <Card className="flex flex-col overflow-hidden h-full">
            <CardHeader className="border-b bg-muted/30 py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('docs.original_document') || 'Original Document'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 relative bg-muted/10 overflow-hidden">
              {documentFile ? (
                <DocumentPreview file={documentFile} className="h-full" />
              ) : document ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Loading document...</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('docs.no_original') || 'Original document not available'}</p>
                    <p className="text-xs mt-1">{t('docs.no_original_desc') || 'This extraction was created before document storage was implemented'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </ResizablePanel>

        <ResizableHandle 
          withHandle 
          className="w-1.5 bg-border/30 hover:bg-border/60 cursor-col-resize transition-colors"
        />

        {/* Right Panel: Extracted Data */}
        <ResizablePanel defaultSize={65} minSize={30}>
          <Card className="flex flex-col overflow-hidden h-full">
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
                  documentType={extraction.documentType as DocumentType}
                  className="h-full"
                />
              )}
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

