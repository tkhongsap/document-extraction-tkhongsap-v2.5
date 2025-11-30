import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedField, DocumentType } from "@/lib/api";

interface StructuredResultsViewerProps {
  headerFields: ExtractedField[];
  lineItems?: Array<Record<string, unknown>>;
  documentType: DocumentType;
  onFieldChange?: (index: number, newValue: string) => void;
  className?: string;
}

/**
 * Get display configuration for line items based on document type
 */
function getLineItemsConfig(documentType: DocumentType) {
  const configs: Record<DocumentType, { title: string; columns: { key: string; label: string; width?: string }[] }> = {
    bank: {
      title: "Transactions",
      columns: [
        { key: "date", label: "Date", width: "w-24" },
        { key: "description", label: "Description" },
        { key: "reference", label: "Reference", width: "w-28" },
        { key: "debit", label: "Debit", width: "w-24" },
        { key: "credit", label: "Credit", width: "w-24" },
        { key: "balance", label: "Balance", width: "w-28" },
      ],
    },
    invoice: {
      title: "Line Items",
      columns: [
        { key: "description", label: "Description" },
        { key: "quantity", label: "Qty", width: "w-16" },
        { key: "unit_price", label: "Unit Price", width: "w-24" },
        { key: "amount", label: "Amount", width: "w-24" },
      ],
    },
    po: {
      title: "Order Items",
      columns: [
        { key: "item_code", label: "Code", width: "w-24" },
        { key: "description", label: "Description" },
        { key: "quantity", label: "Qty", width: "w-16" },
        { key: "unit_price", label: "Unit Price", width: "w-24" },
        { key: "amount", label: "Amount", width: "w-24" },
      ],
    },
    contract: {
      title: "Parties",
      columns: [
        { key: "name", label: "Name" },
        { key: "role", label: "Role", width: "w-28" },
        { key: "address", label: "Address" },
      ],
    },
  };

  return configs[documentType];
}

/**
 * Format a field key for display (e.g., "vendor.name" -> "Vendor Name")
 */
function formatFieldKey(key: string): string {
  return key
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" › ");
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    // Format numbers with commas
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  }
  return String(value);
}

export function StructuredResultsViewer({
  headerFields,
  lineItems,
  documentType,
  onFieldChange,
  className,
}: StructuredResultsViewerProps) {
  const [isLineItemsExpanded, setIsLineItemsExpanded] = useState(true);
  const lineItemsConfig = getLineItemsConfig(documentType);

  return (
    <div className={cn("flex flex-col h-full overflow-auto", className)}>
      {/* Header Fields Table */}
      <div className="flex-shrink-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[35%]">Field</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-[80px] text-right">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headerFields.map((field, i) => (
              <TableRow key={`${field.key}-${i}`}>
                <TableCell className="font-medium text-muted-foreground text-xs uppercase tracking-wider align-middle">
                  {formatFieldKey(field.key)}
                </TableCell>
                <TableCell className="p-2">
                  {onFieldChange ? (
                    <Input
                      value={field.value}
                      onChange={(e) => onFieldChange(i, e.target.value)}
                      className="h-8 bg-transparent border-transparent hover:border-input focus:border-primary focus:bg-background transition-all"
                    />
                  ) : (
                    <span className="text-sm">{field.value}</span>
                  )}
                </TableCell>
                <TableCell className="text-right align-middle">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-help",
                      field.confidence > 0.9
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : field.confidence > 0.7
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    )}
                    title={`Confidence Score: ${Math.round(field.confidence * 100)}%`}
                  >
                    {Math.round(field.confidence * 100)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Line Items Section */}
      {lineItems && lineItems.length > 0 && (
        <div className="mt-4 border-t pt-4">
          {/* Line Items Header */}
          <Button
            variant="ghost"
            className="w-full justify-start px-2 py-1 h-auto font-medium text-sm hover:bg-muted/50"
            onClick={() => setIsLineItemsExpanded(!isLineItemsExpanded)}
          >
            {isLineItemsExpanded ? (
              <ChevronDown className="h-4 w-4 mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            {lineItemsConfig.title} ({lineItems.length})
          </Button>

          {/* Line Items Table */}
          {isLineItemsExpanded && (
            <div className="mt-2 border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {lineItemsConfig.columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={cn("text-xs", col.width)}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {lineItemsConfig.columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={cn("text-sm py-2", col.width)}
                        >
                          {formatValue(item[col.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t flex gap-2 justify-end">
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Download className="mr-2 h-3 w-3" />
          Export JSON
        </Button>
        <Button variant="default" size="sm" className="h-8 text-xs">
          <Download className="mr-2 h-3 w-3" />
          Export Excel
        </Button>
      </div>
    </div>
  );
}


