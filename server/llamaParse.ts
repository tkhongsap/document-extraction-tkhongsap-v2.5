/**
 * LlamaParse Service
 * 
 * Integrates with LlamaCloud's LlamaParse API for document parsing.
 * Used exclusively for the "New Extraction" (general) feature.
 */

const LLAMA_PARSE_API_BASE = "https://api.cloud.llamaindex.ai/api/v1/parsing";

interface LlamaParseJobResponse {
  id: string;
  status: string;
}

interface LlamaParseStatusResponse {
  id: string;
  status: "PENDING" | "SUCCESS" | "ERROR" | "CANCELLED";
}

interface LlamaParseResultPage {
  page: number;
  text: string;
  md: string;
  images?: Array<{
    name: string;
    height: number;
    width: number;
  }>;
}

interface LlamaParseResult {
  markdown: string;
  text: string;
  pages: LlamaParseResultPage[];
  job_metadata: {
    job_pages: number;
    job_is_cache_hit: boolean;
  };
}

export interface ParsedDocument {
  markdown: string;
  text: string;
  pageCount: number;
  pages: Array<{
    pageNumber: number;
    markdown: string;
    text: string;
  }>;
}

export class LlamaParseError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "LlamaParseError";
  }
}

/**
 * LlamaParse service for document parsing
 */
export class LlamaParseService {
  private apiKey: string;
  private maxRetries: number;
  private pollIntervalMs: number;

  constructor() {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) {
      throw new LlamaParseError(
        "LLAMA_CLOUD_API_KEY environment variable is not set"
      );
    }
    this.apiKey = apiKey;
    this.maxRetries = 60; // Max 60 retries (5 minutes with 5s interval)
    this.pollIntervalMs = 5000; // Poll every 5 seconds
    
    // Log API key status (first 10 chars only for security)
    console.log(`[LlamaParse] API key configured: ${apiKey.substring(0, 10)}...`);
  }

  /**
   * Parse a document using LlamaParse
   * @param fileBuffer - The file buffer to parse
   * @param fileName - The name of the file
   * @returns Parsed document with markdown and metadata
   */
  async parseDocument(
    fileBuffer: Buffer,
    fileName: string
  ): Promise<ParsedDocument> {
    // Step 1: Upload the file and start the job
    const jobId = await this.uploadFile(fileBuffer, fileName);
    console.log(`[LlamaParse] Job started: ${jobId}`);

    // Step 2: Poll for completion
    await this.waitForCompletion(jobId);
    console.log(`[LlamaParse] Job completed: ${jobId}`);

    // Step 3: Get the results
    const result = await this.getResult(jobId);
    console.log(`[LlamaParse] Retrieved results for job: ${jobId}`);

    return this.formatResult(result);
  }

  /**
   * Upload a file to LlamaParse and start a parsing job
   */
  private async uploadFile(
    fileBuffer: Buffer,
    fileName: string
  ): Promise<string> {
    // Use Node.js built-in FormData (available in Node 18+)
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: this.getMimeType(fileName) });
    formData.append("file", blob, fileName);

    const response = await fetch(`${LLAMA_PARSE_API_BASE}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        // Don't set Content-Type - fetch will set it automatically with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LlamaParse] Upload failed: ${response.status} - ${errorText}`);
      console.error(`[LlamaParse] API Key prefix: ${this.apiKey.substring(0, 10)}...`);
      throw new LlamaParseError(
        `Failed to upload file to LlamaParse: ${errorText}`,
        response.status
      );
    }

    const data = (await response.json()) as LlamaParseJobResponse;
    return data.id;
  }

  /**
   * Poll for job completion
   */
  private async waitForCompletion(jobId: string): Promise<void> {
    for (let i = 0; i < this.maxRetries; i++) {
      const status = await this.getStatus(jobId);

      if (status === "SUCCESS") {
        return;
      }

      if (status === "ERROR" || status === "CANCELLED") {
        throw new LlamaParseError(`Job ${jobId} failed with status: ${status}`);
      }

      // Wait before next poll
      await this.sleep(this.pollIntervalMs);
    }

    throw new LlamaParseError(
      `Job ${jobId} timed out after ${this.maxRetries * this.pollIntervalMs / 1000} seconds`
    );
  }

  /**
   * Get the status of a parsing job
   */
  private async getStatus(
    jobId: string
  ): Promise<LlamaParseStatusResponse["status"]> {
    const response = await fetch(
      `${LLAMA_PARSE_API_BASE}/job/${jobId}`,
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
      throw new LlamaParseError(
        `Failed to get job status: ${errorText}`,
        response.status
      );
    }

    const data = (await response.json()) as LlamaParseStatusResponse;
    return data.status;
  }

  /**
   * Get the parsing result in markdown format
   */
  private async getResult(jobId: string): Promise<LlamaParseResult> {
    const response = await fetch(
      `${LLAMA_PARSE_API_BASE}/job/${jobId}/result/json`,
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
      throw new LlamaParseError(
        `Failed to get job result: ${errorText}`,
        response.status
      );
    }

    const data = await response.json();
    return data as LlamaParseResult;
  }

  /**
   * Format the LlamaParse result into our standard format
   */
  private formatResult(result: LlamaParseResult): ParsedDocument {
    const pages = result.pages?.map((page) => ({
      pageNumber: page.page,
      markdown: page.md || "",
      text: page.text || "",
    })) || [];

    return {
      markdown: result.markdown || pages.map(p => p.markdown).join("\n\n---\n\n"),
      text: result.text || pages.map(p => p.text).join("\n\n"),
      pageCount: result.job_metadata?.job_pages || pages.length,
      pages,
    };
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
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ppt: "application/vnd.ms-powerpoint",
      txt: "text/plain",
      html: "text/html",
      xml: "application/xml",
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
export function createLlamaParseService(): LlamaParseService {
  return new LlamaParseService();
}

