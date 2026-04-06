import { relations } from "drizzle-orm";
import {
  date,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const saleStatus = pgEnum("sale_status", ["PENDING", "PAID", "CANCELLED"]);
export const invoiceType = pgEnum("invoice_type", ["A", "B"]);
export const purchaseStatus = pgEnum("purchase_status", ["PENDING", "PAID"]);
export const purchaseCategory = pgEnum("purchase_category", ["PROVEEDOR", "VARIOS"]);
export const checkType = pgEnum("check_type", ["EMITIDO", "RECIBIDO"]);
export const checkStatus = pgEnum("check_status", [
  "PENDIENTE",
  "DEPOSITADO",
  "COBRADO",
  "RECHAZADO",
]);

// ─── Tables ─────────────────────────────────────────────────────────────────

export const banks = pgTable("banks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cuit: text("cuit").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providers = pgTable("providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cuit: text("cuit"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  invoiceType: invoiceType("invoice_type").default("A").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  date: date("date").notNull(),
  oc: text("oc"),
  patient: text("patient"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: saleStatus("status").default("PENDING").notNull(),
  documentUrl: text("document_url"), // BASE64 foto de la factura
  creditNoteNumber: text("credit_note_number"),
  creditNoteUrl: text("credit_note_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: purchaseStatus("status").default("PENDING").notNull(),
  paymentMethod: text("payment_method"), // TRANSFERENCIA | CHEQUE | EFECTIVO
  remito: text("remito"),
  remitoUrl: text("remito_url"), // BASE64 foto del remito
  category: purchaseCategory("category").default("PROVEEDOR").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const checks = pgTable("checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: checkType("type").notNull(),
  number: text("number").notNull(),
  bank: text("bank").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  paymentDate: date("payment_date"), // Fecha de pago (EMITIDO) / cobro (RECIBIDO)
  status: checkStatus("status").default("PENDIENTE").notNull(),
  relatedEntity: text("related_entity"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const clientsRelations = relations(clients, ({ many }) => ({
  sales: many(sales),
  patients: many(patients),
}));

export const patientsRelations = relations(patients, ({ one }) => ({
  client: one(clients, {
    fields: [patients.clientId],
    references: [clients.id],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  client: one(clients, {
    fields: [sales.clientId],
    references: [clients.id],
  }),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

export type Bank = typeof banks.$inferSelect;
export type NewBank = typeof banks.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type Check = typeof checks.$inferSelect;
export type NewCheck = typeof checks.$inferInsert;
