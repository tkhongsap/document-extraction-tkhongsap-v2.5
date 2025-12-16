-- DocEx Database Initialization Script
-- This script runs on first container creation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema if needed (Drizzle will handle table creation)
-- This file is for any initial setup that needs to run before the app

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE docex TO docex;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'DocEx database initialized successfully!';
END $$;
