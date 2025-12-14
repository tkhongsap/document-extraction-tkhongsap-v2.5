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
  extractedData?: Record<string, unknown>;
  documentType: DocumentType;
  onFieldChange?: (index: number, newValue: string) => void;
  className?: string;
}

interface ArraySectionConfig {
  key: string;
  title: string;
  columns: { key: string; label: string; width?: string }[];
}

/**
 * Get display configuration for line items based on document type
 */
function getLineItemsConfig(documentType: DocumentType): ArraySectionConfig | null {
  const configs: Record<string, ArraySectionConfig> = {
    bank: {
      key: "transactions",
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
      key: "line_items",
      title: "Line Items",
      columns: [
        { key: "description", label: "Description" },
        { key: "quantity", label: "Qty", width: "w-16" },
        { key: "unit_price", label: "Unit Price", width: "w-24" },
        { key: "amount", label: "Amount", width: "w-24" },
      ],
    },
    po: {
      key: "line_items",
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
      key: "parties",
      title: "Parties",
      columns: [
        { key: "name", label: "Name" },
        { key: "role", label: "Role", width: "w-28" },
        { key: "address", label: "Address" },
      ],
    },
  };

  return configs[documentType] || null;
}

/**
 * Get all array section configurations for resume template
 */
function getResumeArrayConfigs(): ArraySectionConfig[] {
  return [
    {
      key: "work_experience",
      title: "Work Experience",
      columns: [
        { key: "company_name", label: "Company" },
        { key: "job_title", label: "Job Title" },
        { key: "location", label: "Location", width: "w-28" },
        { key: "start_date", label: "Start", width: "w-24" },
        { key: "end_date", label: "End", width: "w-24" },
        { key: "employment_type", label: "Type", width: "w-24" },
      ],
    },
    {
      key: "education",
      title: "Education",
      columns: [
        { key: "institution_name", label: "Institution" },
        { key: "degree", label: "Degree" },
        { key: "field_of_study", label: "Field", width: "w-32" },
        { key: "graduation_date", label: "Graduation", width: "w-28" },
        { key: "gpa", label: "GPA", width: "w-16" },
      ],
    },
    {
      key: "skills",
      title: "Skills",
      columns: [
        { key: "skill_name", label: "Skill" },
        { key: "category", label: "Category", width: "w-28" },
        { key: "proficiency_level", label: "Proficiency", width: "w-28" },
      ],
    },
    {
      key: "certifications",
      title: "Certifications",
      columns: [
        { key: "certification_name", label: "Certification" },
        { key: "issuing_organization", label: "Issuer", width: "w-32" },
        { key: "issue_date", label: "Issued", width: "w-24" },
        { key: "expiration_date", label: "Expires", width: "w-24" },
        { key: "credential_id", label: "Credential ID", width: "w-28" },
      ],
    },
    {
      key: "languages",
      title: "Languages",
      columns: [
        { key: "language", label: "Language" },
        { key: "proficiency", label: "Proficiency", width: "w-32" },
      ],
    },
    {
      key: "projects",
      title: "Projects",
      columns: [
        { key: "project_name", label: "Project" },
        { key: "description", label: "Description" },
        { key: "technologies", label: "Technologies", width: "w-32" },
        { key: "url", label: "URL", width: "w-28" },
      ],
    },
    {
      key: "references",
      title: "References",
      columns: [
        { key: "reference_name", label: "Name" },
        { key: "relationship", label: "Relationship", width: "w-28" },
        { key: "company", label: "Company", width: "w-32" },
        { key: "contact", label: "Contact", width: "w-32" },
      ],
    },
  ];
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
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  }
  return String(value);
}

/**
 * Collapsible array section component
 */
function ArraySection({
  config,
  data,
  isExpanded,
  onToggle,
}: {
  config: ArraySectionConfig;
  data: Array<Record<string, unknown>>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (!data || data.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-4" data-testid={`section-${config.key}`}>
      <Button
        variant="ghost"
        className="w-full justify-start px-2 py-1 h-auto font-medium text-sm hover:bg-muted/50"
        onClick={onToggle}
        data-testid={`toggle-${config.key}`}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-2" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-2" />
        )}
        {config.title} ({data.length})
      </Button>

      {isExpanded && (
        <div className="mt-2 border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {config.columns.map((col) => (
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
              {data.map((item, rowIndex) => (
                <TableRow key={rowIndex} data-testid={`row-${config.key}-${rowIndex}`}>
                  {config.columns.map((col) => (
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
  );
}

export function StructuredResultsViewer({
  headerFields,
  lineItems,
  extractedData,
  documentType,
  onFieldChange,
  className,
}: StructuredResultsViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const isResume = documentType === "resume";
  const lineItemsConfig = !isResume ? getLineItemsConfig(documentType) : null;
  const resumeArrayConfigs = isResume ? getResumeArrayConfigs() : [];

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  const isSectionExpanded = (key: string) => {
    return expandedSections[key] === undefined ? true : expandedSections[key];
  };

  const getArrayData = (key: string): Array<Record<string, unknown>> => {
    if (extractedData && Array.isArray(extractedData[key])) {
      return extractedData[key] as Array<Record<string, unknown>>;
    }
    return [];
  };

  return (
    <div className={cn("flex flex-col h-full overflow-auto", className)} data-testid="structured-results-viewer">
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
              <TableRow key={`${field.key}-${i}`} data-testid={`field-row-${i}`}>
                <TableCell className="font-medium text-muted-foreground text-xs uppercase tracking-wider align-middle">
                  {formatFieldKey(field.key)}
                </TableCell>
                <TableCell className="p-2">
                  {onFieldChange ? (
                    <Input
                      value={field.value}
                      onChange={(e) => onFieldChange(i, e.target.value)}
                      className="h-8 bg-transparent border-transparent hover:border-input focus:border-primary focus:bg-background transition-all"
                      data-testid={`input-field-${i}`}
                    />
                  ) : (
                    <span className="text-sm" data-testid={`value-field-${i}`}>{field.value}</span>
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
                    data-testid={`confidence-${i}`}
                  >
                    {Math.round(field.confidence * 100)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Single Array Section for non-resume documents */}
      {!isResume && lineItems && lineItems.length > 0 && lineItemsConfig && (
        <ArraySection
          config={lineItemsConfig}
          data={lineItems}
          isExpanded={isSectionExpanded(lineItemsConfig.key)}
          onToggle={() => toggleSection(lineItemsConfig.key)}
        />
      )}

      {/* Multiple Array Sections for resume documents */}
      {isResume && resumeArrayConfigs.map((config) => {
        const arrayData = getArrayData(config.key);
        return (
          <ArraySection
            key={config.key}
            config={config}
            data={arrayData}
            isExpanded={isSectionExpanded(config.key)}
            onToggle={() => toggleSection(config.key)}
          />
        );
      })}

      {/* Export Buttons */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t flex gap-2 justify-end">
        <Button variant="outline" size="sm" className="h-8 text-xs" data-testid="button-export-json">
          <Download className="mr-2 h-3 w-3" />
          Export JSON
        </Button>
        <Button variant="default" size="sm" className="h-8 text-xs" data-testid="button-export-excel">
          <Download className="mr-2 h-3 w-3" />
          Export Excel
        </Button>
      </div>
    </div>
  );
}
