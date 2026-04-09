import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

// Lazy — only connects when getDb() is actually called (not at import time).
// This prevents crashes when DATABASE_URL is not set (mock mode).
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    _db = drizzle(neon(requireEnv("DATABASE_URL")), { schema });
  }
  return _db;
}
