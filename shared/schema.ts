import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, index, boolean, decimal, uniqueIndex, date, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// CUSTOM TYPES
// ============================================================================

// Custom type for pgvector - stores vector embeddings
const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    if (typeof value === 'string') {
      // Handle PostgreSQL vector format: [0.1,0.2,0.3]
      return JSON.parse(value);
    }
    return value as unknown as number[];
  },
});

// ============================================================================
// ENUMS
// ============================================================================

// Plan types for subscription tiers
export const planTypes = ["free", "pro", "enterprise"] as const;
export type PlanType = typeof planTypes[number];

// Subscription status
export const subscriptionStatuses = ["active", "past_due", "cancelled", "trialing"] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];

// Invoice status
export const invoiceStatuses = ["draft", "open", "paid", "void", "uncollectible"] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];

// Batch job status
export const batchJobStatuses = ["pending", "processing", "completed", "failed", "cancelled"] as const;
export type BatchJobStatus = typeof batchJobStatuses[number];

// Batch item status
export const batchItemStatuses = ["pending", "processing", "completed", "failed"] as const;
export type BatchItemStatus = typeof batchItemStatuses[number];

// Document types for extraction
export const documentTypes = ["bank", "invoice", "po", "contract", "resume", "general"] as const;
export type DocumentType = typeof documentTypes[number];

// ============================================================================
// CORE TABLES
// ============================================================================

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  emailVerified: boolean("email_verified").default(false),
  // Plan type stored here for quick access (synced with subscription)
  planType: text("plan_type").notNull().default('free'),
  language: varchar("language", { length: 2 }).notNull().default('en'),
  // Usage tracking
  monthlyUsage: integer("monthly_usage").notNull().default(0),
  monthlyLimit: integer("monthly_limit").notNull().default(100),
  tier: varchar("tier").notNull().default('free'),
  // Stripe integration
  stripeCustomerId: varchar("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastResetAt: timestamp("last_reset_at"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;

// Documents table - stores uploaded documents metadata
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  objectPath: text("object_path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Extractions table - stores extraction history
export const extractions = pgTable("extractions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentId: varchar("document_id").references(() => documents.id),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  documentType: text("document_type").notNull(),
  pagesProcessed: integer("pages_processed").notNull(),
  extractedData: jsonb("extracted_data").notNull(),
  status: text("status").notNull().default('completed'),
  // Link to batch item if part of batch processing
  batchItemId: varchar("batch_item_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExtractionSchema = createInsertSchema(extractions).omit({
  id: true,
  createdAt: true,
});
export type InsertExtraction = z.infer<typeof insertExtractionSchema>;
export type Extraction = typeof extractions.$inferSelect;

// Type for grouped extractions by document
export interface DocumentWithExtractions {
  fileName: string;
  fileSize: number;
  documentType: string;
  extractions: Extraction[];
  latestExtraction: Extraction;
  totalExtractions: number;
}

// ============================================================================
// RESUMES TABLE (Structured resume data + vector embeddings for RAG)
// ============================================================================

export const resumes = pgTable("resumes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  extractionId: varchar("extraction_id").references(() => extractions.id),
  
  // Resume fields (aligned with extraction schema)
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  location: varchar("location"),
  currentRole: varchar("current_role"),
  yearsExperience: integer("years_experience"),
  skills: text("skills").array(),
  education: jsonb("education"),
  experience: jsonb("experience"),
  certifications: text("certifications").array(),
  languages: text("languages").array(),
  languagesWithProficiency: jsonb("languages_with_proficiency"),
  summary: text("summary"),
  salaryExpectation: integer("salary_expectation"),
  availabilityDate: date("availability_date"),
  gender: varchar("gender"),
  nationality: varchar("nationality"),
  birthYear: integer("birth_year"),
  hasCar: boolean("has_car"),
  hasLicense: boolean("has_license"),
  willingToTravel: boolean("willing_to_travel"),
  
  // Vector embedding for semantic search (RAG)
  // OpenAI text-embedding-3-small: 1536 dimensions
  embedding: vector("embedding", { dimensions: 1536 }),
  embeddingModel: varchar("embedding_model").default('text-embedding-3-small'),
  embeddingText: text("embedding_text"),
  
  // Metadata
  sourceFileName: varchar("source_file_name"),
  rawExtractedData: jsonb("raw_extracted_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_resume_user").on(table.userId),
  index("IDX_resume_extraction").on(table.extractionId),
]);

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumes.$inferSelect;

// ============================================================================
// BILLING TABLES
// ============================================================================

// Subscriptions table - manages user plans and usage
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  
  // Plan details
  planType: text("plan_type").notNull().default('free'), // free, pro, enterprise
  status: text("status").notNull().default('active'), // active, past_due, cancelled, trialing
  
  // Usage limits (null = unlimited)
  pagesLimit: integer("pages_limit"), // Monthly page quota
  pagesUsed: integer("pages_used").notNull().default(0), // Pages used this cycle
  
  // Overage settings
  overageEnabled: boolean("overage_enabled").notNull().default(false),
  overageRate: decimal("overage_rate", { precision: 10, scale: 4 }), // Price per page overage
  
  // Feature flags (controlled by plan)
  apiEnabled: boolean("api_enabled").notNull().default(false),
  batchEnabled: boolean("batch_enabled").notNull().default(false),
  
  // Resource limits (null = unlimited)
  maxApiKeys: integer("max_api_keys"), // Max API keys allowed
  maxBatchFiles: integer("max_batch_files"), // Max files per batch
  maxWebhooks: integer("max_webhooks"), // Max webhooks allowed
  rateLimit: integer("rate_limit").notNull().default(10), // Requests per minute
  
  // Billing cycle
  billingCycleStart: timestamp("billing_cycle_start").defaultNow(),
  billingCycleEnd: timestamp("billing_cycle_end"),
  
  // Stripe integration
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_subscription_user").on(table.userId),
  index("IDX_subscription_status").on(table.status),
]);

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Invoices table - billing history
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  
  // Stripe integration
  stripeInvoiceId: varchar("stripe_invoice_id"),
  
  // Amount details (in cents)
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default('USD'),
  status: text("status").notNull().default('draft'), // draft, open, paid, void, uncollectible
  
  // Billing period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Usage breakdown
  pagesIncluded: integer("pages_included").notNull(),
  pagesUsed: integer("pages_used").notNull(),
  overagePages: integer("overage_pages").notNull().default(0),
  overageAmount: integer("overage_amount").notNull().default(0), // cents
  
  // Invoice URLs
  invoiceUrl: varchar("invoice_url"),
  invoicePdf: varchar("invoice_pdf"),
  
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_invoice_user").on(table.userId),
  index("IDX_invoice_status").on(table.status),
]);

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Usage history table - stores monthly usage snapshots (kept for backwards compatibility)
export const usageHistory = pgTable("usage_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  month: varchar("month", { length: 7 }).notNull(), // Format: "2025-01"
  pagesUsed: integer("pages_used").notNull(),
  planType: text("plan_type").notNull(),
  pagesLimit: integer("pages_limit"),
  overagePages: integer("overage_pages").notNull().default(0),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

// ============================================================================
// API KEYS TABLE
// ============================================================================

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Key identification
  name: varchar("name", { length: 255 }).notNull(),
  prefix: varchar("prefix", { length: 8 }).notNull(), // First 8 chars for identification (e.g., "dae_abc1")
  hashedKey: varchar("hashed_key", { length: 255 }).notNull().unique(), // SHA-256 hash of full key
  
  // Usage limits
  monthlyLimit: integer("monthly_limit").notNull().default(1000),
  monthlyUsage: integer("monthly_usage").notNull().default(0),
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  
  // Expiration (optional)
  expiresAt: timestamp("expires_at"),
  
  // Scopes/permissions
  scopes: text("scopes").notNull().default("extract,read"),
  
  // Timestamps
  lastUsedAt: timestamp("last_used_at"),
  lastResetAt: timestamp("last_reset_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_api_keys_hashed_key").on(table.hashedKey),
  index("idx_api_keys_user_id").on(table.userId),
  index("idx_api_keys_prefix").on(table.prefix),
  index("idx_api_keys_is_active").on(table.isActive),
]);

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// ============================================================================
// API USAGE LOGS TABLE
// ============================================================================

export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  
  // Request details
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull().default("POST"),
  
  // Response details
  statusCode: integer("status_code").notNull(),
  responseTimeMs: integer("response_time_ms"),
  
  // Usage tracking
  pagesProcessed: integer("pages_processed").default(0),
  
  // Request metadata
  requestMetadata: jsonb("request_metadata"),
  
  // Error tracking
  errorMessage: text("error_message"),
  
  // Client info
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  // Timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_api_usage_api_key_id").on(table.apiKeyId),
  index("idx_api_usage_created_at").on(table.createdAt),
  index("idx_api_usage_endpoint").on(table.endpoint),
  index("idx_api_usage_status_code").on(table.statusCode),
  index("idx_api_usage_key_date").on(table.apiKeyId, table.createdAt),
]);

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

// ============================================================================
// BATCH PROCESSING TABLES
// ============================================================================

// Batch Jobs table - manages batch processing jobs
export const batchJobs = pgTable("batch_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  apiKeyId: varchar("api_key_id").references(() => apiKeys.id), // If created via API
  
  // Job details
  name: varchar("name", { length: 255 }),
  documentType: text("document_type").notNull(), // bank, invoice, po, contract, general
  status: text("status").notNull().default('pending'), // pending, processing, completed, failed, cancelled
  
  // Progress tracking
  totalFiles: integer("total_files").notNull().default(0),
  completedFiles: integer("completed_files").notNull().default(0),
  failedFiles: integer("failed_files").notNull().default(0),
  totalPages: integer("total_pages").notNull().default(0),
  processedPages: integer("processed_pages").notNull().default(0),
  
  // Webhook notification
  webhookUrl: varchar("webhook_url", { length: 2048 }),
  
  // Processing options
  priority: integer("priority").notNull().default(2), // 1=low, 2=normal, 3=high
  metadata: jsonb("metadata"), // Custom metadata from user
  
  // Error handling
  errorMessage: text("error_message"),
  
  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_batchjob_user").on(table.userId),
  index("IDX_batchjob_status").on(table.status),
  index("IDX_batchjob_created").on(table.createdAt),
]);

export const insertBatchJobSchema = createInsertSchema(batchJobs).omit({
  id: true,
  createdAt: true,
});
export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type BatchJob = typeof batchJobs.$inferSelect;

// Batch Items table - individual files in a batch
export const batchItems = pgTable("batch_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchJobId: varchar("batch_job_id").notNull().references(() => batchJobs.id, { onDelete: "cascade" }),
  documentId: varchar("document_id").references(() => documents.id),
  
  // File info
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  objectPath: text("object_path"), // GCS path
  
  // Processing status
  status: text("status").notNull().default('pending'), // pending, processing, completed, failed
  extractionId: varchar("extraction_id").references(() => extractions.id),
  
  // Results
  extractedData: jsonb("extracted_data"),
  pagesProcessed: integer("pages_processed").notNull().default(0),
  
  // Error handling
  errorMessage: text("error_message"),
  errorCode: varchar("error_code", { length: 50 }),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  
  // Timestamps
  processingStartedAt: timestamp("processing_started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_batchitem_job").on(table.batchJobId),
  index("IDX_batchitem_status").on(table.status),
]);

export const insertBatchItemSchema = createInsertSchema(batchItems).omit({
  id: true,
  createdAt: true,
});
export type InsertBatchItem = z.infer<typeof insertBatchItemSchema>;
export type BatchItem = typeof batchItems.$inferSelect;

// ============================================================================
// WEBHOOK TABLES
// ============================================================================

// Webhooks table - user-configured webhook endpoints
export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Endpoint config
  url: varchar("url", { length: 2048 }).notNull(),
  description: varchar("description", { length: 255 }),
  
  // Events to subscribe to
  events: jsonb("events").notNull().default(sql`'["extraction.completed", "batch.completed"]'::jsonb`),
  
  // Security
  secret: varchar("secret", { length: 64 }).notNull(), // HMAC secret
  
  // Status
  isActive: boolean("is_active").notNull().default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  failureCount: integer("failure_count").notNull().default(0), // Consecutive failures
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_webhook_user").on(table.userId),
  index("IDX_webhook_active").on(table.isActive),
]);

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// Webhook Logs table - delivery history
export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  
  // Event details
  eventType: varchar("event_type", { length: 50 }).notNull(),
  payload: jsonb("payload").notNull(),
  
  // Delivery result
  statusCode: integer("status_code"),
  responseBody: text("response_body"), // Truncated response
  responseTimeMs: integer("response_time_ms"),
  success: boolean("success").notNull(),
  
  // Retry info
  attemptNumber: integer("attempt_number").notNull().default(1),
  nextRetryAt: timestamp("next_retry_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_webhooklog_webhook").on(table.webhookId),
  index("IDX_webhooklog_created").on(table.createdAt),
]);

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;

// ============================================================================
// PLAN CONFIGURATION (Constants)
// ============================================================================

export const PLAN_CONFIGS = {
  free: {
    planType: 'free' as PlanType,
    pagesLimit: 100,
    overageEnabled: false,
    overageRate: null,
    apiEnabled: false,
    batchEnabled: false,
    maxApiKeys: 0,
    maxBatchFiles: 0,
    maxWebhooks: 0,
    rateLimit: 10,
  },
  pro: {
    planType: 'pro' as PlanType,
    pagesLimit: 5000,
    overageEnabled: true,
    overageRate: '0.03',
    apiEnabled: true,
    batchEnabled: true,
    maxApiKeys: 5,
    maxBatchFiles: 50,
    maxWebhooks: 5,
    rateLimit: 100,
  },
  enterprise: {
    planType: 'enterprise' as PlanType,
    pagesLimit: null, // Unlimited
    overageEnabled: false,
    overageRate: null,
    apiEnabled: true,
    batchEnabled: true,
    maxApiKeys: null, // Unlimited
    maxBatchFiles: null, // Unlimited
    maxWebhooks: null, // Unlimited
    rateLimit: 1000,
  },
} as const;

// ============================================================================
// WEBHOOK EVENTS
// ============================================================================

export const WEBHOOK_EVENTS = [
  'extraction.completed',
  'extraction.failed',
  'batch.started',
  'batch.completed',
  'batch.failed',
  'batch.item.completed',
  'batch.item.failed',
  'subscription.updated',
  'usage.limit_approaching',
  'usage.limit_exceeded',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

// ============================================================================
// API KEY SCOPES
// ============================================================================

export const API_KEY_SCOPES = [
  'extract',    // Single file extraction
  'batch',      // Batch processing
  'read',       // Read results/history
  'webhook',    // Manage webhooks
] as const;

export type ApiKeyScope = typeof API_KEY_SCOPES[number];


// ============================================================================
// DOCUMENT CHUNKS (for RAG / chunking)
// ============================================================================

// Document chunks table - stores text chunks extracted from documents with embeddings
export const documentChunks = pgTable("document_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentId: varchar("document_id").references(() => documents.id),
  extractionId: varchar("extraction_id").references(() => extractions.id),

  // chunk metadata
  chunkIndex: integer("chunk_index").notNull().default(0),
  pageNumber: integer("page_number"),
  startOffset: integer("start_offset"),
  endOffset: integer("end_offset"),
  text: text("text").notNull(),

  // Vector embedding for semantic search
  embedding: vector("embedding", { dimensions: 1536 }),
  embeddingModel: varchar("embedding_model").default('text-embedding-3-small'),
  embeddingText: text("embedding_text"),

  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_docchunk_user").on(table.userId),
  index("IDX_docchunk_document").on(table.documentId),
]);

export const insertDocumentChunkSchema = createInsertSchema(documentChunks, {
  embedding: z.array(z.number()).nullable(),
}).omit({
  id: true,
  createdAt: true,
});
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
export type DocumentChunk = typeof documentChunks.$inferSelect;
