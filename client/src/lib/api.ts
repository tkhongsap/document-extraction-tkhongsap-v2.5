import type { User, Extraction, DocumentWithExtractions } from "@shared/schema";

// Auth API
export async function login(): Promise<{ user: User }> {
  const res = await fetch("/api/auth/mock-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Login failed");
  }

  return res.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function getCurrentUser(): Promise<{ user: User }> {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Not authenticated");
  }

  return res.json();
}

// Template Extraction API (LlamaExtract-based for Bank, Invoice, PO, Contract)
export type DocumentType = "bank" | "invoice" | "po" | "contract";

export interface ExtractedField {
  key: string;
  value: string;
  confidence: number;
}

export interface TemplateExtractionResponse {
  success: boolean;
  headerFields: ExtractedField[];
  lineItems?: Array<Record<string, unknown>>;
  extractedData: Record<string, unknown>;
  pagesProcessed: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentId?: string; // Optional documentId if document was stored
}

/**
 * Process a document using LlamaExtract for template-based extraction.
 * Used for Bank Statement, Invoice, Purchase Order, and Contract templates.
 * @param file - The file to process
 * @param documentType - The type of document (bank, invoice, po, contract)
 * @returns Extracted structured data with header fields and line items
 */
export async function processTemplateExtraction(
  file: File,
  documentType: DocumentType
): Promise<TemplateExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentType", documentType);

  const res = await fetch("/api/extract/process", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Template extraction failed");
  }

  return res.json();
}

// General Extraction API (LlamaParse-based parsing for "New Extraction" feature)
export interface LlamaParseLayoutElement {
  bbox: { x: number; y: number; w: number; h: number };
  image?: string;
  confidence: number; // 0-1 range
  label: "text" | "table" | "figure" | "title" | "list";
  isLikelyNoise: boolean;
}

export interface GeneralExtractionPage {
  pageNumber: number;
  markdown: string;
  text: string;
  layout?: LlamaParseLayoutElement[];
  confidence?: number; // Average confidence for this page
}

export interface GeneralExtractionResponse {
  success: boolean;
  markdown: string;
  text: string;
  pageCount: number;
  pages: GeneralExtractionPage[];
  fileName: string;
  fileSize: number;
  mimeType: string;
  overallConfidence?: number; // Average confidence across all pages
  confidenceStats?: {
    min: number;
    max: number;
    average: number;
  };
  documentId?: string; // Optional documentId if document was stored
}

/**
 * Process a document using LlamaParse for general extraction.
 * This is specifically for the "New Extraction" (general) feature.
 * @param file - The file to process
 * @returns Parsed document with markdown content
 */
export async function processGeneralExtraction(file: File): Promise<GeneralExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/extract/general", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "General extraction failed");
  }

  return res.json();
}

export interface SaveExtractionRequest {
  fileName: string;
  fileSize: number;
  documentType: string;
  pagesProcessed: number;
  extractedData: any;
  status: string;
  documentId?: string; // Optional documentId to link to stored document
}

export async function saveExtraction(data: SaveExtractionRequest): Promise<{ extraction: Extraction }> {
  const res = await fetch("/api/extractions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to save extraction");
  }

  return res.json();
}

export async function getExtractions(limit?: number): Promise<{ extractions: Extraction[] }> {
  const url = limit ? `/api/extractions?limit=${limit}` : "/api/extractions";
  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch extractions");
  }

  return res.json();
}

export async function getExtraction(id: string): Promise<{ extraction: Extraction }> {
  const res = await fetch(`/api/extractions/${id}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch extraction");
  }

  return res.json();
}

export async function getDocumentsWithExtractions(limit: number = 20): Promise<{ documents: DocumentWithExtractions[] }> {
  const url = limit ? `/api/documents-with-extractions?limit=${limit}` : "/api/documents-with-extractions";
  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch documents with extractions");
  }

  return res.json();
}
