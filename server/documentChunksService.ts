import { sql } from "drizzle-orm";
import { db } from "./db"; // adjust if project exports db differently
import { documentChunks } from "../shared/schema";
import type { InsertDocumentChunk } from "../shared/schema";

/**
 * Inserts a document chunk record and optionally returns it.
 */
export async function insertDocumentChunk(data: InsertDocumentChunk) {
  const result = await db.insert(documentChunks).values(data).returning();
  return result;
}

/**
 * Find top-N similar chunks by embedding vector using raw SQL with pgvector
 * embedding should be an array of numbers
 */
export async function findSimilarChunksByEmbedding(embedding: number[], limit = 5) {
  const embeddingStr = `[${embedding.join(",")}]`;
  const q = sql`SELECT *, 1 - (embedding <=> ${sql.raw(embeddingStr)}::vector) as similarity
    FROM document_chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${sql.raw(embeddingStr)}::vector
    LIMIT ${limit}`;

  const rows = await db.execute(q);
  return rows;
}