import { useState } from "react";
import { ApiKey, maskApiKey, getKeyStatus, formatDate } from "@/hooks/use-api-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UsageBarCompact } from "./usage-bar";
import { Copy, Check, MoreHorizontal, RefreshCw, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ApiKeyRowProps {
  apiKey: ApiKey;
  isSelected?: boolean;
  onRegenerate: (apiKey: ApiKey) => void;
  onDelete: (apiKey: ApiKey) => void;
  onViewStats: (apiKey: ApiKey) => void;
  onSelect?: (apiKey: ApiKey) => void;
}

export function ApiKeyRow({ apiKey, isSelected, onRegenerate, onDelete, onViewStats, onSelect }: ApiKeyRowProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const status = getKeyStatus(apiKey);
  const maskedKey = maskApiKey(apiKey.prefix);

  const handleRowClick = (e: React.MouseEvent) => {
    // ไม่ให้ select ถ้าคลิกที่ปุ่ม copy หรือ dropdown
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]')) {
      return;
    }
    onSelect?.(apiKey);
  };

  const handleCopyPrefix = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(apiKey.prefix);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Key prefix copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = apiKey.prefix;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast({
          title: "Copied!",
          description: "Key prefix copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({
          title: "Copy failed",
          description: "Could not copy to clipboard",
          variant: "destructive",
        });
      }
      document.body.removeChild(textArea);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "revoked":
        return <Badge variant="secondary">Revoked</Badge>;
    }
  };

  return (
    <TableRow 
      onClick={handleRowClick}
      className={cn(
        "cursor-pointer transition-colors",
        isSelected && "bg-primary/5 hover:bg-primary/10"
      )}
    >
      {/* Name */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {isSelected && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
          {apiKey.name}
        </div>
      </TableCell>

      {/* Key (masked) */}
      <TableCell>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {maskedKey}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopyPrefix}
            title="Copy key prefix"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </TableCell>

      {/* Created */}
      <TableCell className="text-muted-foreground text-sm">
        {formatDate(apiKey.createdAt)}
      </TableCell>

      {/* Last Used */}
      <TableCell className="text-muted-foreground text-sm">
        {formatDate(apiKey.lastUsedAt)}
      </TableCell>

      {/* Usage */}
      <TableCell>
        <UsageBarCompact apiKey={apiKey} />
      </TableCell>

      {/* Status */}
      <TableCell>{getStatusBadge()}</TableCell>

      {/* Actions */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewStats(apiKey)}>
              <Eye className="mr-2 h-4 w-4" />
              View Stats
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRegenerate(apiKey)}
              disabled={status === "revoked"}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(apiKey)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
