/**
 * DocumentPreview Component
 * 
 * Displays a preview of uploaded documents:
 * - PDFs: Shows embedded PDF viewer with fallback for blocked content
 * - Images: Shows the image directly
 * - Other files: Shows file info and icon
 */

import { FileText, FileSpreadsheet, FileAudio, File, Image as ImageIcon, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface DocumentPreviewProps {
  file: File;
  className?: string;
}

type FileCategory = "pdf" | "image" | "spreadsheet" | "audio" | "document" | "other";

function getFileCategory(mimeType: string): FileCategory {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return "spreadsheet";
  }
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType === "text/plain"
  ) {
    return "document";
  }
  return "other";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function FileIcon({ category }: { category: FileCategory }) {
  const iconClass = "h-12 w-12 text-muted-foreground";
  
  switch (category) {
    case "pdf":
      return <FileText className={cn(iconClass, "text-red-500")} />;
    case "image":
      return <ImageIcon className={cn(iconClass, "text-blue-500")} />;
    case "spreadsheet":
      return <FileSpreadsheet className={cn(iconClass, "text-green-500")} />;
    case "audio":
      return <FileAudio className={cn(iconClass, "text-purple-500")} />;
    case "document":
      return <FileText className={cn(iconClass, "text-blue-500")} />;
    default:
      return <File className={iconClass} />;
  }
}

export function DocumentPreview({ file, className }: DocumentPreviewProps) {
  const fileCategory = getFileCategory(file.type);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  
  const fileUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    setPdfLoadError(false);
    setPdfLoading(true);
    
    return () => {
      URL.revokeObjectURL(fileUrl);
    };
  }, [file, fileUrl]);

  const handleOpenInNewTab = useCallback(() => {
    window.open(fileUrl, '_blank');
  }, [fileUrl]);

  const handleIframeLoad = useCallback(() => {
    setPdfLoading(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setPdfLoadError(true);
    setPdfLoading(false);
  }, []);

  return (
    <div className={cn("h-full w-full flex flex-col", className)}>
      {/* PDF Preview with Fallback */}
      {fileCategory === "pdf" && (
        <div className="flex-1 min-h-0 flex flex-col">
          {pdfLoadError ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8 bg-muted/10 rounded-lg">
              <div className="h-20 w-20 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-sm">Preview Blocked</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Your browser blocked the PDF preview. You can still open it in a new tab or proceed with parsing.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button
                  variant="outline"
                  onClick={handleOpenInNewTab}
                  className="w-full"
                  data-testid="button-open-pdf-new-tab"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
              <div className="text-center space-y-1 mt-2">
                <p className="font-medium text-xs break-all max-w-xs">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            </div>
          ) : (
            <>
              <iframe
                src={fileUrl}
                className="flex-1 w-full border-0 rounded-lg"
                title={`Preview of ${file.name}`}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                data-testid="iframe-pdf-preview"
              />
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-xs text-muted-foreground">
                  If preview is blocked, use the button to open the file.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  className="text-xs h-7"
                  data-testid="button-open-pdf-new-tab"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open in New Tab
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Image Preview */}
      {fileCategory === "image" && (
        <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/20 rounded-lg p-4">
          <img
            src={fileUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
          />
        </div>
      )}

      {/* Audio Preview */}
      {fileCategory === "audio" && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 p-8">
          <div className="h-24 w-24 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <FileAudio className="h-12 w-12 text-purple-500" />
          </div>
          <audio
            controls
            src={fileUrl}
            className="w-full max-w-md"
          >
            Your browser does not support the audio element.
          </audio>
          <div className="text-center">
            <p className="font-medium text-sm">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
        </div>
      )}

      {/* Other File Types - Show file info */}
      {(fileCategory === "document" || fileCategory === "spreadsheet" || fileCategory === "other") && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 p-8 bg-muted/10 rounded-lg">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
            <FileIcon category={fileCategory} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium text-sm break-all max-w-xs">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {fileCategory === "other" ? file.type || "Unknown type" : fileCategory}
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Preview not available for this file type. Click "Parse" to extract content.
          </p>
        </div>
      )}
    </div>
  );
}

export default DocumentPreview;

