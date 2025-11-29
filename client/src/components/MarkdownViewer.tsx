/**
 * MarkdownViewer Component
 * 
 * Displays parsed document results with format tabs (Markdown, Text, JSON).
 * Includes copy to clipboard, download buttons, and optional highlights toggle.
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Copy, Check, Download, FileText, FileJson, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { GeneralExtractionResponse } from "@/lib/api";

interface MarkdownViewerProps {
  data: GeneralExtractionResponse;
  className?: string;
}

type OutputFormat = "markdown" | "text" | "json";

export function MarkdownViewer({ data, className }: MarkdownViewerProps) {
  const [activeTab, setActiveTab] = useState<OutputFormat>("markdown");
  const [showHighlights, setShowHighlights] = useState(true);
  const [copied, setCopied] = useState(false);

  const getContent = (format: OutputFormat): string => {
    switch (format) {
      case "markdown":
        return data.markdown || "";
      case "text":
        return data.text || "";
      case "json":
        return JSON.stringify(
          {
            fileName: data.fileName,
            pageCount: data.pageCount,
            pages: data.pages,
            markdown: data.markdown,
            text: data.text,
          },
          null,
          2
        );
      default:
        return "";
    }
  };

  const handleCopy = async () => {
    const content = getContent(activeTab);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = (format: OutputFormat) => {
    const content = getContent(format);
    const extensions: Record<OutputFormat, string> = {
      markdown: "md",
      text: "txt",
      json: "json",
    };
    const mimeTypes: Record<OutputFormat, string> = {
      markdown: "text/markdown",
      text: "text/plain",
      json: "application/json",
    };

    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.fileName.replace(/\.[^/.]+$/, "")}-extracted.${extensions[format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${format.charAt(0).toUpperCase() + format.slice(1)} downloaded!`);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with tabs and actions */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OutputFormat)}>
          <TabsList className="h-8">
            <TabsTrigger value="markdown" className="text-xs px-3 h-7">
              <FileText className="h-3 w-3 mr-1.5" />
              Markdown
            </TabsTrigger>
            <TabsTrigger value="text" className="text-xs px-3 h-7">
              <Type className="h-3 w-3 mr-1.5" />
              Text
            </TabsTrigger>
            <TabsTrigger value="json" className="text-xs px-3 h-7">
              <FileJson className="h-3 w-3 mr-1.5" />
              JSON
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          {/* Highlights toggle - only for markdown */}
          {activeTab === "markdown" && (
            <div className="flex items-center gap-2">
              <Switch
                id="highlights"
                checked={showHighlights}
                onCheckedChange={setShowHighlights}
                className="scale-75"
              />
              <Label htmlFor="highlights" className="text-xs text-muted-foreground cursor-pointer">
                Show highlights
              </Label>
            </div>
          )}

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Download button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => handleDownload(activeTab)}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "markdown" && (
          <div
            className={cn(
              "prose prose-sm max-w-none dark:prose-invert",
              "prose-headings:font-semibold prose-headings:tracking-tight",
              "prose-p:leading-relaxed",
              "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
              showHighlights && [
                "prose-table:border prose-table:border-amber-200 dark:prose-table:border-amber-900",
                "prose-th:bg-amber-50 dark:prose-th:bg-amber-950/50",
                "prose-td:border prose-td:border-amber-100 dark:prose-td:border-amber-900/50",
                "[&_table]:rounded-lg [&_table]:overflow-hidden",
                "[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2",
              ]
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.markdown || "No content available"}
            </ReactMarkdown>
          </div>
        )}

        {activeTab === "text" && (
          <div className="whitespace-pre-wrap font-mono text-sm text-muted-foreground leading-relaxed">
            {data.text || "No text content available"}
          </div>
        )}

        {activeTab === "json" && (
          <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground bg-muted/30 rounded-lg p-4 overflow-x-auto">
            {getContent("json")}
          </pre>
        )}
      </div>

      {/* Footer with page info and download options */}
      <div className="flex items-center justify-between border-t px-4 py-2 bg-muted/20">
        <span className="text-xs text-muted-foreground">
          {data.pageCount} page{data.pageCount !== 1 ? "s" : ""} • {data.fileName}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleDownload("markdown")}
          >
            <Download className="h-3 w-3 mr-1" />
            MD
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleDownload("text")}
          >
            <Download className="h-3 w-3 mr-1" />
            TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleDownload("json")}
          >
            <Download className="h-3 w-3 mr-1" />
            JSON
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MarkdownViewer;

