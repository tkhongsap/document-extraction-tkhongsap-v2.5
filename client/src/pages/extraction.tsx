import { useLanguage } from "@/lib/i18n";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { UploadCloud, FileText, Loader2, ArrowLeft, Play, X } from "lucide-react";
import { useParams, Link } from "wouter";
import { cn } from "@/lib/utils";
import { getTemplateById } from "@/lib/templates";
import { 
  processTemplateExtraction, 
  processGeneralExtraction, 
  type GeneralExtractionResponse,
  type TemplateExtractionResponse,
  type DocumentType,
} from "@/lib/api";
import { toast } from "sonner";
import { DocumentPreview } from "@/components/DocumentPreview";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { StructuredResultsViewer } from "@/components/StructuredResultsViewer";

export default function Extraction() {
  const { t } = useLanguage();
  const { type } = useParams();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Template-based extraction results (structured data from LlamaExtract)
  const [templateResults, setTemplateResults] = useState<TemplateExtractionResponse | null>(null);
  
  // General extraction results (markdown-based from LlamaParse)
  const [generalResults, setGeneralResults] = useState<GeneralExtractionResponse | null>(null);

  // Check if this is a general extraction
  const isGeneralExtraction = !type || type === 'general';

  // Handle file drop - just store file for preview (two-phase UX for all types)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
    // Clear any previous results
    setTemplateResults(null);
    setGeneralResults(null);
    // Two-phase UX: don't auto-process, wait for user to click Extract button
  }, []);

  // Handle template-based extraction with LlamaExtract (on button click)
  const handleTemplateExtraction = async () => {
    if (!file || !type) return;
    
    // Validate document type
    const validTypes: DocumentType[] = ["bank", "invoice", "po", "contract", "resume"];
    if (!validTypes.includes(type as DocumentType)) {
      toast.error("Invalid document type");
      return;
    }

    console.log('[Extraction] Starting template extraction for:', file.name, 'type:', type);
    setIsProcessing(true);
    setTemplateResults(null);

    try {
      console.log('[Extraction] Calling processTemplateExtraction API...');
      const response = await processTemplateExtraction(file, type as DocumentType);
      console.log('[Extraction] API Response received:', response);
      console.log('[Extraction] Response headerFields:', response.headerFields);
      console.log('[Extraction] Response lineItems:', response.lineItems);
      
      setTemplateResults(response);
      console.log('[Extraction] templateResults state updated');

      // Backend already saves extraction, no need to call saveExtraction here

      toast.success('Document extracted successfully!');
      
      // Refresh user data to update Monthly Usage display
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error: any) {
      console.error('[Extraction] Error during extraction:', error);
      toast.error(error.message || 'Extraction failed');
      setTemplateResults(null);
    } finally {
      setIsProcessing(false);
      console.log('[Extraction] Processing complete, isProcessing set to false');
    }
  };

  // Handle general extraction with LlamaParse (on button click)
  const handleParseDocument = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setGeneralResults(null);

    try {
      const response = await processGeneralExtraction(file);
      setGeneralResults(response);

      // Backend already saves extraction, no need to call saveExtraction here

      toast.success(`Document parsed successfully! ${response.pageCount} page(s) processed.`);
      
      // Refresh user data to update Monthly Usage display
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error: any) {
      toast.error(error.message || 'Extraction failed');
      setGeneralResults(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle removing the file
  const handleRemoveFile = () => {
    setFile(null);
    setTemplateResults(null);
    setGeneralResults(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: isGeneralExtraction 
      ? {
          'application/pdf': ['.pdf'],
          'image/png': ['.png'],
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/gif': ['.gif'],
          'image/webp': ['.webp'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'application/vnd.ms-excel': ['.xls'],
          'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
          'application/vnd.ms-powerpoint': ['.ppt'],
          'text/plain': ['.txt'],
          'text/csv': ['.csv'],
        }
      : {
          'application/pdf': ['.pdf'],
          'image/png': ['.png'],
          'image/jpeg': ['.jpg', '.jpeg']
        },
    maxFiles: 1
  });

  // Handle field value changes for template results
  const handleFieldChange = (index: number, newValue: string) => {
    if (!templateResults) return;
    const newHeaderFields = [...templateResults.headerFields];
    newHeaderFields[index] = { ...newHeaderFields[index], value: newValue };
    setTemplateResults({ ...templateResults, headerFields: newHeaderFields });
  };

  const hasResults = isGeneralExtraction ? !!generalResults : !!templateResults;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back') || 'Back'}
          </Link>
        </Button>
        <div>
          {(() => {
            const template = getTemplateById(type || 'general', t);
            const displayName = template?.name || t('nav.general');
            const displayDesc = template?.desc || t('dash.general_desc');
            return (
              <>
                <h1 className="text-xl font-semibold">{displayName}</h1>
                <p className="text-sm text-muted-foreground">{displayDesc}</p>
              </>
            );
          })()}
        </div>
      </div>

      {/* Main Resizable Panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel: Upload/Preview */}
        <ResizablePanel defaultSize={35} minSize={30}>
          <Card className="flex flex-col overflow-hidden h-full">
          <CardHeader className="border-b bg-muted/30 py-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center">
                <UploadCloud className="mr-2 h-4 w-4" />
                {file ? file.name : t('extract.upload_title')}
              </span>
              {file && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 relative bg-muted/10 overflow-hidden">
            {!file ? (
              // Upload dropzone
              <div 
                {...getRootProps()} 
                className={cn(
                  "h-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all cursor-pointer",
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium mb-2 text-center">{t('extract.upload_title')}</p>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  {t('extract.upload_desc')}
                </p>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  {isGeneralExtraction 
                    ? t('extract.upload_formats')
                    : 'PDF, JPG, PNG'
                  } • {t('extract.upload_size_limit')}
                </p>
              </div>
            ) : (
              // Document preview with action buttons
              <div className="h-full flex flex-col">
                <div className="flex-1 p-4 min-h-0">
                  <DocumentPreview file={file} className="h-full" />
                </div>
                
                {/* Action buttons - show for both general and template extraction (two-phase UX) */}
                {!hasResults && (
                  <div className="border-t bg-muted/20 p-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                    <Button
                      onClick={isGeneralExtraction ? handleParseDocument : handleTemplateExtraction}
                      disabled={isProcessing}
                      className="gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {isGeneralExtraction 
                            ? (t('extract.parsing') || 'Parsing...')
                            : (t('extract.extracting') || 'Extracting...')
                          }
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          {isGeneralExtraction 
                            ? (t('extract.parse_button') || 'Parse Document')
                            : 'Extract'
                          }
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          </Card>
        </ResizablePanel>

        <ResizableHandle 
          withHandle 
          className="w-1.5 bg-border/30 hover:bg-border/60 cursor-col-resize transition-colors"
        />

        {/* Right Panel: Results */}
        <ResizablePanel defaultSize={65} minSize={30}>
          <Card className="flex flex-col overflow-hidden h-full">
          <CardHeader className="border-b bg-muted/30 py-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-medium">
                {t('extract.results')}
              </CardTitle>
              {/* Confidence badge for general extraction */}
              {isGeneralExtraction && generalResults && (
                generalResults.overallConfidence !== undefined ? (
                  <span 
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-help",
                      generalResults.overallConfidence >= 0.9 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                      generalResults.overallConfidence >= 0.7 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    )} 
                    title={
                      generalResults.confidenceStats 
                        ? `Confidence: ${Math.round(generalResults.overallConfidence * 100)}% (Range: ${Math.round(generalResults.confidenceStats.min * 100)}% - ${Math.round(generalResults.confidenceStats.max * 100)}%)`
                        : `Confidence: ${Math.round(generalResults.overallConfidence * 100)}%`
                    }
                  >
                    {Math.round(generalResults.overallConfidence * 100)}% confidence
                  </span>
                ) : (
                  <span 
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground cursor-help"
                    title="Confidence data unavailable for this document. Layout extraction may not have returned element-level data."
                  >
                    Confidence unavailable
                  </span>
                )
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {isProcessing && isGeneralExtraction ? (
              // Loading state for general extraction
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-muted-foreground font-medium">
                    {t('extract.parsing') || 'Parsing document with LlamaParse...'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('extract.parsing_sub') || 'This may take a moment for larger documents'}
                  </p>
                </div>
              </div>
            ) : isProcessing && !isGeneralExtraction ? (
              // Loading state for template extraction
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">{t('extract.processing')}</p>
              </div>
            ) : isGeneralExtraction && generalResults ? (
              // Markdown results using MarkdownViewer
              <MarkdownViewer data={generalResults} className="h-full" />
            ) : templateResults ? (
              // Structured results for template-based extraction
              <StructuredResultsViewer
                headerFields={templateResults.headerFields}
                lineItems={templateResults.lineItems}
                extractedData={templateResults.extractedData}
                confidenceScores={templateResults.confidenceScores}
                documentType={type as DocumentType}
                onFieldChange={handleFieldChange}
                className="h-full"
              />
            ) : (
              // Empty state
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="font-medium">
                  {file && isGeneralExtraction 
                    ? (t('extract.ready_to_parse') || 'Ready to parse')
                    : (t('extract.upload_prompt') || 'Upload a document to see results')
                  }
                </p>
                <p className="text-sm mt-1">
                  {file && isGeneralExtraction 
                    ? (t('extract.click_parse') || 'Click "Parse Document" to extract content')
                    : (t('extract.drag_drop_hint') || 'Drag and drop a file or click to browse')
                  }
                </p>
              </div>
            )}
          </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
