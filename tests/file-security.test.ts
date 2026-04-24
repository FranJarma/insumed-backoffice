import test from "node:test";
import assert from "node:assert/strict";
import { createCheckSchema } from "@/features/checks/types";
import { changePasswordSchema } from "@/features/auth/types";
import { createPurchaseSchema } from "@/features/purchases/types";
import { cancelSaleSchema, createSaleSchema, markSaleAsInvoicedSchema } from "@/features/sales/types";
import { buildRandomR2Key, isValidR2Key, isValidR2KeyForDirectory } from "@/lib/file-security";

test("buildRandomR2Key creates valid directory-scoped keys", () => {
  const key = buildRandomR2Key({
    directory: "facturas",
    date: "2026-04-16",
    contentType: "application/pdf",
  });

  assert.equal(isValidR2Key(key), true);
  assert.equal(isValidR2KeyForDirectory(key, "facturas"), true);
  assert.equal(isValidR2KeyForDirectory(key, "remitos"), false);
});

test("sale-related schemas reject keys from the wrong directory", () => {
  const wrongKey = "remitos/2026/04/123e4567-e89b-12d3-a456-426614174000.pdf";

  assert.equal(
    createSaleSchema.safeParse({
      clientId: "client-1",
      invoiceType: "A",
      date: "2026-04-16",
      amount: "10",
      documentUrl: wrongKey,
      isInvoiced: false,
    }).success,
    false
  );

  assert.equal(
    markSaleAsInvoicedSchema.safeParse({
      invoiceNumber: "0001",
      invoiceDate: "2026-04-16",
      documentUrl: wrongKey,
    }).success,
    false
  );

  assert.equal(
    cancelSaleSchema.safeParse({
      creditNoteNumber: "NC-1",
      cancellationDate: "2026-04-16",
      creditNoteUrl: wrongKey,
    }).success,
    false
  );
});

test("purchase and check schemas only accept their own upload prefixes", () => {
  const remitoKey = "remitos/2026/04/123e4567-e89b-12d3-a456-426614174000.pdf";
  const chequeKey = "cheques/2026/04/123e4567-e89b-12d3-a456-426614174000.jpg";

  assert.equal(
    createPurchaseSchema.safeParse({
      provider: "Proveedor SA",
      invoiceNumber: "FC-1",
      date: "2026-04-16",
      amount: "100",
      paymentMethod: "TRANSFERENCIA",
      remitoUrl: remitoKey,
      category: "PROVEEDOR",
    }).success,
    true
  );

  assert.equal(
    createPurchaseSchema.safeParse({
      provider: "Proveedor SA",
      invoiceNumber: "FC-1",
      date: "2026-04-16",
      amount: "100",
      paymentMethod: "TRANSFERENCIA",
      remitoUrl: chequeKey,
      category: "PROVEEDOR",
    }).success,
    false
  );

  assert.equal(
    createCheckSchema.safeParse({
      type: "RECIBIDO",
      kind: "COMUN",
      number: "1234",
      bank: "Banco",
      amount: "10",
      issueDate: "2026-04-16",
      photoUrl: chequeKey,
    }).success,
    true
  );

  assert.equal(
    createCheckSchema.safeParse({
      type: "RECIBIDO",
      kind: "COMUN",
      number: "1234",
      bank: "Banco",
      amount: "10",
      issueDate: "2026-04-16",
      photoUrl: remitoKey,
    }).success,
    false
  );
});

test("changePasswordSchema requires at least 12 characters", () => {
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "actual-123456",
      newPassword: "corta123",
      confirmPassword: "corta123",
    }).success,
    false
  );

  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "actual-123456",
      newPassword: "larga-y-segura-123",
      confirmPassword: "larga-y-segura-123",
    }).success,
    true
  );
});
