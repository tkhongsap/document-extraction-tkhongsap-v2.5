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

interface LlamaParseLayoutElement {
  bbox: { x: number; y: number; w: number; h: number };
  image?: string;
  confidence: number; // 0-1 range
  label: "text" | "table" | "figure" | "title" | "list";
  isLikelyNoise: boolean;
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
  layout?: LlamaParseLayoutElement[];
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
    layout?: LlamaParseLayoutElement[];
    confidence?: number; // Average confidence for this page
  }>;
  overallConfidence?: number; // Average confidence across all pages
  confidenceStats?: {
    min: number;
    max: number;
    average: number;
  };
}

/**
 * Configuration for LlamaParse parsing options
 * Always uses agentic mode (parse_page_with_agent) for AI-powered parsing
 */
export interface LlamaParseConfig {
  parseMode: "parse_page_with_agent"; // Always use agentic mode for AI parsing
  model: string; // Required - agentic mode always requires a model
  highResOcr: boolean;
  adaptiveLongTable: boolean;
  outlinedTableExtraction: boolean;
  outputTablesAsHtml: boolean;
  parsingInstruction?: string; // Custom instruction to guide AI parsing
}

/**
 * Convert boolean to "true" or "false" string for form data
 */
function booleanToString(value: boolean): "true" | "false" {
  return value ? "true" : "false";
}

/**
 * Normalize raw confidence scores to user-friendly ranges.
 * 
 * Thresholds:
 * - Raw < 0.3 → Low (<70%)
 * - Raw 0.3-0.5 → Medium (70-89.99%)
 * - Raw >= 0.5 → High (90-100%)
 * 
 * This ensures most typical documents show "High quality" confidence.
 */
function normalizeConfidence(raw: number): number {
  if (raw < 0.3) {
    // Map 0-0.3 to 0.5-0.7 (Low quality)
    return 0.5 + (raw / 0.3) * 0.2;
  } else if (raw < 0.5) {
    // Map 0.3-0.5 to 0.7-0.9 (Medium quality)
    return 0.7 + ((raw - 0.3) / 0.2) * 0.2;
  } else {
    // Map 0.5-1.0 to 0.9-1.0 (High quality)
    return 0.9 + ((raw - 0.5) / 0.5) * 0.1;
  }
}

/**
 * Default parsing instruction to guide AI for well-formatted output
 */
const DEFAULT_PARSING_INSTRUCTION = `Format the document with proper structure and spacing:
- Use appropriate heading levels (# for main title, ## for sections, ### for subsections)
- Separate paragraphs with blank lines for readability
- Format tables with clear headers and aligned columns
- Use bullet points or numbered lists where appropriate
- Preserve the document's logical structure and hierarchy
- Add clear spacing between different sections
- For personal information like contact details, format as a clean list
- For tabular data, use markdown tables with proper headers`;

/**
 * Get default Agentic preset configuration
 */
function getDefaultAgenticConfig(): LlamaParseConfig {
  return {
    parseMode: "parse_page_with_agent",
    model: "openai-gpt-4-1-mini",
    highResOcr: true,
    adaptiveLongTable: true,
    outlinedTableExtraction: true,
    outputTablesAsHtml: true,
    parsingInstruction: DEFAULT_PARSING_INSTRUCTION,
  };
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
  private config: LlamaParseConfig;

  constructor(config?: LlamaParseConfig) {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) {
      throw new LlamaParseError(
        "LLAMA_CLOUD_API_KEY environment variable is not set"
      );
    }
    this.apiKey = apiKey;
    this.maxRetries = 60; // Max 60 retries (5 minutes with 5s interval)
    this.pollIntervalMs = 5000; // Poll every 5 seconds
    
    // Set configuration - use provided config or default to Agentic preset
    this.config = config || getDefaultAgenticConfig();
    
    // Validate configuration: model is always required for agentic mode
    if (!this.config.model) {
      throw new LlamaParseError(
        "Model is required for agentic parsing mode"
      );
    }
    
    // Log API key status (first 10 chars only for security)
    console.log(`[LlamaParse] API key configured: ${apiKey.substring(0, 10)}...`);
    console.log(`[LlamaParse] Using parse mode: ${this.config.parseMode}`);
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

    // Add parsing configuration parameters
    // Always use agentic mode for AI-powered parsing
    formData.append("parse_mode", this.config.parseMode);
    
    // Model is always required for agentic mode
    if (!this.config.model) {
      throw new LlamaParseError(
        "Model is required for agentic parsing mode"
      );
    }
    formData.append("model", this.config.model);
    
    // Convert boolean values to "true"/"false" strings as required by API
    formData.append("high_res_ocr", booleanToString(this.config.highResOcr));
    formData.append("adaptive_long_table", booleanToString(this.config.adaptiveLongTable));
    formData.append("outlined_table_extraction", booleanToString(this.config.outlinedTableExtraction));
    formData.append("output_tables_as_HTML", booleanToString(this.config.outputTablesAsHtml));
    
    // Enable layout extraction to get confidence scores
    formData.append("extract_layout", "true");
    
    // Add custom parsing instruction if provided
    if (this.config.parsingInstruction) {
      formData.append("parsing_instruction", this.config.parsingInstruction);
      console.log(`[LlamaParse] Using custom parsing instruction`);
    }

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
    // Debug logging: Check if layout data exists in the API response
    console.log(`[LlamaParse] formatResult - Total pages: ${result.pages?.length || 0}`);
    console.log(`[LlamaParse] formatResult - Job metadata:`, result.job_metadata);
    
    const pages = result.pages?.map((page, index) => {
      // Debug: Log layout data for each page
      const hasLayout = page.layout && page.layout.length > 0;
      console.log(`[LlamaParse] Page ${index + 1} - Has layout: ${hasLayout}, Layout elements: ${page.layout?.length || 0}`);
      
      if (hasLayout) {
        console.log(`[LlamaParse] Page ${index + 1} - Layout sample:`, JSON.stringify(page.layout?.slice(0, 2), null, 2));
      }

      // Calculate page-level confidence (average of all layout elements)
      let pageConfidence: number | undefined;
      if (page.layout && page.layout.length > 0) {
        const confidences = page.layout
          .filter(element => !element.isLikelyNoise) // Exclude noise
          .map(element => element.confidence);
        if (confidences.length > 0) {
          const rawConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
          pageConfidence = normalizeConfidence(rawConfidence);
          console.log(`[LlamaParse] Page ${index + 1} - Raw confidence: ${(rawConfidence * 100).toFixed(1)}% → Normalized: ${(pageConfidence * 100).toFixed(1)}%`);
        }
      }

      return {
        pageNumber: page.page,
        markdown: page.md || "",
        text: page.text || "",
        layout: page.layout,
        confidence: pageConfidence,
      };
    }) || [];

    // Calculate overall confidence metrics
    const pageConfidences = pages
      .map(p => p.confidence)
      .filter((conf): conf is number => conf !== undefined);

    let overallConfidence: number | undefined;
    let confidenceStats: { min: number; max: number; average: number } | undefined;

    if (pageConfidences.length > 0) {
      overallConfidence = pageConfidences.reduce((sum, conf) => sum + conf, 0) / pageConfidences.length;
      confidenceStats = {
        min: Math.min(...pageConfidences),
        max: Math.max(...pageConfidences),
        average: overallConfidence,
      };
      console.log(`[LlamaParse] Overall normalized confidence: ${(overallConfidence * 100).toFixed(1)}% (min: ${(confidenceStats.min * 100).toFixed(1)}%, max: ${(confidenceStats.max * 100).toFixed(1)}%)`);
    } else {
      console.log(`[LlamaParse] No confidence data available - layout extraction may not have returned data`);
    }

    return {
      markdown: result.markdown || pages.map(p => p.markdown).join("\n\n---\n\n"),
      text: result.text || pages.map(p => p.text).join("\n\n"),
      pageCount: result.job_metadata?.job_pages || pages.length,
      pages,
      overallConfidence,
      confidenceStats,
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

