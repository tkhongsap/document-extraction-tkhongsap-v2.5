import type { User, Extraction, DocumentWithExtractions } from "@shared/schema";

// Auth API
export async function login(username: string, password: string): Promise<{ success: boolean; user: User }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Login failed");
  }

  return res.json();
}

export async function loginWithPassword(email: string, password: string): Promise<{ success: boolean; user: User }> {
  const res = await fetch("/api/auth/login-with-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username: email, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail?.message || error.detail || error.message || "Login failed");
  }

  return res.json();
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export async function register(userData: RegisterData): Promise<{ success: boolean; message: string; user_id: string; email: string }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(userData),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail?.message || error.detail || error.message || "Registration failed");
  }

  return res.json();
}

export async function verifyEmail(token: string): Promise<{ success: boolean; message: string; email: string }> {
  const res = await fetch("/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail?.message || error.detail || error.message || "Email verification failed");
  }

  return res.json();
}

export async function resendVerification(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail?.message || error.detail || error.message || "Failed to resend verification");
  }

  return res.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function getCurrentUser(): Promise<User> {
  const res = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Not authenticated");
  }

  return res.json();
}

// Template Extraction API (LlamaExtract-based for Bank, Invoice, PO, Contract)
export type DocumentType = "bank" | "invoice" | "po" | "contract" | "resume";

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
  confidenceScores?: Record<string, number>; // Normalized confidence scores for all fields
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

// =============================================================================
// Batch Extraction APIs
// =============================================================================

export interface BatchResultItem<T> {
  fileName: string;
  success: boolean;
  error: string | null;
  data: T | null;
}

export interface BatchExtractionResponse<T> {
  success: boolean;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  results: BatchResultItem<T>[];
}

export type BatchTemplateResultData = {
  headerFields: ExtractedField[];
  lineItems?: Array<Record<string, unknown>>;
  extractedData: Record<string, unknown>;
  confidenceScores?: Record<string, number>;
  pagesProcessed: number;
  fileSize: number;
  mimeType: string;
  documentId?: string;
};

export type BatchGeneralResultData = {
  markdown: string;
  text: string;
  pageCount: number;
  pages: GeneralExtractionPage[];
  fileSize: number;
  mimeType: string;
  overallConfidence?: number;
  confidenceStats?: { min: number; max: number; average: number };
  documentId?: string;
};

/**
 * Batch process multiple documents using LlamaExtract templates.
 * @param files - Array of files to process
 * @param documentType - The type of document (bank, invoice, po, contract, resume)
 * @returns Batch results with individual file statuses
 */
export async function processBatchTemplateExtraction(
  files: File[],
  documentType: DocumentType
): Promise<BatchExtractionResponse<BatchTemplateResultData>> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("documentType", documentType);

  const res = await fetch("/api/extract/batch/process", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Batch template extraction failed");
  }

  return res.json();
}

/**
 * Batch process multiple documents using LlamaParse for general extraction.
 * @param files - Array of files to process
 * @returns Batch results with individual file statuses
 */
export async function processBatchGeneralExtraction(
  files: File[]
): Promise<BatchExtractionResponse<BatchGeneralResultData>> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const res = await fetch("/api/extract/batch/general", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Batch general extraction failed");
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

// User Tier Management
export async function changeTier(tier: 'free' | 'pro' | 'enterprise'): Promise<{ 
  success: boolean; 
  tier: string; 
  monthly_limit: number; 
  monthly_usage: number;
  message: string;
}> {
  const res = await fetch("/api/user/change-tier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tier }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to change tier");
  }

  return res.json();
}

// ============================================================================
// Resume Search API
// ============================================================================

export interface ResumeSearchResult {
  id: string;
  userId: string;
  extractionId?: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  currentRole?: string;
  yearsExperience?: number;
  skills?: string[];
  summary?: string;
  sourceFileName?: string;
  createdAt?: string;
  similarity?: number;
}

export interface SearchResponse {
  results: ResumeSearchResult[];
  total: number;
  query: string;
}

/**
 * Semantic search for resumes using natural language
 */
export async function searchResumesSemanticApi(
  query: string, 
  limit: number = 10, 
  threshold: number = 0.5
): Promise<SearchResponse> {
  const res = await fetch("/api/search/resumes/semantic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ query, limit, threshold }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Search failed");
  }

  return res.json();
}

/**
 * Search resumes by required skills
 */
export async function searchResumesBySkillsApi(
  skills: string[], 
  limit: number = 10
): Promise<SearchResponse> {
  const res = await fetch("/api/search/resumes/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ skills, limit }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Search failed");
  }

  return res.json();
}

/**
 * List all resumes for current user
 */
export async function listResumesApi(limit: number = 50, offset: number = 0): Promise<SearchResponse> {
  const res = await fetch(`/api/search/resumes?limit=${limit}&offset=${offset}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to list resumes");
  }

  return res.json();
}

/**
 * Delete a resume
 */
export async function deleteResumeApi(resumeId: string): Promise<{ message: string }> {
  const res = await fetch(`/api/search/resumes/${resumeId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to delete resume");
  }

  return res.json();
}
