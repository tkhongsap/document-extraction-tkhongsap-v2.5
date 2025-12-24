CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"scopes" jsonb DEFAULT '["extract", "read"]'::jsonb NOT NULL,
	"rate_limit" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"api_key_id" varchar,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"document_type" varchar(50),
	"pages_processed" integer DEFAULT 0 NOT NULL,
	"status_code" integer NOT NULL,
	"response_time_ms" integer,
	"error_message" text,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"request_id" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_job_id" varchar NOT NULL,
	"document_id" varchar,
	"file_name" varchar(500) NOT NULL,
	"file_size" integer NOT NULL,
	"object_path" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"extraction_id" varchar,
	"extracted_data" jsonb,
	"pages_processed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"error_code" varchar(50),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"processing_started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"api_key_id" varchar,
	"name" varchar(255),
	"document_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_files" integer DEFAULT 0 NOT NULL,
	"completed_files" integer DEFAULT 0 NOT NULL,
	"failed_files" integer DEFAULT 0 NOT NULL,
	"total_pages" integer DEFAULT 0 NOT NULL,
	"processed_pages" integer DEFAULT 0 NOT NULL,
	"webhook_url" varchar(2048),
	"priority" integer DEFAULT 2 NOT NULL,
	"metadata" jsonb,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"object_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extractions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"document_id" varchar,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"document_type" text NOT NULL,
	"pages_processed" integer NOT NULL,
	"extracted_data" jsonb NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"batch_item_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subscription_id" varchar,
	"stripe_invoice_id" varchar,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"pages_included" integer NOT NULL,
	"pages_used" integer NOT NULL,
	"overage_pages" integer DEFAULT 0 NOT NULL,
	"overage_amount" integer DEFAULT 0 NOT NULL,
	"invoice_url" varchar,
	"invoice_pdf" varchar,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"extraction_id" varchar,
	"name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"location" varchar,
	"current_role" varchar,
	"years_experience" integer,
	"skills" text[],
	"education" jsonb,
	"experience" jsonb,
	"certifications" text[],
	"languages" text[],
	"languages_with_proficiency" jsonb,
	"summary" text,
	"salary_expectation" integer,
	"availability_date" date,
	"gender" varchar,
	"nationality" varchar,
	"birth_year" integer,
	"has_car" boolean,
	"has_license" boolean,
	"willing_to_travel" boolean,
	"embedding" vector(1536),
	"embedding_model" varchar DEFAULT 'text-embedding-3-small',
	"embedding_text" text,
	"source_file_name" varchar,
	"raw_extracted_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_type" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"pages_limit" integer,
	"pages_used" integer DEFAULT 0 NOT NULL,
	"overage_enabled" boolean DEFAULT false NOT NULL,
	"overage_rate" numeric(10, 4),
	"api_enabled" boolean DEFAULT false NOT NULL,
	"batch_enabled" boolean DEFAULT false NOT NULL,
	"max_api_keys" integer,
	"max_batch_files" integer,
	"max_webhooks" integer,
	"rate_limit" integer DEFAULT 10 NOT NULL,
	"billing_cycle_start" timestamp DEFAULT now(),
	"billing_cycle_end" timestamp,
	"stripe_subscription_id" varchar,
	"stripe_price_id" varchar,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "usage_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"month" varchar(7) NOT NULL,
	"pages_used" integer NOT NULL,
	"plan_type" text NOT NULL,
	"pages_limit" integer,
	"overage_pages" integer DEFAULT 0 NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password_hash" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"email_verified" boolean DEFAULT false,
	"plan_type" text DEFAULT 'free' NOT NULL,
	"language" varchar(2) DEFAULT 'en' NOT NULL,
	"monthly_usage" integer DEFAULT 0 NOT NULL,
	"monthly_limit" integer DEFAULT 100 NOT NULL,
	"tier" varchar DEFAULT 'free' NOT NULL,
	"stripe_customer_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_reset_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" varchar NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"status_code" integer,
	"response_body" text,
	"response_time_ms" integer,
	"success" boolean NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"url" varchar(2048) NOT NULL,
	"description" varchar(255),
	"events" jsonb DEFAULT '["extraction.completed", "batch.completed"]'::jsonb NOT NULL,
	"secret" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_batch_job_id_batch_jobs_id_fk" FOREIGN KEY ("batch_job_id") REFERENCES "public"."batch_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extractions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_extraction_id_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."extractions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_history" ADD CONSTRAINT "usage_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_apikey_user" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_apikey_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "IDX_apikey_prefix" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "IDX_apiusage_user" ON "api_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_apiusage_apikey" ON "api_usage_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "IDX_apiusage_created" ON "api_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_batchitem_job" ON "batch_items" USING btree ("batch_job_id");--> statement-breakpoint
CREATE INDEX "IDX_batchitem_status" ON "batch_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_batchjob_user" ON "batch_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_batchjob_status" ON "batch_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_batchjob_created" ON "batch_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_invoice_user" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_invoice_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_resume_user" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_resume_extraction" ON "resumes" USING btree ("extraction_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "IDX_subscription_user" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_subscription_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_webhooklog_webhook" ON "webhook_logs" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "IDX_webhooklog_created" ON "webhook_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_webhook_user" ON "webhooks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_webhook_active" ON "webhooks" USING btree ("is_active");