import { users, extractions, type User, type InsertUser, type Extraction, type InsertExtraction } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserUsage(userId: string, pagesUsed: number): Promise<void>;
  resetMonthlyUsage(userId: string): Promise<void>;

  // Extraction operations
  createExtraction(extraction: InsertExtraction): Promise<Extraction>;
  getExtractionsByUserId(userId: string, limit?: number): Promise<Extraction[]>;
  getExtraction(id: string): Promise<Extraction | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
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
