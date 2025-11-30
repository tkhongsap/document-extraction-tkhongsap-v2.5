/**
 * MarkdownViewer Component
 * 
 * Displays parsed document results with format tabs (Markdown, Text, JSON).
 * Includes copy to clipboard, download buttons, and optional highlights toggle.
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
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
      <div className="flex-1 overflow-auto">
        {activeTab === "markdown" && (
          <div className="h-full bg-background">
            <div
              className={cn(
                "prose prose-base max-w-none dark:prose-invert",
                "prose-headings:font-semibold prose-headings:tracking-tight",
                "prose-headings:text-foreground",
                "prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border prose-h1:font-bold",
                "prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:font-semibold",
                "prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-semibold",
                "prose-h4:text-lg prose-h4:mt-5 prose-h4:mb-2 prose-h4:font-semibold",
                "prose-p:leading-relaxed prose-p:my-5 prose-p:text-foreground prose-p:text-[15px]",
                "prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium",
                "prose-strong:text-foreground prose-strong:font-semibold",
                "prose-em:text-foreground prose-em:italic",
                "prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none",
                "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:my-4",
                "prose-pre:shadow-sm",
                "prose-code:prose-pre:bg-transparent prose-code:prose-pre:p-0 prose-code:prose-pre:border-0",
                "prose-ul:my-4 prose-ul:pl-6 prose-ul:list-disc prose-ul:marker:text-muted-foreground",
                "prose-ol:my-4 prose-ol:pl-6 prose-ol:list-decimal prose-ol:marker:text-muted-foreground",
                "prose-li:my-2 prose-li:leading-relaxed",
                "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:my-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
                "prose-hr:border-border prose-hr:my-6",
                // Default table styling (always applied)
                "prose-table:w-full prose-table:border-collapse prose-table:my-6",
                "[&_table]:border [&_table]:border-border [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:shadow-sm [&_table]:bg-background",
                "[&_thead]:bg-muted/60",
                "[&_th]:border-b [&_th]:border-border [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-[15px] [&_th]:text-foreground [&_th]:bg-muted/60",
                "[&_td]:border-b [&_td]:border-border/50 [&_td]:px-5 [&_td]:py-3.5 [&_td]:text-[15px] [&_td]:text-foreground [&_td]:leading-relaxed",
                "[&_tbody_tr:last-child_td]:border-b-0",
                "[&_tbody_tr:hover]:bg-muted/40",
                "[&_tbody_tr:nth-child(even)]:bg-muted/20",
                // Highlights enhancement (optional)
                showHighlights && [
                  "[&_table]:border-amber-200 dark:[&_table]:border-amber-900/50",
                  "[&_th]:bg-amber-50 dark:[&_th]:bg-amber-950/30",
                  "[&_th]:border-amber-200 dark:[&_th]:border-amber-900/50",
                  "[&_td]:border-amber-100 dark:[&_td]:border-amber-900/30",
                  "[&_tbody_tr:hover]:bg-amber-50/50 dark:[&_tbody_tr:hover]:bg-amber-950/20",
                ],
                // Document container styling
                "px-8 py-8 max-w-5xl mx-auto"
              )}
            >
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {data.markdown || "No content available"}
              </ReactMarkdown>
            </div>
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

