import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { readFileSync, existsSync } from "fs";

neonConfig.webSocketConstructor = ws;

function getDatabaseUrl(): string {
  const replitDbPath = "/tmp/replitdb";
  
  if (existsSync(replitDbPath)) {
    try {
      const dbUrl = readFileSync(replitDbPath, "utf-8").trim();
      if (dbUrl) {
        console.log("[db] Using production database from /tmp/replitdb");
        return dbUrl;
      }
    } catch (error) {
      console.warn("[db] Failed to read /tmp/replitdb, falling back to DATABASE_URL");
    }
  }
  
  if (process.env.DATABASE_URL) {
    console.log("[db] Using development database from DATABASE_URL");
    return process.env.DATABASE_URL;
  }
  
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = getDatabaseUrl();
export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
