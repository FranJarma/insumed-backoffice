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
export const checkKind = pgEnum("check_kind", ["COMUN", "DIFERIDO"]);
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
  deletedAt: timestamp("deleted_at"),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cuit: text("cuit").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const providers = pgTable("providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cuit: text("cuit"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
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
  documentUrl: text("document_url"),
  creditNoteNumber: text("credit_note_number"),
  creditNoteUrl: text("credit_note_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: purchaseStatus("status").default("PENDING").notNull(),
  paymentMethod: text("payment_method"),
  remito: text("remito"),
  remitoUrl: text("remito_url"),
  category: purchaseCategory("category").default("PROVEEDOR").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const supplies = pgTable("supplies", {
  id: uuid("id").primaryKey().defaultRandom(),
  pm: text("pm").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  unitMeasure: text("unit_measure").notNull(),
  expiryDate: date("expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const saleItems = pgTable("sale_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  saleId: uuid("sale_id").references(() => sales.id).notNull(),
  supplyId: uuid("supply_id").references(() => supplies.id),
  pm: text("pm").notNull(),
  supplyName: text("supply_name").notNull(),
  unitMeasure: text("unit_measure").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const checks = pgTable("checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: checkType("type").notNull(),
  kind: checkKind("kind").default("COMUN").notNull(),
  number: text("number").notNull(),
  operationNumber: text("operation_number"),
  bank: text("bank").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  estimatedPaymentDate: date("estimated_payment_date"),
  paymentDate: date("payment_date"),
  status: checkStatus("status").default("PENDIENTE").notNull(),
  relatedEntity: text("related_entity"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
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

export const salesRelations = relations(sales, ({ one, many }) => ({
  client: one(clients, {
    fields: [sales.clientId],
    references: [clients.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  supply: one(supplies, { fields: [saleItems.supplyId], references: [supplies.id] }),
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
export type Supply = typeof supplies.$inferSelect;
export type NewSupply = typeof supplies.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
