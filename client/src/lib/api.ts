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
 * Processes in chunks of 10 files to avoid timeout issues.
 * @param files - Array of files to process
 * @param documentType - The type of document (bank, invoice, po, contract, resume)
 * @returns Batch results with individual file statuses
 */
export async function processBatchTemplateExtraction(
  files: File[],
  documentType: DocumentType
): Promise<BatchExtractionResponse<BatchTemplateResultData>> {
  const CHUNK_SIZE = 5; // Process 5 files at a time to avoid rate limiting
  const CHUNK_DELAY = 2000; // 2 second delay between chunks
  const allResults: BatchResultItem<BatchTemplateResultData>[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Split files into chunks
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    
    // Add delay between chunks (not before the first chunk)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
    }
    
    const formData = new FormData();
    chunk.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("documentType", documentType);

    try {
      const res = await fetch("/api/extract/batch/process", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        // Mark all files in this chunk as failed
        chunk.forEach((file) => {
          allResults.push({
            fileName: file.name,
            success: false,
            error: error.detail || error.message || "Batch extraction failed",
            data: null,
          });
          failureCount++;
        });
        continue;
      }

      const chunkResult: BatchExtractionResponse<BatchTemplateResultData> = await res.json();
      allResults.push(...chunkResult.results);
      successCount += chunkResult.successCount;
      failureCount += chunkResult.failureCount;
    } catch (error: any) {
      // Network error - mark all files in chunk as failed
      chunk.forEach((file) => {
        allResults.push({
          fileName: file.name,
          success: false,
          error: error.message || "Network error",
          data: null,
        });
        failureCount++;
      });
    }
  }

  return {
    success: true,
    totalFiles: files.length,
    successCount,
    failureCount,
    results: allResults,
  };
}

/**
 * Batch process multiple documents using LlamaParse for general extraction.
 * Processes in chunks of 5 files to avoid timeout and rate limiting issues.
 * @param files - Array of files to process
 * @returns Batch results with individual file statuses
 */
export async function processBatchGeneralExtraction(
  files: File[]
): Promise<BatchExtractionResponse<BatchGeneralResultData>> {
  const CHUNK_SIZE = 5; // Process 5 files at a time to avoid rate limiting
  const CHUNK_DELAY = 2000; // 2 second delay between chunks
  const allResults: BatchResultItem<BatchGeneralResultData>[] = [];
  let successCount = 0;
  let failureCount = 0;

  // Split files into chunks
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    
    // Add delay between chunks (not before the first chunk)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
    }
    
    const formData = new FormData();
    chunk.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await fetch("/api/extract/batch/general", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        // Mark all files in this chunk as failed
        chunk.forEach((file) => {
          allResults.push({
            fileName: file.name,
            success: false,
            error: error.detail || error.message || "Batch extraction failed",
            data: null,
          });
          failureCount++;
        });
        continue;
      }

      const chunkResult: BatchExtractionResponse<BatchGeneralResultData> = await res.json();
      allResults.push(...chunkResult.results);
      successCount += chunkResult.successCount;
      failureCount += chunkResult.failureCount;
    } catch (error: any) {
      // Network error - mark all files in chunk as failed
      chunk.forEach((file) => {
        allResults.push({
          fileName: file.name,
          success: false,
          error: error.message || "Network error",
          data: null,
        });
        failureCount++;
      });
    }
  }

  return {
    success: true,
    totalFiles: files.length,
    successCount,
    failureCount,
    results: allResults,
  };
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

// Resume Search API
export interface ResumeSearchResult {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  current_role?: string;
  years_experience?: number;
  skills?: string[];
  education?: any[];
  experience?: any[];
  certifications?: string[];
  languages?: string[];
  summary?: string;
  source_file_name?: string;
  similarity_score?: number;
  created_at?: string;
}

export interface ResumeSearchResponse {
  results: ResumeSearchResult[];
  total: number;
  query: string;
}

export interface ResumeListResponse {
  resumes: ResumeSearchResult[];
  total: number;
}

export async function searchResumesSemanticApi(
  query: string,
  limit: number = 10,
  threshold: number = 0.5
): Promise<ResumeSearchResponse> {
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

export async function listResumesApi(
  limit: number = 100,
  offset: number = 0
): Promise<ResumeListResponse> {
  const res = await fetch(`/api/search/resumes?limit=${limit}&offset=${offset}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to fetch resumes");
  }

  return res.json();
}

export async function deleteResumeApi(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/search/resumes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to delete resume");
  }

  return res.json();
}

export interface RegenerateEmbeddingsResponse {
  message: string;
  success_count: number;
  failed_count: number;
  total: number;
  errors: string[];
}

export async function regenerateAllEmbeddingsApi(): Promise<RegenerateEmbeddingsResponse> {
  const res = await fetch("/api/search/resumes/regenerate-all-embeddings", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to regenerate embeddings");
  }

  return res.json();
}

// =============================================================================
// RAG (AI Chat) API
// =============================================================================

export interface RAGSource {
  resume_id: string;
  name: string;
  similarity_score: number;
  position?: string;
  email?: string;
}

export interface RAGQueryRequest {
  query: string;
  top_k?: number;
  similarity_threshold?: number;
  include_context?: boolean;
  temperature?: number;
}

export interface RAGQueryResponse {
  answer: string;
  query: string;
  sources: RAGSource[];
  context?: string;
  tokens_used: number;
  model: string;
  processing_time_ms: number;
  timestamp: string;
}

export async function ragQueryApi(request: RAGQueryRequest): Promise<RAGQueryResponse> {
  const res = await fetch("/api/rag/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      query: request.query,
      top_k: request.top_k ?? 5,
      similarity_threshold: request.similarity_threshold ?? 0.2,
      include_context: request.include_context ?? false,
      temperature: request.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "RAG query failed");
  }

  return res.json();
}

export interface RAGExamplesResponse {
  examples: Array<{
    category: string;
    queries: string[];
  }>;
}

export async function ragExamplesApi(): Promise<RAGExamplesResponse> {
  const res = await fetch("/api/rag/examples", {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to fetch RAG examples");
  }

  return res.json();
}

<<<<<<< HEAD
=======
// =============================================================================
// Chunks Search API (Semantic Chunks for better RAG)
// =============================================================================

export interface ChunkSearchResult {
  id: string;
  userId: string;
  documentId: string | null;
  extractionId: string | null;
  chunkIndex: number;
  chunkType: string | null;
  text: string;
  metadata: {
    type?: string;
    title?: string;
    section?: string;
    company?: string;
    position?: string;
    jobIndex?: number;
  } | null;
  createdAt: string | null;
  similarity: number;
}

export interface ChunkSearchResponse {
  success: boolean;
  query: string;
  results: ChunkSearchResult[];
  total_results: number;
}

export async function searchChunksApi(
  query: string,
  limit: number = 10,
  threshold: number = 0.3,
  chunkTypes?: string[]
): Promise<ChunkSearchResponse> {
  const res = await fetch("/api/chunks/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ 
      query, 
      limit, 
      similarity_threshold: threshold,
      chunk_types: chunkTypes 
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Chunks search failed");
  }

  return res.json();
}

export interface ChunkStats {
  success: boolean;
  stats: Record<string, number>;
}

export async function getChunkStatsApi(): Promise<ChunkStats> {
  const res = await fetch("/api/chunks/stats", {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Failed to get chunk stats");
  }

  return res.json();
}


// =============================================================================
// API KEYS API
// =============================================================================

export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  monthlyLimit: number;
  monthlyUsage: number;
  isActive: boolean;
  expiresAt: string | null;
  scopes: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreateResponse {
  apiKey: ApiKeyResponse;
  plainKey: string; // Only returned on create, never stored
  warning: string;
}

export interface ApiKeyStatsResponse {
  success: boolean;
  apiKeyId: string;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalPagesProcessed: number;
    averageResponseTimeMs: number;
    periodDays: number;
  };
}

// List all API keys for current user
export async function listApiKeys(): Promise<{ apiKeys: ApiKeyResponse[] }> {
  const res = await fetch("/api/keys", {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Failed to list API keys");
  }

  return res.json();
}

// Create a new API key
export async function createApiKey(data: {
  name: string;
  monthlyLimit?: number;
  scopes?: string;
  expiresAt?: string;
}): Promise<ApiKeyCreateResponse> {
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: data.name,
      monthly_limit: data.monthlyLimit,
      scopes: data.scopes,
      expires_at: data.expiresAt,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Failed to create API key");
  }

  return res.json();
}

// Get a specific API key
export async function getApiKey(keyId: string): Promise<{ apiKey: ApiKeyResponse }> {
  const res = await fetch(`/api/keys/${keyId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Failed to get API key");
  }

  return res.json();
}

// Update an API key
export async function updateApiKey(keyId: string, data: {
  name?: string;
  monthlyLimit?: number;
  scopes?: string;
  isActive?: boolean;
  expiresAt?: string | null;
}): Promise<{ apiKey: ApiKeyResponse }> {
  const res = await fetch(`/api/keys/${keyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: data.name,
      monthly_limit: data.monthlyLimit,
      scopes: data.scopes,
      is_active: data.isActive,
      expires_at: data.expiresAt,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Failed to update API key");
  }

  return res.json();
}

// Delete (deactivate) an API key
export async function deleteApiKey(keyId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/keys/${keyId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Failed to delete API key");
  }

  return res.json();
}

// Regenerate an API key (new key, same settings)
export async function regenerateApiKey(keyId: string): Promise<ApiKeyCreateResponse> {
  const res = await fetch(`/api/keys/${keyId}/regenerate`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Failed to regenerate API key");
  }

  return res.json();
}

// Get API key usage statistics
export async function getApiKeyStats(keyId: string, days: number = 30): Promise<ApiKeyStatsResponse> {
  const res = await fetch(`/api/keys/${keyId}/stats?days=${days}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || error.message || "Failed to get API key stats");
  }

  return res.json();
}
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
