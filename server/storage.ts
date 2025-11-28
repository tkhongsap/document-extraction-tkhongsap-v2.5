import { 
  users, 
  documents,
  extractions, 
  type User, 
  type UpsertUser,
  type Document,
  type InsertDocument,
  type Extraction, 
  type InsertExtraction 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserUsage(userId: string, pagesUsed: number): Promise<void>;
  resetMonthlyUsage(userId: string): Promise<void>;

  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByUserId(userId: string, limit?: number): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;

  // Extraction operations
  createExtraction(extraction: InsertExtraction): Promise<Extraction>;
  getExtractionsByUserId(userId: string, limit?: number): Promise<Extraction[]>;
  getExtraction(id: string): Promise<Extraction | undefined>;
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
}

export const storage = new DatabaseStorage();
