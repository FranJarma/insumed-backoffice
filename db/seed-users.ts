import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import { requireEnv } from "../lib/env";
import * as schema from "./schema";

const sql = neon(requireEnv("DATABASE_URL"));
const db = drizzle(sql, { schema });

async function seedUsers() {
  console.log("Creando usuario inicial...");

  const name = requireEnv("SEED_ADMIN_NAME");
  const username = requireEnv("SEED_ADMIN_USERNAME");
  const password = requireEnv("SEED_ADMIN_PASSWORD", { minLength: 12 });
  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .insert(schema.users)
    .values({
      name,
      username,
      passwordHash,
      role: "jefe",
    })
    .onConflictDoNothing();

  console.log(`Usuario creado o ya existente: ${username} (jefe)`);
}

seedUsers().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
