/**
 * LlamaExtract Service
 * 
 * Integrates with LlamaCloud's LlamaExtract API for structured data extraction.
 * Used for template-based extractions (Bank Statement, Invoice, PO, Contract).
 */

import { getSchemaForType, type DocumentType } from "./extractionSchemas";

const LLAMA_EXTRACT_API_BASE = "https://api.cloud.llamaindex.ai/api/v1";

// API Response types
interface LlamaExtractAgentResponse {
  id: string;
  name: string;
  data_schema: Record<string, unknown>;
  extraction_mode: string;
  extraction_target: string;
}

interface LlamaExtractFileResponse {
  id: string;
  name: string;
}

interface LlamaExtractJobResponse {
  id: string;
  status: string;
}

interface LlamaExtractJobStatusResponse {
  id: string;
  status: "PENDING" | "SUCCESS" | "ERROR" | "CANCELLED";
}

interface LlamaExtractResultResponse {
  extraction_id: string;
  data: Record<string, unknown>;
  extraction_metadata?: {
    confidence_scores?: Record<string, number>;
    citations?: Record<string, unknown>;
  };
}

// Output types for formatted results
export interface ExtractedField {
  key: string;
  value: string;
  confidence: number;
}

export interface TemplateExtractionResult {
  success: boolean;
  pagesProcessed: number;
  headerFields: ExtractedField[];
  lineItems?: Array<Record<string, unknown>>;
  extractedData: Record<string, unknown>;
}

export class LlamaExtractError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = "LlamaExtractError";
  }
}

/**
 * LlamaExtract service for structured data extraction
 */
export class LlamaExtractService {
  private apiKey: string;
  private maxRetries: number;
  private pollIntervalMs: number;
  private agentCache: Map<string, string> = new Map(); // documentType -> agentId

  constructor() {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) {
      throw new LlamaExtractError(
        "LLAMA_CLOUD_API_KEY environment variable is not set"
      );
    }
    this.apiKey = apiKey;
    this.maxRetries = 60; // Max 60 retries (3 minutes with 3s interval)
    this.pollIntervalMs = 3000; // Poll every 3 seconds

    console.log(`[LlamaExtract] API key configured: ${apiKey.substring(0, 10)}...`);
  }

  /**
   * Extract structured data from a document using a template schema
   */
  async extractDocument(
    fileBuffer: Buffer,
    fileName: string,
    documentType: DocumentType
  ): Promise<TemplateExtractionResult> {
    console.log(`[LlamaExtract] Starting extraction for ${fileName} with type: ${documentType}`);

    // Step 1: Get or create the extraction agent for this document type
    const agentId = await this.getOrCreateAgent(documentType);
    console.log(`[LlamaExtract] Using agent: ${agentId}`);

    // Step 2: Upload the file
    const fileId = await this.uploadFile(fileBuffer, fileName);
    console.log(`[LlamaExtract] File uploaded: ${fileId}`);

    // Step 3: Create an extraction job
    const jobId = await this.createJob(agentId, fileId);
    console.log(`[LlamaExtract] Job created: ${jobId}`);

    // Step 4: Poll for completion
    await this.waitForCompletion(jobId);
    console.log(`[LlamaExtract] Job completed: ${jobId}`);

    // Step 5: Get the results
    const result = await this.getResult(jobId);
    console.log(`[LlamaExtract] Retrieved results for job: ${jobId}`);

    // Step 6: Format the results for the frontend
    return this.formatResult(result, documentType);
  }

  /**
   * Get or create an extraction agent for the given document type
   */
  private async getOrCreateAgent(documentType: DocumentType): Promise<string> {
    // Check cache first
    const cachedAgentId = this.agentCache.get(documentType);
    if (cachedAgentId) {
      console.log(`[LlamaExtract] Using cached agent for ${documentType}: ${cachedAgentId}`);
      return cachedAgentId;
    }

    const agentName = `docai-${documentType}-v1`;

    // Try to find existing agent by name
    try {
      const existingAgent = await this.getAgentByName(agentName);
      if (existingAgent) {
        console.log(`[LlamaExtract] Found existing agent: ${existingAgent.id}`);
        this.agentCache.set(documentType, existingAgent.id);
        return existingAgent.id;
      }
    } catch (error) {
      // Agent doesn't exist, we'll create it
      console.log(`[LlamaExtract] Agent ${agentName} not found, creating new one`);
    }

    // Create new agent
    const schema = getSchemaForType(documentType);
    const agent = await this.createAgent(agentName, schema);
    this.agentCache.set(documentType, agent.id);
    console.log(`[LlamaExtract] Created new agent: ${agent.id}`);
    return agent.id;
  }

  /**
   * Get an extraction agent by name
   */
  private async getAgentByName(name: string): Promise<LlamaExtractAgentResponse | null> {
    const response = await fetch(
      `${LLAMA_EXTRACT_API_BASE}/extraction/extraction-agents/by-name/${encodeURIComponent(name)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new LlamaExtractError(
        `Failed to get agent by name: ${errorText}`,
        response.status
      );
    }

    return (await response.json()) as LlamaExtractAgentResponse;
  }

  /**
   * Create a new extraction agent with the given schema
   */
  private async createAgent(
    name: string,
    schema: Record<string, unknown>
  ): Promise<LlamaExtractAgentResponse> {
    const response = await fetch(
      `${LLAMA_EXTRACT_API_BASE}/extraction/extraction-agents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          data_schema: schema,
          config: {
            extraction_mode: "MULTIMODAL",
            extraction_target: "PER_DOC",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LlamaExtract] Failed to create agent: ${response.status} - ${errorText}`);
      
      // Try to parse error details for better error messages
      let errorMessage = `Failed to create extraction agent`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail && Array.isArray(errorJson.detail) && errorJson.detail.length > 0) {
          const firstError = errorJson.detail[0];
          errorMessage = `${errorMessage}: ${firstError.msg || firstError.type || 'Unknown error'}`;
        } else if (errorJson.message) {
          errorMessage = `${errorMessage}: ${errorJson.message}`;
        } else {
          errorMessage = `${errorMessage}: ${errorText}`;
        }
      } catch {
        errorMessage = `${errorMessage}: ${errorText}`;
      }
      
      throw new LlamaExtractError(errorMessage, response.status);
    }

    return (await response.json()) as LlamaExtractAgentResponse;
  }

  /**
   * Upload a file to LlamaCloud
   */
  private async uploadFile(
    fileBuffer: Buffer,
    fileName: string
  ): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: this.getMimeType(fileName) });
    formData.append("upload_file", blob, fileName);

    const response = await fetch(`${LLAMA_EXTRACT_API_BASE}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LlamaExtract] File upload failed: ${response.status} - ${errorText}`);
      throw new LlamaExtractError(
        `Failed to upload file: ${errorText}`,
        response.status
      );
    }

    const data = (await response.json()) as LlamaExtractFileResponse;
    return data.id;
  }

  /**
   * Create an extraction job
   */
  private async createJob(agentId: string, fileId: string): Promise<string> {
    const response = await fetch(
      `${LLAMA_EXTRACT_API_BASE}/extraction/jobs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          extraction_agent_id: agentId,
          file_id: fileId,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LlamaExtract] Job creation failed: ${response.status} - ${errorText}`);
      throw new LlamaExtractError(
        `Failed to create extraction job: ${errorText}`,
        response.status
      );
    }

    const data = (await response.json()) as LlamaExtractJobResponse;
    return data.id;
  }

  /**
   * Poll for job completion
   */
  private async waitForCompletion(jobId: string): Promise<void> {
    for (let i = 0; i < this.maxRetries; i++) {
      const status = await this.getJobStatus(jobId);

      if (status === "SUCCESS") {
        return;
      }

      if (status === "ERROR" || status === "CANCELLED") {
        throw new LlamaExtractError(`Job ${jobId} failed with status: ${status}`);
      }

      // Wait before next poll
      await this.sleep(this.pollIntervalMs);
    }

    throw new LlamaExtractError(
      `Job ${jobId} timed out after ${(this.maxRetries * this.pollIntervalMs) / 1000} seconds`
    );
  }

  /**
   * Get the status of an extraction job
   */
  private async getJobStatus(jobId: string): Promise<LlamaExtractJobStatusResponse["status"]> {
    const response = await fetch(
      `${LLAMA_EXTRACT_API_BASE}/extraction/jobs/${jobId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new LlamaExtractError(
        `Failed to get job status: ${errorText}`,
        response.status
      );
    }

    const data = (await response.json()) as LlamaExtractJobStatusResponse;
    return data.status;
  }

  /**
   * Get the extraction result
   */
  private async getResult(jobId: string): Promise<LlamaExtractResultResponse> {
    const response = await fetch(
      `${LLAMA_EXTRACT_API_BASE}/extraction/jobs/${jobId}/result`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new LlamaExtractError(
        `Failed to get job result: ${errorText}`,
        response.status
      );
    }

    return (await response.json()) as LlamaExtractResultResponse;
  }

  /**
   * Format the extraction result for the frontend
   */
  private formatResult(
    result: LlamaExtractResultResponse,
    documentType: DocumentType
  ): TemplateExtractionResult {
    const data = result.data || {};
    const confidenceScores = result.extraction_metadata?.confidence_scores || {};

    // Separate header fields from line items based on document type
    const lineItemsKey = this.getLineItemsKey(documentType);
    const lineItems = lineItemsKey ? (data[lineItemsKey] as Array<Record<string, unknown>> | undefined) : undefined;

    // Build header fields (exclude line items array)
    const headerFields: ExtractedField[] = [];
    this.flattenObject(data, "", headerFields, confidenceScores, lineItemsKey);

    return {
      success: true,
      pagesProcessed: 1, // LlamaExtract processes entire document
      headerFields,
      lineItems,
      extractedData: data,
    };
  }

  /**
   * Get the key for line items based on document type
   */
  private getLineItemsKey(documentType: DocumentType): string | null {
    const lineItemsKeys: Record<DocumentType, string | null> = {
      bank: "transactions",
      invoice: "line_items",
      po: "line_items",
      contract: "parties", // Contract has parties and signatures as arrays
    };
    return lineItemsKeys[documentType];
  }

  /**
   * Flatten nested object into key-value pairs for header fields
   */
  private flattenObject(
    obj: Record<string, unknown>,
    prefix: string,
    result: ExtractedField[],
    confidenceScores: Record<string, number>,
    skipKey: string | null
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      // Skip line items array
      if (key === skipKey) continue;
      // Skip signatures array for contracts
      if (key === "signatures") continue;

      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        // Skip arrays (handled separately as line items)
        continue;
      }

      if (typeof value === "object") {
        // Recursively flatten nested objects
        this.flattenObject(
          value as Record<string, unknown>,
          fullKey,
          result,
          confidenceScores,
          skipKey
        );
      } else {
        // Add primitive value as header field
        const confidence = confidenceScores[fullKey] ?? 0.95; // Default high confidence
        result.push({
          key: fullKey,
          value: String(value),
          confidence: this.normalizeConfidence(confidence),
        });
      }
    }
  }

  /**
   * Normalize confidence score to 0-1 range
   */
  private normalizeConfidence(score: number): number {
    // LlamaExtract confidence scores are already 0-1
    // But we apply a slight boost for better UX
    if (score >= 0.8) return 0.95 + (score - 0.8) * 0.25;
    if (score >= 0.5) return 0.85 + (score - 0.5) * 0.33;
    return 0.7 + score * 0.3;
  }

  /**
   * Get MIME type from file name
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      txt: "text/plain",
    };

    return mimeTypes[extension || ""] || "application/octet-stream";
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance factory
export function createLlamaExtractService(): LlamaExtractService {
  return new LlamaExtractService();
}


