import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // 'line', 'google', 'facebook', 'apple'
  providerId: text("provider_id").notNull(),
  tier: text("tier").notNull().default('free'), // 'free' or 'pro'
  monthlyUsage: integer("monthly_usage").notNull().default(0),
  monthlyLimit: integer("monthly_limit").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastResetAt: timestamp("last_reset_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastResetAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Extractions table - stores extraction history
export const extractions = pgTable("extractions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  documentType: text("document_type").notNull(), // 'general', 'bank', 'invoice', 'po', 'contract'
  pagesProcessed: integer("pages_processed").notNull(),
  extractedData: jsonb("extracted_data").notNull(), // Stores the extracted fields
  status: text("status").notNull().default('completed'), // 'processing', 'completed', 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExtractionSchema = createInsertSchema(extractions).omit({
  id: true,
  createdAt: true,
});
export type InsertExtraction = z.infer<typeof insertExtractionSchema>;
export type Extraction = typeof extractions.$inferSelect;
