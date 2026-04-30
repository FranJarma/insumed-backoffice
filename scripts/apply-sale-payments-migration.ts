import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL_PROD;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(databaseUrl);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS "sale_payments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "sale_id" uuid NOT NULL REFERENCES "sales"("id"),
      "amount" numeric(12, 2) NOT NULL,
      "payment_date" date NOT NULL,
      "payment_method" text,
      "reference" text,
      "notes" text,
      "receipt_url" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "deleted_at" timestamp
    )
  `;

  await sql`
    INSERT INTO "sale_payments" (
      "sale_id",
      "amount",
      "payment_date",
      "payment_method",
      "reference",
      "notes"
    )
    SELECT
      "id",
      "amount",
      "payment_date",
      NULL,
      NULL,
      'Pago migrado desde la venta'
    FROM "sales"
    WHERE
      "payment_date" IS NOT NULL
      AND "status" IN ('PAID', 'INVOICED_PAID')
      AND "deleted_at" IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "sale_payments"
        WHERE "sale_payments"."sale_id" = "sales"."id"
          AND "sale_payments"."deleted_at" IS NULL
      )
  `;

  console.log("sale_payments migration applied");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
