import { useLanguage } from "@/lib/i18n";
import { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { UploadCloud, FileText, Loader2, ArrowLeft, Play, X, Files, FileCheck, AlertCircle } from "lucide-react";
import { useParams, Link } from "wouter";
import { cn } from "@/lib/utils";
import { getTemplateById } from "@/lib/templates";
import { 
  processTemplateExtraction, 
  processGeneralExtraction, 
  processBatchTemplateExtraction,
  processBatchGeneralExtraction,
  type GeneralExtractionResponse,
  type TemplateExtractionResponse,
  type DocumentType,
  type BatchExtractionResponse,
  type BatchTemplateResultData,
  type BatchGeneralResultData,
} from "@/lib/api";
import { toast } from "sonner";
import { DocumentPreview } from "@/components/DocumentPreview";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { StructuredResultsViewer } from "@/components/StructuredResultsViewer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PDFDocument } from "pdf-lib";

// Batch processing limit - realistic limit to avoid network issues
const BATCH_FILE_LIMIT = 100;

// Helper to count PDF pages from a File
async function countPdfPages(file: File): Promise<number> {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return 1; // Non-PDF files count as 1 page
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (error) {
    console.warn(`[PDF] Could not count pages for ${file.name}:`, error);
    return 1; // Default to 1 page on error
  }
}

// Helper to count total pages for multiple files
async function countTotalPages(files: File[]): Promise<number> {
  const pageCounts = await Promise.all(files.map(countPdfPages));
  return pageCounts.reduce((sum, count) => sum + count, 0);
}

// Helper to format seconds into human-readable time
function formatEstimatedTime(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `~${totalSeconds} seconds`;
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (seconds === 0) {
      return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `~${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (minutes === 0) {
      return `~${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `~${hours}h ${minutes}m`;
  }
}

export default function Extraction() {
  const { t } = useLanguage();
  const { type } = useParams();
  const queryClient = useQueryClient();
  
  // Batch mode toggle
  const [isBatchMode, setIsBatchMode] = useState(false);
  
  // Single file state
  const [file, setFile] = useState<File | null>(null);
  
  // Batch files state
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Template-based extraction results (structured data from LlamaExtract)
  const [templateResults, setTemplateResults] = useState<TemplateExtractionResponse | null>(null);
  
  // General extraction results (markdown-based from LlamaParse)
  const [generalResults, setGeneralResults] = useState<GeneralExtractionResponse | null>(null);

  // Batch results
  const [batchTemplateResults, setBatchTemplateResults] = useState<BatchExtractionResponse<BatchTemplateResultData> | null>(null);
  const [batchGeneralResults, setBatchGeneralResults] = useState<BatchExtractionResponse<BatchGeneralResultData> | null>(null);
  
  // Selected batch result for viewing
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);

  // Limit exceeded dialog state
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogMessage, setLimitDialogMessage] = useState({ files: 0, remaining: 0, excess: 0 });

  // File limit exceeded dialog state
  const [showFileLimitDialog, setShowFileLimitDialog] = useState(false);
  const [fileLimitDialogMessage, setFileLimitDialogMessage] = useState({ attempted: 0, limit: BATCH_FILE_LIMIT, current: 0 });

  // Batch processing timer state
  const [batchStartTime, setBatchStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Single file state for page count and timer
  const [singleFilePages, setSingleFilePages] = useState<number>(1);
  const [singleFileStartTime, setSingleFileStartTime] = useState<number | null>(null);

  // Timer effect for real-time countdown (works for both batch and single file)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const startTime = isBatchMode ? batchStartTime : singleFileStartTime;
    
    if (isProcessing && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, isBatchMode, batchStartTime, singleFileStartTime]);

  // Check if this is a general extraction
  const isGeneralExtraction = !type || type === 'general';

  // Get user data for monthly limit check
  const { data: userData } = useQuery<{ monthlyUsage: number; monthlyLimit: number }>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user data");
      return res.json();
    },
  });
  
  // Calculate remaining pages
  const pagesRemaining = userData ? userData.monthlyLimit - userData.monthlyUsage : 0;

  // Handle file drop - just store file for preview (two-phase UX for all types)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (isBatchMode) {
      // Batch mode: add to existing files (up to BATCH_FILE_LIMIT)
      setBatchFiles(prev => {
        const totalFiles = prev.length + acceptedFiles.length;
        const remainingSlots = BATCH_FILE_LIMIT - prev.length;
        
        // Check if files will be truncated
        if (acceptedFiles.length > remainingSlots) {
          const truncatedCount = acceptedFiles.length - remainingSlots;
          if (remainingSlots <= 0) {
            toast.error(`Batch limit reached (${BATCH_FILE_LIMIT} files max). Cannot add more files.`);
            return prev;
          } else {
            toast.warning(`Only ${remainingSlots} of ${acceptedFiles.length} files added. Batch limit is ${BATCH_FILE_LIMIT} files.`);
          }
        }
        
        const newFiles = [...prev, ...acceptedFiles].slice(0, BATCH_FILE_LIMIT);
        return newFiles;
      });
    } else {
      // Single mode
      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
    }
    // Clear any previous results
    setTemplateResults(null);
    setGeneralResults(null);
    setBatchTemplateResults(null);
    setBatchGeneralResults(null);
    setSelectedBatchIndex(0);
  }, [isBatchMode]);

  // Handle template-based extraction with LlamaExtract (on button click)
  const handleTemplateExtraction = async () => {
    if (!file || !type) return;
    
    // Validate document type
    const validTypes: DocumentType[] = ["bank", "invoice", "po", "contract", "resume"];
    if (!validTypes.includes(type as DocumentType)) {
      toast.error("Invalid document type");
      return;
    }

    // Count pages first
    const pageCount = await countPdfPages(file);
    setSingleFilePages(pageCount);

    // Check monthly limit
    if (pageCount > pagesRemaining) {
      setLimitDialogMessage({
        files: pageCount,
        remaining: pagesRemaining,
        excess: pageCount - pagesRemaining
      });
      setShowLimitDialog(true);
      return;
    }

    console.log('[Extraction] Starting template extraction for:', file.name, 'type:', type, 'pages:', pageCount);
    setIsProcessing(true);
    setTemplateResults(null);
    setSingleFileStartTime(Date.now());

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
      setSingleFileStartTime(null);
      console.log('[Extraction] Processing complete, isProcessing set to false');
    }
  };

  // Handle batch template extraction
  const handleBatchTemplateExtraction = async () => {
    if (batchFiles.length === 0 || !type) return;
    
    const validTypes: DocumentType[] = ["bank", "invoice", "po", "contract", "resume"];
    if (!validTypes.includes(type as DocumentType)) {
      toast.error("Invalid document type");
      return;
    }

    // Count total pages from all PDFs
    setIsProcessing(true);
    toast.info("Counting pages...");
    const totalPages = await countTotalPages(batchFiles);
    
    // Debug log
    console.log('[Batch] userData:', userData, 'pagesRemaining:', pagesRemaining, 'batchFiles:', batchFiles.length, 'totalPages:', totalPages);

    // Check monthly limit before processing (using actual page count)
    if (totalPages > pagesRemaining) {
      setIsProcessing(false);
      setLimitDialogMessage({
        files: totalPages, // Now this is pages, not files
        remaining: pagesRemaining,
        excess: totalPages - pagesRemaining
      });
      setShowLimitDialog(true);
      return;
    }

    console.log('[Batch Extraction] Starting batch template extraction for:', batchFiles.length, 'files,', totalPages, 'pages');
    setBatchTemplateResults(null);
    setBatchStartTime(Date.now());

    try {
      const response = await processBatchTemplateExtraction(batchFiles, type as DocumentType);
      console.log('[Batch Extraction] Response:', response);
      
      setBatchTemplateResults(response);
      setSelectedBatchIndex(0);
      
      toast.success(`Batch complete: ${response.successCount}/${response.totalFiles} files processed successfully`);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error: any) {
      console.error('[Batch Extraction] Error:', error);
      toast.error(error.message || 'Batch extraction failed');
      setBatchTemplateResults(null);
    } finally {
      setIsProcessing(false);
      setBatchStartTime(null);
    }
  };

  // Handle batch general extraction
  const handleBatchGeneralExtraction = async () => {
    if (batchFiles.length === 0) return;

    // Count total pages from all PDFs
    setIsProcessing(true);
    toast.info("Counting pages...");
    const totalPages = await countTotalPages(batchFiles);

    // Check monthly limit before processing (using actual page count)
    if (totalPages > pagesRemaining) {
      setIsProcessing(false);
      setLimitDialogMessage({
        files: totalPages, // Now this is pages, not files
        remaining: pagesRemaining,
        excess: totalPages - pagesRemaining
      });
      setShowLimitDialog(true);
      return;
    }

    console.log('[Batch General Extraction] Starting for:', batchFiles.length, 'files,', totalPages, 'pages');
    setBatchGeneralResults(null);
    setBatchStartTime(Date.now());

    try {
      const response = await processBatchGeneralExtraction(batchFiles);
      console.log('[Batch General Extraction] Response:', response);
      
      setBatchGeneralResults(response);
      setSelectedBatchIndex(0);
      
      toast.success(`Batch complete: ${response.successCount}/${response.totalFiles} files processed successfully`);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error: any) {
      console.error('[Batch General Extraction] Error:', error);
      toast.error(error.message || 'Batch extraction failed');
      setBatchGeneralResults(null);
    } finally {
      setIsProcessing(false);
      setBatchStartTime(null);
    }
  };

  // Handle general extraction with LlamaParse (on button click)
  const handleParseDocument = async () => {
    if (!file) return;
    
    // Count pages first
    const pageCount = await countPdfPages(file);
    setSingleFilePages(pageCount);

    // Check monthly limit
    if (pageCount > pagesRemaining) {
      setLimitDialogMessage({
        files: pageCount,
        remaining: pagesRemaining,
        excess: pageCount - pagesRemaining
      });
      setShowLimitDialog(true);
      return;
    }

    console.log('[General Extraction] Starting for:', file.name, 'pages:', pageCount);
    setIsProcessing(true);
    setGeneralResults(null);
    setSingleFileStartTime(Date.now());

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
      setSingleFileStartTime(null);
    }
  };

  // Handle removing the file
  const handleRemoveFile = () => {
    setFile(null);
    setBatchFiles([]);
    setTemplateResults(null);
    setGeneralResults(null);
    setBatchTemplateResults(null);
    setBatchGeneralResults(null);
    setSelectedBatchIndex(0);
  };

  // Handle removing a specific batch file
  const handleRemoveBatchFile = (index: number) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle batch mode toggle
  const handleBatchModeToggle = (checked: boolean) => {
    setIsBatchMode(checked);
    // Clear all files and results when switching modes
    setFile(null);
    setBatchFiles([]);
    setTemplateResults(null);
    setGeneralResults(null);
    setBatchTemplateResults(null);
    setBatchGeneralResults(null);
    setSelectedBatchIndex(0);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    onDropRejected: (fileRejections) => {
      // Check if files were rejected due to too many files
      const tooManyFiles = fileRejections.some(
        rejection => rejection.errors.some(e => e.code === 'too-many-files')
      );
      
      if (tooManyFiles) {
        // Show popup dialog for file limit exceeded
        setFileLimitDialogMessage({
          attempted: fileRejections.length,
          limit: BATCH_FILE_LIMIT,
          current: batchFiles.length
        });
        setShowFileLimitDialog(true);
      } else {
        // Other rejection reasons (file type, size, etc.)
        const invalidTypes = fileRejections.filter(
          r => r.errors.some(e => e.code === 'file-invalid-type')
        );
        if (invalidTypes.length > 0) {
          toast.error(`${invalidTypes.length} ไฟล์ถูกปฏิเสธเนื่องจากประเภทไฟล์ไม่รองรับ`);
        }
      }
    },
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
    maxFiles: isBatchMode ? BATCH_FILE_LIMIT : 1,
    multiple: isBatchMode
  });

  // Handle field value changes for template results
  const handleFieldChange = (index: number, newValue: string) => {
    if (!templateResults) return;
    const newHeaderFields = [...templateResults.headerFields];
    newHeaderFields[index] = { ...newHeaderFields[index], value: newValue };
    setTemplateResults({ ...templateResults, headerFields: newHeaderFields });
  };

  const hasResults = isBatchMode 
    ? (isGeneralExtraction ? !!batchGeneralResults : !!batchTemplateResults)
    : (isGeneralExtraction ? !!generalResults : !!templateResults);

  const hasFiles = isBatchMode ? batchFiles.length > 0 : !!file;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
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
        
        {/* Batch Mode Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="batch-mode"
            checked={isBatchMode}
            onCheckedChange={handleBatchModeToggle}
          />
          <Label htmlFor="batch-mode" className="flex items-center gap-2 cursor-pointer">
            <Files className="h-4 w-4" />
            {t('extract.batch_mode') || 'Batch Mode'}
          </Label>
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
                {isBatchMode ? <Files className="mr-2 h-4 w-4" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isBatchMode 
                  ? (batchFiles.length > 0 ? `${batchFiles.length} files selected` : t('extract.upload_title'))
                  : (file ? file.name : t('extract.upload_title'))
                }
              </span>
              {hasFiles && (
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
            {!hasFiles ? (
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
                  {isBatchMode ? <Files className="h-8 w-8 text-muted-foreground" /> : <UploadCloud className="h-8 w-8 text-muted-foreground" />}
                </div>
                <p className="text-lg font-medium mb-2 text-center">
                  {isBatchMode ? (t('extract.batch_upload_title') || 'Upload Multiple Files') : t('extract.upload_title')}
                </p>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  {isBatchMode 
                    ? (t('extract.batch_upload_desc') || 'Drop up to 10 files or click to select')
                    : t('extract.upload_desc')
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  {isGeneralExtraction 
                    ? t('extract.upload_formats')
                    : 'PDF, JPG, PNG'
                  } • {t('extract.upload_size_limit')}
                </p>
              </div>
            ) : isBatchMode ? (
              // Batch files list
              <div className="h-full flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {batchFiles.map((batchFile, index) => (
                      <div 
                        key={index}
                        onClick={() => hasResults && setSelectedBatchIndex(index)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all",
                          hasResults && "cursor-pointer hover:border-primary/50",
                          hasResults && selectedBatchIndex === index && "ring-2 ring-primary border-primary",
                          hasResults && batchTemplateResults?.results[index]?.success 
                            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                            : hasResults && batchGeneralResults?.results[index]?.success
                            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                            : hasResults && (batchTemplateResults?.results[index] || batchGeneralResults?.results[index])
                            ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                            : "bg-card border-border"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{batchFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(batchFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasResults && (
                            <>
                              {batchTemplateResults?.results[index]?.success || batchGeneralResults?.results[index]?.success ? (
                                <FileCheck className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                            </>
                          )}
                          {!hasResults && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleRemoveBatchFile(index); }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Add more files dropzone */}
                {!hasResults && batchFiles.length < BATCH_FILE_LIMIT && (
                  <div 
                    {...getRootProps()} 
                    className="mx-2 mb-2 p-4 border-2 border-dashed rounded-lg transition-all cursor-pointer text-center border-muted-foreground/25 hover:border-primary/50"
                  >
                    <input {...getInputProps()} />
                    <p className="text-sm text-muted-foreground">
                      + Add more files ({BATCH_FILE_LIMIT - batchFiles.length} remaining)
                    </p>
                  </div>
                )}
                
                {/* Action buttons */}
                {!hasResults && (
                  <div className="border-t bg-muted/20 p-4 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {batchFiles.length} file(s) • {(batchFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB total
                    </div>
                    <Button
                      onClick={isGeneralExtraction ? handleBatchGeneralExtraction : handleBatchTemplateExtraction}
                      disabled={isProcessing || batchFiles.length === 0}
                      className="gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('extract.batch_processing') || 'Processing...'}
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          {t('extract.batch_process') || 'Process All'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Single document preview with action buttons
              <div className="h-full flex flex-col">
                <div className="flex-1 p-4 min-h-0">
                  {file && <DocumentPreview file={file} className="h-full" />}
                </div>
                
                {/* Action buttons - show for both general and template extraction (two-phase UX) */}
                {!hasResults && file && (
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
                {isBatchMode && hasResults && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({(batchTemplateResults || batchGeneralResults)?.successCount}/{(batchTemplateResults || batchGeneralResults)?.totalFiles} successful)
                  </span>
                )}
              </CardTitle>
              {/* Confidence badge for general extraction (single mode) */}
              {!isBatchMode && isGeneralExtraction && generalResults && (
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
            {isProcessing && isBatchMode ? (
              // Loading state for batch processing
              (() => {
                const totalEstimatedSeconds = Math.ceil(batchFiles.length * (isGeneralExtraction ? 20 : 30));
                const remainingSeconds = Math.max(0, totalEstimatedSeconds - elapsedSeconds);
                return (
                  <div className="h-full flex flex-col items-center justify-center space-y-4 p-8">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-muted-foreground font-medium">
                        {t('extract.batch_processing') || 'Processing batch...'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Processing {batchFiles.length} files sequentially
                      </p>
                      <p className="text-sm text-primary mt-2 font-medium">
                        {remainingSeconds > 0 
                          ? `${formatEstimatedTime(remainingSeconds)} remaining`
                          : `${formatEstimatedTime(elapsedSeconds)} elapsed (finishing up...)`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elapsed: {formatEstimatedTime(elapsedSeconds)}
                      </p>
                    </div>
                  </div>
                );
              })()
            ) : isProcessing && isGeneralExtraction && !isBatchMode ? (
              // Loading state for single file general extraction
              (() => {
                const totalEstimatedSeconds = Math.ceil(singleFilePages * 20);
                const remainingSeconds = Math.max(0, totalEstimatedSeconds - elapsedSeconds);
                return (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-muted-foreground font-medium">
                        {t('extract.parsing') || 'Parsing document with LlamaParse...'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Processing {singleFilePages} page{singleFilePages > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-primary mt-2 font-medium">
                        {remainingSeconds > 0 
                          ? `${formatEstimatedTime(remainingSeconds)} remaining`
                          : `${formatEstimatedTime(elapsedSeconds)} elapsed (finishing up...)`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elapsed: {formatEstimatedTime(elapsedSeconds)}
                      </p>
                    </div>
                  </div>
                );
              })()
            ) : isProcessing && !isGeneralExtraction && !isBatchMode ? (
              // Loading state for single file template extraction
              (() => {
                const totalEstimatedSeconds = Math.ceil(singleFilePages * 30);
                const remainingSeconds = Math.max(0, totalEstimatedSeconds - elapsedSeconds);
                return (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-muted-foreground font-medium">{t('extract.processing')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Processing {singleFilePages} page{singleFilePages > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-primary mt-2 font-medium">
                        {remainingSeconds > 0 
                          ? `${formatEstimatedTime(remainingSeconds)} remaining`
                          : `${formatEstimatedTime(elapsedSeconds)} elapsed (finishing up...)`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Elapsed: {formatEstimatedTime(elapsedSeconds)}
                      </p>
                    </div>
                  </div>
                );
              })()
            ) : isBatchMode && batchGeneralResults ? (
              // Batch general results
              (() => {
                const selectedResult = batchGeneralResults.results[selectedBatchIndex];
                if (!selectedResult) return null;
                
                if (!selectedResult.success) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-destructive p-8 text-center">
                      <AlertCircle className="h-12 w-12 mb-4" />
                      <p className="font-medium">Failed to process: {selectedResult.fileName}</p>
                      <p className="text-sm mt-2">{selectedResult.error}</p>
                    </div>
                  );
                }
                
                // Create a GeneralExtractionResponse-like object for MarkdownViewer
                const resultData: GeneralExtractionResponse = {
                  success: true,
                  markdown: selectedResult.data?.markdown || '',
                  text: selectedResult.data?.text || '',
                  pageCount: selectedResult.data?.pageCount || 0,
                  pages: selectedResult.data?.pages || [],
                  fileName: selectedResult.fileName,
                  fileSize: selectedResult.data?.fileSize || 0,
                  mimeType: selectedResult.data?.mimeType || '',
                  overallConfidence: selectedResult.data?.overallConfidence,
                  confidenceStats: selectedResult.data?.confidenceStats,
                  documentId: selectedResult.data?.documentId,
                };
                
                return <MarkdownViewer data={resultData} className="h-full" />;
              })()
            ) : isBatchMode && batchTemplateResults ? (
              // Batch template results
              (() => {
                const selectedResult = batchTemplateResults.results[selectedBatchIndex];
                if (!selectedResult) return null;
                
                if (!selectedResult.success) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-destructive p-8 text-center">
                      <AlertCircle className="h-12 w-12 mb-4" />
                      <p className="font-medium">Failed to process: {selectedResult.fileName}</p>
                      <p className="text-sm mt-2">{selectedResult.error}</p>
                    </div>
                  );
                }
                
                return (
                  <StructuredResultsViewer
                    headerFields={selectedResult.data?.headerFields || []}
                    lineItems={selectedResult.data?.lineItems}
                    extractedData={selectedResult.data?.extractedData || {}}
                    confidenceScores={selectedResult.data?.confidenceScores}
                    documentType={type as DocumentType}
                    onFieldChange={() => {}} // Read-only in batch mode
                    className="h-full"
                    fileName={selectedResult.fileName}
                  />
                );
              })()
            ) : isGeneralExtraction && generalResults ? (
              // Single mode: Markdown results using MarkdownViewer
              <MarkdownViewer data={generalResults} className="h-full" />
            ) : templateResults ? (
              // Single mode: Structured results for template-based extraction
              <StructuredResultsViewer
                headerFields={templateResults.headerFields}
                lineItems={templateResults.lineItems}
                extractedData={templateResults.extractedData}
                confidenceScores={templateResults.confidenceScores}
                documentType={type as DocumentType}
                onFieldChange={handleFieldChange}
                className="h-full"
                fileName={file?.name || "extraction"}
              />
            ) : (
              // Empty state
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="font-medium">
                  {isBatchMode && batchFiles.length > 0
                    ? (t('extract.ready_to_process') || 'Ready to process')
                    : file && isGeneralExtraction 
                    ? (t('extract.ready_to_parse') || 'Ready to parse')
                    : (t('extract.upload_prompt') || 'Upload a document to see results')
                  }
                </p>
                <p className="text-sm mt-1">
                  {isBatchMode && batchFiles.length > 0
                    ? (t('extract.click_process_all') || 'Click "Process All" to extract content from all files')
                    : file && isGeneralExtraction 
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

      {/* Monthly Limit Exceeded Dialog */}
      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Monthly Limit Exceeded
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Your files contain <strong>{limitDialogMessage.files} pages</strong>, 
                  but you only have <strong>{limitDialogMessage.remaining} pages remaining</strong> this month.
                </p>
                <p>
                  You need <strong>{limitDialogMessage.excess} more pages</strong>. Please remove some files or upgrade your plan.
                </p>
                <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Current usage:</strong> {userData?.monthlyUsage || 0} / {userData?.monthlyLimit || 0} pages</p>
                  <p><strong>Pages remaining:</strong> {pagesRemaining}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowLimitDialog(false)}>
              OK, I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Limit Exceeded Dialog */}
      <AlertDialog open={showFileLimitDialog} onOpenChange={setShowFileLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              {t('fileLimit.title')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {t('fileLimit.attempted')} <strong>{fileLimitDialogMessage.attempted} {t('fileLimit.files')}</strong> {t('fileLimit.maxAllowed')} <strong>{fileLimitDialogMessage.limit} {t('fileLimit.filesPerBatch')}</strong>
                </p>
                {fileLimitDialogMessage.current > 0 && (
                  <p>
                    {t('fileLimit.currentFiles')} <strong>{fileLimitDialogMessage.current} {t('fileLimit.canAddMore')}</strong> <strong>{fileLimitDialogMessage.limit - fileLimitDialogMessage.current} {t('fileLimit.moreFiles')}</strong>
                  </p>
                )}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p><strong>{t('fileLimit.limit')}:</strong> {fileLimitDialogMessage.limit} {t('fileLimit.filesPerBatch')}</p>
                  <p><strong>{t('fileLimit.current')}:</strong> {fileLimitDialogMessage.current} {t('fileLimit.files')}</p>
                  <p><strong>{t('fileLimit.canAdd')}:</strong> {fileLimitDialogMessage.limit - fileLimitDialogMessage.current} {t('fileLimit.files')}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowFileLimitDialog(false)}>
              {t('fileLimit.understand')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
