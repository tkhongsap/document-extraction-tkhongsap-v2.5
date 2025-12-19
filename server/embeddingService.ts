/**
 * Embedding Service
 * Uses OpenAI API to generate vector embeddings for semantic search
 */

export interface EmbeddingConfig {
  apiKey: string;
  model?: string;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export class EmbeddingService {
  private apiKey: string;
  private model: string;
  private apiBase = "https://api.openai.com/v1";

  /**
   * Initialize embedding service
   * @param config - Configuration with API key and optional model
   */
  constructor(config: EmbeddingConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "text-embedding-3-small";
  }

  /**
   * Create embedding for a single text
   * @param text - Text to embed (max ~8191 tokens for text-embedding-3-small)
   * @returns Embedding vector and metadata
   */
  async createEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
      );
    }

    // Truncate text if too long (rough estimate: 4 chars per token)
    const maxChars = 30000; // ~7500 tokens, leaving some buffer
    const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

    const response = await fetch(`${this.apiBase}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: truncatedText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || response.statusText;
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    return {
      embedding: data.data[0].embedding,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Create embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @param batchSize - Number of texts per API call (max 2048)
   * @returns Array of embedding vectors
   */
  async createEmbeddingsBatch(
    texts: string[],
    batchSize = 100
  ): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
      );
    }

    const allEmbeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batchTexts = texts.slice(i, i + batchSize);

      // Truncate each text
      const maxChars = 30000;
      const truncatedTexts = batchTexts.map((t) =>
        t.length > maxChars ? t.slice(0, maxChars) : t
      );

      const response = await fetch(`${this.apiBase}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          input: truncatedTexts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || response.statusText;
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }

      const data = await response.json();
      // Sort by index to maintain order
      const sortedData = [...data.data].sort(
        (a: { index: number }, b: { index: number }) => a.index - b.index
      );
      const batchEmbeddings = sortedData.map(
        (item: { embedding: number[] }) => item.embedding
      );
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  /**
   * Get the embedding dimensions for the current model
   */
  getModelDimensions(): number {
    const dimensions: Record<string, number> = {
      "text-embedding-3-small": 1536,
      "text-embedding-3-large": 3072,
      "text-embedding-ada-002": 1536,
    };
    return dimensions[this.model] || 1536;
  }

  /**
   * Get the current model name
   */
  getModel(): string {
    return this.model;
  }
}

// Singleton instance
let embeddingService: EmbeddingService | null = null;

/**
 * Get or create embedding service instance
 */
export function createEmbeddingService(
  apiKey?: string,
  model = "text-embedding-3-small"
): EmbeddingService {
  const key = apiKey || process.env.OPENAI_API_KEY || "";
  if (!embeddingService || embeddingService.getModel() !== model) {
    embeddingService = new EmbeddingService({ apiKey: key, model });
  }
  return embeddingService;
}
