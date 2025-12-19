/**
 * Resume Service
 * Handles CRUD operations and embedding generation for resumes
 */
import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "./db";
import { resumes, type Resume, type InsertResume } from "@shared/schema";
import { createEmbeddingService, type EmbeddingService } from "./embeddingService";

export interface ResumeData {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  currentRole?: string;
  yearsExperience?: number;
  skills?: string[];
  education?: Array<{
    degree?: string;
    field?: string;
    institution?: string;
    year?: number;
  }>;
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    isCurrent?: boolean;
  }>;
  certifications?: string[];
  languages?: string[];
  languagesWithProficiency?: Array<{
    language?: string;
    level?: string;
  }>;
  summary?: string;
  salaryExpectation?: number;
  availabilityDate?: string;
  gender?: string;
  nationality?: string;
  birthYear?: number;
  hasCar?: boolean;
  hasLicense?: boolean;
  willingToTravel?: boolean;
}

export interface SemanticSearchResult {
  id: string;
  userId: string;
  extractionId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  currentRole: string | null;
  yearsExperience: number | null;
  skills: string[] | null;
  summary: string | null;
  sourceFileName: string | null;
  createdAt: string | null;
  similarity: number;
}

export class ResumeService {
  private embeddingService: EmbeddingService;

  constructor(openaiApiKey?: string) {
    this.embeddingService = createEmbeddingService(openaiApiKey);
  }

  /**
   * Generate text for embedding from resume data
   */
  private generateEmbeddingText(data: ResumeData): string {
    const parts: string[] = [];

    if (data.name) parts.push(`Name: ${data.name}`);
    if (data.currentRole) parts.push(`Current Role: ${data.currentRole}`);
    if (data.location) parts.push(`Location: ${data.location}`);
    if (data.yearsExperience) parts.push(`Years of Experience: ${data.yearsExperience}`);
    if (data.summary) parts.push(`Summary: ${data.summary}`);
    if (data.skills?.length) parts.push(`Skills: ${data.skills.join(", ")}`);
    if (data.certifications?.length) parts.push(`Certifications: ${data.certifications.join(", ")}`);
    if (data.languages?.length) parts.push(`Languages: ${data.languages.join(", ")}`);

    if (data.education?.length) {
      const eduTexts = data.education.map(
        (edu) => `${edu.degree || ""} in ${edu.field || ""} from ${edu.institution || ""}`
      );
      parts.push(`Education: ${eduTexts.join("; ")}`);
    }

    if (data.experience?.length) {
      const expTexts = data.experience.map(
        (exp) => `${exp.title || ""} at ${exp.company || ""}: ${exp.description || ""}`
      );
      parts.push(`Experience: ${expTexts.join("; ")}`);
    }

    return parts.join("\n");
  }

  /**
   * Create a resume from extraction data
   */
  async createFromExtraction(
    userId: string,
    extractionId: string,
    extractedData: ResumeData,
    sourceFileName: string,
    generateEmbedding = true
  ): Promise<Resume> {
    // Generate embedding text
    const embeddingText = this.generateEmbeddingText(extractedData);

    // Generate embedding if enabled
    let embedding: number[] | null = null;
    let embeddingModel = "text-embedding-3-small";

    if (generateEmbedding) {
      try {
        const result = await this.embeddingService.createEmbedding(embeddingText);
        embedding = result.embedding;
        embeddingModel = result.model;
      } catch (error) {
        console.error("[ResumeService] Warning: Failed to generate embedding:", error);
        // Continue without embedding
      }
    }

    // Parse availability date
    let availabilityDate: string | null = null;
    if (extractedData.availabilityDate) {
      try {
        availabilityDate = extractedData.availabilityDate;
      } catch {
        // Invalid date format
      }
    }

    // Insert resume
    const [resume] = await db
      .insert(resumes)
      .values({
        userId,
        extractionId,
        name: extractedData.name,
        email: extractedData.email,
        phone: extractedData.phone,
        location: extractedData.location,
        currentRole: extractedData.currentRole,
        yearsExperience: extractedData.yearsExperience,
        skills: extractedData.skills,
        education: extractedData.education,
        experience: extractedData.experience,
        certifications: extractedData.certifications,
        languages: extractedData.languages,
        languagesWithProficiency: extractedData.languagesWithProficiency,
        summary: extractedData.summary,
        salaryExpectation: extractedData.salaryExpectation,
        availabilityDate,
        gender: extractedData.gender,
        nationality: extractedData.nationality,
        birthYear: extractedData.birthYear,
        hasCar: extractedData.hasCar,
        hasLicense: extractedData.hasLicense,
        willingToTravel: extractedData.willingToTravel,
        embedding,
        embeddingModel,
        embeddingText,
        sourceFileName,
        rawExtractedData: extractedData,
      } as InsertResume)
      .returning();

    return resume;
  }

  /**
   * Get resume by ID
   */
  async getById(resumeId: string): Promise<Resume | null> {
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId))
      .limit(1);

    return resume || null;
  }

  /**
   * Get all resumes for a user
   */
  async getByUser(userId: string, limit = 50, offset = 0): Promise<Resume[]> {
    return db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Semantic search for resumes using vector similarity
   */
  async searchSemantic(
    query: string,
    userId?: string,
    limit = 10,
    threshold = 0.5
  ): Promise<SemanticSearchResult[]> {
    // Generate embedding for query
    const queryResult = await this.embeddingService.createEmbedding(query);
    const queryEmbedding = queryResult.embedding;
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Build SQL query with cosine similarity
    // pgvector uses <=> for cosine distance (1 - similarity)
    let sqlQuery;

    if (userId) {
      sqlQuery = sql`
        SELECT 
          id, user_id as "userId", extraction_id as "extractionId", 
          name, email, phone, location,
          current_role as "currentRole", years_experience as "yearsExperience", 
          skills, summary, source_file_name as "sourceFileName", created_at as "createdAt",
          1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM resumes
        WHERE embedding IS NOT NULL
        AND user_id = ${userId}
        AND 1 - (embedding <=> ${embeddingStr}::vector) >= ${threshold}
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}
      `;
    } else {
      sqlQuery = sql`
        SELECT 
          id, user_id as "userId", extraction_id as "extractionId", 
          name, email, phone, location,
          current_role as "currentRole", years_experience as "yearsExperience", 
          skills, summary, source_file_name as "sourceFileName", created_at as "createdAt",
          1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM resumes
        WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> ${embeddingStr}::vector) >= ${threshold}
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}
      `;
    }

    const results = await db.execute(sqlQuery);

    return results.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.userId as string,
      extractionId: row.extractionId as string | null,
      name: row.name as string,
      email: row.email as string | null,
      phone: row.phone as string | null,
      location: row.location as string | null,
      currentRole: row.currentRole as string | null,
      yearsExperience: row.yearsExperience as number | null,
      skills: row.skills as string[] | null,
      summary: row.summary as string | null,
      sourceFileName: row.sourceFileName as string | null,
      createdAt: row.createdAt ? String(row.createdAt) : null,
      similarity: Math.round((row.similarity as number) * 10000) / 10000,
    }));
  }

  /**
   * Delete a resume
   */
  async delete(resumeId: string): Promise<boolean> {
    const result = await db
      .delete(resumes)
      .where(eq(resumes.id, resumeId));

    return true;
  }

  /**
   * Regenerate embedding for an existing resume
   */
  async regenerateEmbedding(resumeId: string): Promise<Resume | null> {
    const resume = await this.getById(resumeId);
    if (!resume) return null;

    // Generate new embedding text from resume data
    const embeddingText = this.generateEmbeddingText({
      name: resume.name,
      email: resume.email || undefined,
      phone: resume.phone || undefined,
      location: resume.location || undefined,
      currentRole: resume.currentRole || undefined,
      yearsExperience: resume.yearsExperience || undefined,
      skills: resume.skills || undefined,
      education: resume.education as ResumeData["education"],
      experience: resume.experience as ResumeData["experience"],
      certifications: resume.certifications || undefined,
      languages: resume.languages || undefined,
      languagesWithProficiency: resume.languagesWithProficiency as ResumeData["languagesWithProficiency"],
      summary: resume.summary || undefined,
    });

    try {
      const result = await this.embeddingService.createEmbedding(embeddingText);

      const [updated] = await db
        .update(resumes)
        .set({
          embedding: result.embedding,
          embeddingModel: result.model,
          embeddingText,
          updatedAt: new Date(),
        })
        .where(eq(resumes.id, resumeId))
        .returning();

      return updated;
    } catch (error) {
      console.error("[ResumeService] Error regenerating embedding:", error);
      return null;
    }
  }

  /**
   * Count resumes for a user
   */
  async countByUser(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(resumes)
      .where(eq(resumes.userId, userId));

    return result?.count || 0;
  }
}

// Factory function
export function createResumeService(openaiApiKey?: string): ResumeService {
  return new ResumeService(openaiApiKey);
}
