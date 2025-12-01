import { 
  users, 
  documents,
  extractions,
  usageHistory,
  type User, 
  type UpsertUser,
  type Document,
  type InsertDocument,
  type Extraction, 
  type InsertExtraction,
  type DocumentWithExtractions
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserUsage(userId: string, pagesUsed: number): Promise<void>;
  resetMonthlyUsage(userId: string): Promise<void>;
  checkAndResetIfNeeded(userId: string): Promise<User>;
  saveUsageHistory(userId: string, month: string, pagesUsed: number, tier: string, monthlyLimit: number): Promise<void>;

  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByUserId(userId: string, limit?: number): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;

  // Extraction operations
  createExtraction(extraction: InsertExtraction): Promise<Extraction>;
  getExtractionsByUserId(userId: string, limit?: number): Promise<Extraction[]>;
  getExtraction(id: string): Promise<Extraction | undefined>;
  getExtractionsGroupedByDocument(userId: string, limit?: number): Promise<DocumentWithExtractions[]>;
  
  // User preferences
  updateUserLanguage(userId: string, language: string): Promise<void>;
}

/**
 * Helper function to check if monthly usage should be reset
 * Compares lastResetAt to current month/year using UTC for timezone safety
 */
function shouldResetUsage(lastResetAt: Date | null): boolean {
  if (!lastResetAt) return true;

  const now = new Date();
  const lastReset = new Date(lastResetAt);

  // Check if lastResetAt is in a previous calendar month (UTC)
  return (
    lastReset.getUTCFullYear() < now.getUTCFullYear() ||
    (lastReset.getUTCFullYear() === now.getUTCFullYear() &&
      lastReset.getUTCMonth() < now.getUTCMonth())
  );
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserUsage(userId: string, pagesUsed: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    await db
      .update(users)
      .set({ monthlyUsage: user.monthlyUsage + pagesUsed })
      .where(eq(users.id, userId));
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        monthlyUsage: 0,
        lastResetAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async saveUsageHistory(userId: string, month: string, pagesUsed: number, tier: string, monthlyLimit: number): Promise<void> {
    await db.insert(usageHistory).values({
      userId,
      month,
      pagesUsed,
      tier,
      monthlyLimit,
    });
  }

  async checkAndResetIfNeeded(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    if (shouldResetUsage(user.lastResetAt)) {
      // Save current usage to history before resetting
      if (user.lastResetAt && user.monthlyUsage > 0) {
        const lastReset = new Date(user.lastResetAt);
        const month = `${lastReset.getUTCFullYear()}-${String(lastReset.getUTCMonth() + 1).padStart(2, '0')}`;
        await this.saveUsageHistory(userId, month, user.monthlyUsage, user.tier, user.monthlyLimit);
      }

      // Reset usage
      await this.resetMonthlyUsage(userId);
      return await this.getUser(userId) as User;
    }

    return user;
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  async getDocumentsByUserId(userId: string, limit: number = 50): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt))
      .limit(limit);
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return document || undefined;
  }

  // Extraction operations
  async createExtraction(extraction: InsertExtraction): Promise<Extraction> {
    const [created] = await db.insert(extractions).values(extraction).returning();
    return created;
  }

  async getExtractionsByUserId(userId: string, limit: number = 50): Promise<Extraction[]> {
    return await db
      .select()
      .from(extractions)
      .where(eq(extractions.userId, userId))
      .orderBy(desc(extractions.createdAt))
      .limit(limit);
  }

  async getExtraction(id: string): Promise<Extraction | undefined> {
    const [extraction] = await db
      .select()
      .from(extractions)
      .where(eq(extractions.id, id));
    return extraction || undefined;
  }

  async getExtractionsGroupedByDocument(userId: string, limit: number = 20): Promise<DocumentWithExtractions[]> {
    // Get all extractions for the user
    const allExtractions = await db
      .select()
      .from(extractions)
      .where(eq(extractions.userId, userId))
      .orderBy(desc(extractions.createdAt));

    // Group by fileName (since multiple extractions can be from the same file)
    const groupedMap = new Map<string, Extraction[]>();
    
    for (const extraction of allExtractions) {
      const key = extraction.fileName;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(extraction);
    }

    // Convert to DocumentWithExtractions format
    const result: DocumentWithExtractions[] = [];
    for (const [fileName, extractionList] of Array.from(groupedMap.entries())) {
      // Sort by createdAt descending to get latest first
      const sorted = extractionList.sort((a: Extraction, b: Extraction) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      const latestExtraction = sorted[0];
      
      result.push({
        fileName,
        fileSize: latestExtraction.fileSize,
        documentType: latestExtraction.documentType,
        extractions: sorted,
        latestExtraction,
        totalExtractions: sorted.length,
      });
    }

    // Sort by latest extraction date descending
    const sorted = result.sort((a, b) => 
      new Date(b.latestExtraction.createdAt).getTime() - 
      new Date(a.latestExtraction.createdAt).getTime()
    );

    // Apply limit
    return sorted.slice(0, limit);
  }

  async updateUserLanguage(userId: string, language: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        language,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
