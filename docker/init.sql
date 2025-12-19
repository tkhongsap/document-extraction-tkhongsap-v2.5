-- DocEx Database Initialization Script
-- This script runs on first container creation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pgvector extension for vector similarity search (RAG)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create schema if needed (Drizzle will handle table creation)
-- This file is for any initial setup that needs to run before the app

-- ============================================================================
-- RESUMES TABLE (for structured resume data + vector embeddings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS resumes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  extraction_id VARCHAR,
  
  -- Resume fields (aligned with extraction schema)
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  location VARCHAR,
  current_role VARCHAR,
  years_experience INTEGER,
  skills TEXT[],
  education JSONB,
  experience JSONB,
  certifications TEXT[],
  languages TEXT[],
  languages_with_proficiency JSONB,
  summary TEXT,
  salary_expectation INTEGER,
  availability_date DATE,
  gender VARCHAR,
  nationality VARCHAR,
  birth_year INTEGER,
  has_car BOOLEAN,
  has_license BOOLEAN,
  willing_to_travel BOOLEAN,
  
  -- Vector embedding for semantic search (RAG)
  embedding vector(1536),
  embedding_model VARCHAR DEFAULT 'text-embedding-3-small',
  embedding_text TEXT,
  
  -- Metadata
  source_file_name VARCHAR,
  raw_extracted_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast similarity search (IVFFlat - good for 10k-1M vectors)
CREATE INDEX IF NOT EXISTS idx_resumes_embedding ON resumes 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

-- Index for skill search (GIN for array)
CREATE INDEX IF NOT EXISTS idx_resumes_skills ON resumes USING GIN(skills);

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE docex TO docex;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'DocEx database initialized successfully!';
END $$;
