import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(schema.sales);
  await db.delete(schema.purchases);
  await db.delete(schema.clients);

  // ─── Clients ──────────────────────────────────────────────────────────────
  const insertedClients = await db
    .insert(schema.clients)
    .values([
      { name: "OSDE", cuit: "30-54563559-6" },
      { name: "Swiss Medical Group", cuit: "30-67726579-3" },
      { name: "Galeno Argentina", cuit: "30-68539351-5" },
      { name: "Medicus", cuit: "30-52081635-8" },
      { name: "OMINT", cuit: "30-52022338-4" },
    ])
    .returning();

  const [osde, swiss, galeno, medicus, omint] = insertedClients;

  console.log(`✅ Inserted ${insertedClients.length} clients`);

  // ─── Sales ────────────────────────────────────────────────────────────────
  const today = new Date();
  const thisMonth = (d: number) => {
    const date = new Date(today.getFullYear(), today.getMonth(), d);
    return date.toISOString().split("T")[0];
  };
  const lastMonth = (d: number) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 1, d);
    return date.toISOString().split("T")[0];
  };

  await db.insert(schema.sales).values([
    // This month – PENDING
    {
      clientId: osde.id,
      invoiceNumber: "FC-A-00001",
      date: thisMonth(3),
      oc: "OC-2025-001",
      patient: "García, Juan Carlos",
      amount: "185000.00",
      status: "PENDING",
    },
    {
      clientId: swiss.id,
      invoiceNumber: "FC-A-00002",
      date: thisMonth(5),
      oc: "OC-2025-002",
      patient: "López, María Elena",
      amount: "97500.00",
      status: "PENDING",
    },
    {
      clientId: galeno.id,
      invoiceNumber: "FC-A-00003",
      date: thisMonth(7),
      oc: "OC-2025-003",
      patient: "Rodríguez, Carlos",
      amount: "230000.00",
      status: "PENDING",
    },
    {
      clientId: medicus.id,
      invoiceNumber: "FC-A-00004",
      date: thisMonth(10),
      oc: "OC-2025-004",
      patient: "Fernández, Ana",
      amount: "75000.00",
      status: "PENDING",
    },
    // This month – PAID
    {
      clientId: osde.id,
      invoiceNumber: "FC-A-00005",
      date: thisMonth(2),
      oc: "OC-2025-005",
      patient: "Martínez, Pedro",
      amount: "312000.00",
      status: "PAID",
    },
    {
      clientId: omint.id,
      invoiceNumber: "FC-A-00006",
      date: thisMonth(8),
      oc: "OC-2025-006",
      patient: "González, Laura",
      amount: "145000.00",
      status: "PAID",
    },
    // This month – CANCELLED (should NOT appear in totals)
    {
      clientId: swiss.id,
      invoiceNumber: "FC-A-00007",
      date: thisMonth(1),
      oc: "OC-2025-007",
      patient: "Díaz, Roberto",
      amount: "88000.00",
      status: "CANCELLED",
      creditNoteNumber: "NC-A-00001",
      creditNoteUrl: "https://example.com/nc-00001.pdf",
    },
    // Last month – PENDING (counts toward total receivable, not monthly sales)
    {
      clientId: galeno.id,
      invoiceNumber: "FC-A-00008",
      date: lastMonth(15),
      oc: "OC-2025-008",
      patient: "Sánchez, Carlos",
      amount: "420000.00",
      status: "PENDING",
    },
    {
      clientId: osde.id,
      invoiceNumber: "FC-A-00009",
      date: lastMonth(20),
      oc: "OC-2025-009",
      patient: "Torres, Marta",
      amount: "190000.00",
      status: "PENDING",
    },
  ]);

  console.log("✅ Inserted sales");

  // ─── Purchases ────────────────────────────────────────────────────────────
  await db.insert(schema.purchases).values([
    {
      provider: "Distribuidora Médica SA",
      invoiceNumber: "FC-B-10001",
      date: thisMonth(4),
      amount: "95000.00",
      status: "PENDING",
    },
    {
      provider: "Insumos del Sur SRL",
      invoiceNumber: "FC-B-10002",
      date: thisMonth(6),
      amount: "178000.00",
      status: "PENDING",
    },
    {
      provider: "MedSupply Argentina",
      invoiceNumber: "FC-B-10003",
      date: thisMonth(9),
      amount: "63000.00",
      status: "PAID",
    },
    {
      provider: "Distribuidora Médica SA",
      invoiceNumber: "FC-B-10004",
      date: lastMonth(18),
      amount: "210000.00",
      status: "PAID",
    },
    {
      provider: "Laboratorios Norte SA",
      invoiceNumber: "FC-B-10005",
      date: lastMonth(25),
      amount: "88000.00",
      status: "PAID",
    },
  ]);

  console.log("✅ Inserted purchases");
  console.log("🎉 Seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
