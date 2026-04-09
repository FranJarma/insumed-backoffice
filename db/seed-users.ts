import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedUsers() {
  console.log("👤 Creando usuarios...");

  const passwordHash = await bcrypt.hash("flor123", 12);

  await db
    .insert(schema.users)
    .values({
      name: "Florencia Bollinger",
      username: "florencia",
      passwordHash,
      role: "jefe",
    })
    .onConflictDoNothing();

  console.log("✅ Usuario creado: florencia (jefe)");
  console.log("🎉 Listo!");
}

seedUsers().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
