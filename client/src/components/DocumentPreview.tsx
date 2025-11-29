/**
 * DocumentPreview Component
 * 
 * Displays a preview of uploaded documents:
 * - PDFs: Shows embedded PDF viewer
 * - Images: Shows the image directly
 * - Other files: Shows file info and icon
 */

import { FileText, FileSpreadsheet, FileAudio, File, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

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
  const fileUrl = useMemo(() => URL.createObjectURL(file), [file]);

  // Clean up object URL on unmount
  // Note: In production, you might want to use useEffect for cleanup

  return (
    <div className={cn("h-full w-full flex flex-col", className)}>
      {/* PDF Preview */}
      {fileCategory === "pdf" && (
        <div className="flex-1 min-h-0">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0 rounded-lg"
            title={`Preview of ${file.name}`}
          />
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

