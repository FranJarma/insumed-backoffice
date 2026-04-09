"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { mockGetChecks, mockCreateCheck, mockUpdateCheckStatus, mockUpdateCheck, mockSoftDeleteCheck } from "@/db/mock-store";
import { getDb } from "@/db";
import { checks } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import { createCheckSchema, type CheckStatus } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getChecks() {
  await requirePermission("checks:read");
  if (USE_MOCK) return mockGetChecks();
  return getDb().select().from(checks).where(isNull(checks.deletedAt)).orderBy(checks.dueDate);
}

export async function createCheck(input: unknown) {
  const parsed = createCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("checks:create");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockCreateCheck(parsed.data);
  } else {
    await getDb().insert(checks).values({
      type: parsed.data.type,
      kind: parsed.data.kind,
      number: parsed.data.number,
      operationNumber: parsed.data.operationNumber || null,
      bank: parsed.data.bank,
      amount: parsed.data.amount,
      issueDate: parsed.data.issueDate,
      dueDate: parsed.data.dueDate,
      estimatedPaymentDate: parsed.data.estimatedPaymentDate || null,
      relatedEntity: parsed.data.relatedEntity || null,
      notes: parsed.data.notes || null,
      photoUrl: parsed.data.photoUrl || null,
    });
  }

  revalidatePath("/checks");
  return { success: true };
}

export async function updateCheck(id: string, input: unknown) {
  const parsed = createCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("checks:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockUpdateCheck(id, parsed.data);
  } else {
    await getDb().update(checks).set({
      type: parsed.data.type,
      kind: parsed.data.kind,
      number: parsed.data.number,
      operationNumber: parsed.data.operationNumber || null,
      bank: parsed.data.bank,
      amount: parsed.data.amount,
      issueDate: parsed.data.issueDate,
      dueDate: parsed.data.dueDate,
      estimatedPaymentDate: parsed.data.estimatedPaymentDate || null,
      relatedEntity: parsed.data.relatedEntity || null,
      notes: parsed.data.notes || null,
    }).where(eq(checks.id, id));
  }

  revalidatePath("/checks");
  return { success: true };
}

export async function deleteCheck(id: string) {
  const auth = await authorizeAction("checks:delete");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockSoftDeleteCheck(id);
  } else {
    await getDb().update(checks).set({ deletedAt: new Date() }).where(eq(checks.id, id));
  }

  revalidatePath("/checks");
  return { success: true };
}

export async function updateCheckStatus(id: string, status: CheckStatus) {
  const auth = await authorizeAction("checks:update");
  if ("error" in auth) return auth;

  const today = new Date().toISOString().split("T")[0];

  if (USE_MOCK) {
    mockUpdateCheckStatus(id, status);
  } else {
    await getDb()
      .update(checks)
      .set({
        status,
        paymentDate: status === "COBRADO" ? today : status === "PENDIENTE" ? null : undefined,
      })
      .where(eq(checks.id, id));
  }

  revalidatePath("/checks");
  return { success: true };
}
