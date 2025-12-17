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

