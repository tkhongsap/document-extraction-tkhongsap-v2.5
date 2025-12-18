import type { Extraction } from "@shared/schema";

/**
 * Export extraction data to JSON format
 */
export function exportToJSON(extraction: Extraction): void {
  const dataStr = JSON.stringify(extraction.extractedData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${extraction.fileName.replace(/\.[^/.]+$/, "")}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export extraction data to plain text format
 */
export function exportToText(extraction: Extraction): void {
  const extractedData = extraction.extractedData as any;
  let text = "";

  if (extraction.documentType === "general") {
    // For general extractions, use the text field
    text = extractedData?.text || extractedData?.markdown || "";
  } else {
    // For template extractions, format header fields and line items
    if (extractedData?.headerFields) {
      text += "Header Fields:\n";
      text += "=".repeat(50) + "\n";
      extractedData.headerFields.forEach((field: any) => {
        text += `${field.key || field.name || "Unknown"}: ${field.value || ""}\n`;
      });
      text += "\n";
    }

    if (extractedData?.lineItems && Array.isArray(extractedData.lineItems)) {
      text += "Line Items:\n";
      text += "=".repeat(50) + "\n";
      extractedData.lineItems.forEach((item: any, index: number) => {
        text += `\nItem ${index + 1}:\n`;
        Object.entries(item).forEach(([key, value]) => {
          text += `  ${key}: ${value}\n`;
        });
      });
    }
  }

  const dataBlob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${extraction.fileName.replace(/\.[^/.]+$/, "")}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export extraction data to Markdown format
 */
export function exportToMarkdown(extraction: Extraction): void {
  const extractedData = extraction.extractedData as any;
  let markdown = `# ${extraction.fileName}\n\n`;
  markdown += `**Document Type:** ${extraction.documentType}\n`;
  markdown += `**Extracted:** ${new Date(extraction.createdAt).toLocaleString()}\n\n`;

  if (extraction.documentType === "general") {
    // For general extractions, use the markdown field
    markdown += extractedData?.markdown || extractedData?.text || "";
  } else {
    // For template extractions, format as markdown tables
    if (extractedData?.headerFields) {
      markdown += "## Header Fields\n\n";
      markdown += "| Field | Value |\n";
      markdown += "|-------|-------|\n";
      extractedData.headerFields.forEach((field: any) => {
        const key = (field.key || field.name || "Unknown").replace(/\|/g, "\\|");
        const value = (field.value || "").replace(/\|/g, "\\|");
        markdown += `| ${key} | ${value} |\n`;
      });
      markdown += "\n";
    }

    if (extractedData?.lineItems && Array.isArray(extractedData.lineItems) && extractedData.lineItems.length > 0) {
      markdown += "## Line Items\n\n";
      // Get all keys from first item to create table header
      const firstItem = extractedData.lineItems[0];
      const keys = Object.keys(firstItem);
      
      markdown += "| " + keys.map((k) => k.replace(/\|/g, "\\|")).join(" | ") + " |\n";
      markdown += "| " + keys.map(() => "---").join(" | ") + " |\n";
      
      extractedData.lineItems.forEach((item: any) => {
        const values = keys.map((key) => {
          const value = item[key];
          return String(value || "").replace(/\|/g, "\\|");
        });
        markdown += "| " + values.join(" | ") + " |\n";
      });
    }
  }

  const dataBlob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${extraction.fileName.replace(/\.[^/.]+$/, "")}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export extraction data to CSV format
 */
export function exportToCSV(extraction: Extraction): void {
  const extractedData = extraction.extractedData as any;
  let csv = "";

  if (extraction.documentType === "general") {
    // For general extractions, export as simple text CSV
    csv = `"Field","Value"\n`;
    csv += `"Document Type","${extraction.documentType}"\n`;
    csv += `"File Name","${extraction.fileName}"\n`;
    csv += `"Extracted","${new Date(extraction.createdAt).toISOString()}"\n`;
    if (extractedData?.text) {
      csv += `"Content","${extractedData.text.replace(/"/g, '""')}"\n`;
    }
  } else {
    // For template extractions, create CSV with header fields and line items
    if (extractedData?.headerFields && extractedData.headerFields.length > 0) {
      csv += "Header Fields\n";
      csv += "Field,Value\n";
      extractedData.headerFields.forEach((field: any) => {
        const key = (field.key || field.name || "Unknown").replace(/"/g, '""');
        const value = (field.value || "").replace(/"/g, '""');
        csv += `"${key}","${value}"\n`;
      });
      csv += "\n";
    }

    if (extractedData?.lineItems && Array.isArray(extractedData.lineItems) && extractedData.lineItems.length > 0) {
      csv += "Line Items\n";
      const firstItem = extractedData.lineItems[0];
      const keys = Object.keys(firstItem);
      
      csv += keys.map((k) => `"${k.replace(/"/g, '""')}"`).join(",") + "\n";
      
      extractedData.lineItems.forEach((item: any) => {
        const values = keys.map((key) => {
          const value = item[key];
          return `"${String(value || "").replace(/"/g, '""')}"`;
        });
        csv += values.join(",") + "\n";
      });
    }
  }

  const dataBlob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${extraction.fileName.replace(/\.[^/.]+$/, "")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export extraction data to Excel format (.xlsx)
 */
export async function exportToExcel(extraction: Extraction): Promise<void> {
  const ExcelJS = await import("exceljs");
  const extractedData = extraction.extractedData as any;
  const workbook = new ExcelJS.Workbook();

  if (extraction.documentType === "general") {
    // For general extractions, create a simple sheet with metadata and content
    const worksheet = workbook.addWorksheet("Extraction");
    worksheet.addRows([
      ["Field", "Value"],
      ["Document Type", extraction.documentType],
      ["File Name", extraction.fileName],
      ["Extracted", new Date(extraction.createdAt).toISOString()],
      ["", ""],
      ["Content", extractedData?.text || extractedData?.markdown || ""],
    ]);
  } else {
    // For template extractions, create separate sheets for header fields and line items
    if (extractedData?.headerFields && extractedData.headerFields.length > 0) {
      const headerSheet = workbook.addWorksheet("Header Fields");
      headerSheet.addRows([
        ["Field", "Value"],
        ...extractedData.headerFields.map((field: any) => [
          field.key || field.name || "Unknown",
          field.value || "",
        ]),
      ]);
    }

    if (extractedData?.lineItems && Array.isArray(extractedData.lineItems) && extractedData.lineItems.length > 0) {
      const firstItem = extractedData.lineItems[0];
      const keys = Object.keys(firstItem);
      const lineItemSheet = workbook.addWorksheet("Line Items");
      lineItemSheet.addRows([
        keys,
        ...extractedData.lineItems.map((item: any) =>
          keys.map((key) => item[key] || "")
        ),
      ]);
    }
  }

  // Write workbook to file and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${extraction.fileName.replace(/\.[^/.]+$/, "")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Interface for structured export data (used in StructuredResultsViewer)
 */
export interface StructuredExportData {
  headerFields: Array<{ key: string; value: string; confidence?: number }>;
  lineItems?: Array<Record<string, unknown>>;
  extractedData?: Record<string, unknown>;
  documentType: string;
  fileName: string;
}

/**
 * Resume array keys for multi-section export
 */
const RESUME_ARRAY_KEYS = [
  { key: "work_experience", title: "Work Experience" },
  { key: "education", title: "Education" },
  { key: "skills", title: "Skills" },
  { key: "certifications", title: "Certifications" },
  { key: "languages", title: "Languages" },
  { key: "projects", title: "Projects" },
  { key: "references", title: "References" },
];

/**
 * Contract array keys for multi-section export
 */
const CONTRACT_ARRAY_KEYS = [
  { key: "parties", title: "Parties" },
  { key: "signatures", title: "Signatures" },
];

/**
 * Line items keys for different document types
 */
const LINE_ITEMS_KEYS: Record<string, { key: string; title: string }[]> = {
  bank: [{ key: "transactions", title: "Transactions" }],
  invoice: [{ key: "line_items", title: "Line Items" }],
  po: [{ key: "line_items", title: "Order Items" }],
  contract: CONTRACT_ARRAY_KEYS,
};

/**
 * Export structured data to JSON format (for StructuredResultsViewer)
 */
export function exportStructuredToJSON(data: StructuredExportData): void {
  const isResume = data.documentType === "resume";
  
  let exportData: Record<string, unknown> = {
    documentType: data.documentType,
    headerFields: data.headerFields,
  };

  if (isResume && data.extractedData) {
    // For resume, include all array sections
    RESUME_ARRAY_KEYS.forEach(({ key }) => {
      const arrayData = data.extractedData?.[key];
      if (Array.isArray(arrayData) && arrayData.length > 0) {
        exportData[key] = arrayData;
      }
    });
  } else {
    // For other document types, include arrays from LINE_ITEMS_KEYS
    const arrayConfigs = LINE_ITEMS_KEYS[data.documentType];
    if (arrayConfigs && data.extractedData) {
      arrayConfigs.forEach(({ key }) => {
        const arrayData = data.extractedData?.[key];
        if (Array.isArray(arrayData) && arrayData.length > 0) {
          exportData[key] = arrayData;
        }
      });
    }
    // Also include lineItems if provided directly
    if (data.lineItems && data.lineItems.length > 0) {
      exportData.lineItems = data.lineItems;
    }
  }

  // Include raw data for completeness
  exportData.rawData = data.extractedData || {};
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.fileName.replace(/\.[^/.]+$/, "")}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create a worksheet from array data
 */
function createArrayWorksheet(
  workbook: import("exceljs").Workbook,
  title: string,
  arrayData: Array<Record<string, unknown>>
): void {
  if (!arrayData || arrayData.length === 0) return;

  const sheet = workbook.addWorksheet(title);
  const firstItem = arrayData[0];
  const keys = Object.keys(firstItem);

  // Add header row and data rows
  sheet.addRows([
    keys.map(k => k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())), // Format headers
    ...arrayData.map((item) =>
      keys.map((key) => {
        const value = item[key];
        return value !== null && value !== undefined ? String(value) : "";
      })
    ),
  ]);

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Auto-fit columns (approximate)
  keys.forEach((_, index) => {
    sheet.getColumn(index + 1).width = 20;
  });
}

/**
 * Export structured data to Excel format (for StructuredResultsViewer)
 */
export async function exportStructuredToExcel(data: StructuredExportData): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const isResume = data.documentType === "resume";

  // Create Header Fields sheet
  if (data.headerFields && data.headerFields.length > 0) {
    const headerSheet = workbook.addWorksheet("Header Fields");
    headerSheet.addRows([
      ["Field", "Value", "Confidence"],
      ...data.headerFields.map((field) => [
        field.key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        field.value,
        field.confidence ? `${Math.round(field.confidence * 100)}%` : "-",
      ]),
    ]);
    
    // Style header row
    headerSheet.getRow(1).font = { bold: true };
    headerSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    headerSheet.columns = [
      { width: 30 },
      { width: 50 },
      { width: 15 },
    ];
  }

  if (isResume && data.extractedData) {
    // For resume, create separate sheets for each array section
    RESUME_ARRAY_KEYS.forEach(({ key, title }) => {
      const arrayData = data.extractedData?.[key] as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(arrayData) && arrayData.length > 0) {
        createArrayWorksheet(workbook, title, arrayData);
      }
    });
  } else {
    // For other document types, create sheets for each array in LINE_ITEMS_KEYS
    const arrayConfigs = LINE_ITEMS_KEYS[data.documentType];
    if (arrayConfigs && data.extractedData) {
      arrayConfigs.forEach(({ key, title }) => {
        const arrayData = data.extractedData?.[key] as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(arrayData) && arrayData.length > 0) {
          createArrayWorksheet(workbook, title, arrayData);
        }
      });
    }
    
    // Also include lineItems if provided directly and no array was found
    if (data.lineItems && data.lineItems.length > 0 && workbook.worksheets.length <= 1) {
      createArrayWorksheet(workbook, "Line Items", data.lineItems);
    }
  }

  // If no sheets were created, create a default one
  if (workbook.worksheets.length === 0) {
    const defaultSheet = workbook.addWorksheet("Data");
    defaultSheet.addRow(["No data available"]);
  }

  // Write workbook to file and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.fileName.replace(/\.[^/.]+$/, "")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
