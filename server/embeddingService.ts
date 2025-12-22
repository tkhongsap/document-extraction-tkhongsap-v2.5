/**
 * Embedding Service
 * Supports both OpenAI API and local Ollama API for vector embeddings
 */

export type EmbeddingProvider = 'openai' | 'ollama';

export interface EmbeddingConfig {
  provider?: EmbeddingProvider;
  apiKey?: string;
  apiBase?: string;
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
  private provider: EmbeddingProvider;
  private apiKey: string;
  private model: string;
  private apiBase: string;

  /**
   * Initialize embedding service
   * @param config - Configuration with provider, API key/base, and model
   */
  constructor(config: EmbeddingConfig) {
    this.provider = config.provider || 'ollama';
    this.apiKey = config.apiKey || '';
    
    // Set defaults based on provider
    if (this.provider === 'ollama') {
      this.apiBase = config.apiBase || process.env.OLLAMA_API_URL || 'http://10.4.93.66:9020';
      this.model = config.model || process.env.OLLAMA_EMBEDDING_MODEL || 'bge-m3:latest';
    } else {
      this.apiBase = config.apiBase || 'https://api.openai.com/v1';
      this.model = config.model || 'text-embedding-3-small';
    }
  }

  /**
   * Create embedding for a single text
   * @param text - Text to embed
   * @returns Embedding vector and metadata
   */
  async createEmbedding(text: string): Promise<EmbeddingResult> {
    if (this.provider === 'openai' && !this.apiKey) {
      throw new Error(
        "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
      );
    }

    // Truncate text if too long
    const maxChars = 30000;
    const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

    if (this.provider === 'ollama') {
      return this.createOllamaEmbedding(truncatedText);
    } else {
      return this.createOpenAIEmbedding(truncatedText);
    }
  }

  /**
   * Create embedding using Ollama API
   */
  private async createOllamaEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.apiBase}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error || response.statusText;
      throw new Error(`Ollama API error: ${errorMessage}`);
    }

    const data = await response.json();
    // Ollama returns { embeddings: [[...]] } for single input
    const embedding = Array.isArray(data.embeddings?.[0]) 
      ? data.embeddings[0] 
      : data.embedding || [];
    
    return {
      embedding,
      model: data.model || this.model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        totalTokens: data.prompt_eval_count || 0,
      },
    };
  }

  /**
   * Create embedding using OpenAI API
   */
  private async createOpenAIEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.apiBase}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
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
   * @param batchSize - Number of texts per API call
   * @returns Array of embedding vectors
   */
  async createEmbeddingsBatch(
    texts: string[],
    batchSize = 100
  ): Promise<number[][]> {
    if (this.provider === 'openai' && !this.apiKey) {
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

      if (this.provider === 'ollama') {
        // Ollama: process one by one (doesn't support batch in /api/embed)
        for (const text of truncatedTexts) {
          const result = await this.createOllamaEmbedding(text);
          allEmbeddings.push(result.embedding);
        }
      } else {
      // OpenAI: batch request
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
    }

    return allEmbeddings;
  }

  /**
   * Get the embedding dimensions for the current model
   */
  getModelDimensions(): number {
    const dimensions: Record<string, number> = {
      // OpenAI models
      "text-embedding-3-small": 1536,
      "text-embedding-3-large": 3072,
      "text-embedding-ada-002": 1536,
      // Ollama models (BGE-M3)
      "bge-m3:latest": 1024,
      "bge-m3": 1024,
      "nomic-embed-text": 768,
      "mxbai-embed-large": 1024,
    };
    return dimensions[this.model] || 1024;
  }

  /**
   * Get the current model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get the current provider
   */
  getProvider(): EmbeddingProvider {
    return this.provider;
  }

  /**
   * Get the API base URL
   */
  getApiBase(): string {
    return this.apiBase;
  }
}

// Singleton instance
let embeddingService: EmbeddingService | null = null;

/**
 * Get or create embedding service instance
 * Defaults to Ollama with BGE-M3 model
 */
export function createEmbeddingService(
  config?: Partial<EmbeddingConfig>
): EmbeddingService {
  const provider = config?.provider || (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) || 'ollama';
  const model = config?.model || 
    (provider === 'ollama' 
      ? (process.env.OLLAMA_EMBEDDING_MODEL || 'bge-m3:latest')
      : (process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'));
  const apiBase = config?.apiBase || 
    (provider === 'ollama'
      ? (process.env.OLLAMA_API_URL || 'http://10.4.93.66:9020')
      : 'https://api.openai.com/v1');
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
  
  if (!embeddingService || embeddingService.getModel() !== model || embeddingService.getProvider() !== provider) {
    embeddingService = new EmbeddingService({ provider, apiKey, apiBase, model });
  }
  return embeddingService;
}
