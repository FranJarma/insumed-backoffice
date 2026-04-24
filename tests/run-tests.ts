import assert from "node:assert/strict";
import { createCheckSchema } from "@/features/checks/types";
import { changePasswordSchema } from "@/features/auth/types";
import { createPurchaseSchema } from "@/features/purchases/types";
import { cancelSaleSchema, createSaleSchema, markSaleAsInvoicedSchema } from "@/features/sales/types";
import { buildRandomR2Key, isValidR2Key, isValidR2KeyForDirectory } from "@/lib/file-security";
import { hitRateLimit, resetRateLimitStoreForTests } from "@/lib/rate-limit";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

run("buildRandomR2Key creates valid directory-scoped keys", () => {
  const key = buildRandomR2Key({
    directory: "facturas",
    date: "2026-04-16",
    contentType: "application/pdf",
  });

  assert.equal(isValidR2Key(key), true);
  assert.equal(isValidR2KeyForDirectory(key, "facturas"), true);
  assert.equal(isValidR2KeyForDirectory(key, "remitos"), false);
});

run("sale schemas reject keys from the wrong directory", () => {
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

run("purchase and check schemas only accept their own upload prefixes", () => {
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

run("changePasswordSchema requires at least 12 characters", () => {
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

run("hitRateLimit blocks after max attempts inside the same window", () => {
  resetRateLimitStoreForTests();

  const first = hitRateLimit("login:test", { maxAttempts: 2, windowMs: 60_000 });
  const second = hitRateLimit("login:test", { maxAttempts: 2, windowMs: 60_000 });
  const third = hitRateLimit("login:test", { maxAttempts: 2, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});

run("hitRateLimit keeps counters isolated by key", () => {
  resetRateLimitStoreForTests();

  const firstKey = hitRateLimit("upload:user-a", { maxAttempts: 1, windowMs: 60_000 });
  const secondKey = hitRateLimit("upload:user-b", { maxAttempts: 1, windowMs: 60_000 });
  const firstKeyAgain = hitRateLimit("upload:user-a", { maxAttempts: 1, windowMs: 60_000 });

  assert.equal(firstKey.allowed, true);
  assert.equal(secondKey.allowed, true);
  assert.equal(firstKeyAgain.allowed, false);
});

console.log("All tests passed");
