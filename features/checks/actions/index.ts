"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import {
  mockCreateCheck,
  mockGetChecks,
  mockSoftDeleteCheck,
  mockUpdateCheck,
  mockUpdateCheckStatus,
} from "@/db/mock-store";
import { getDb } from "@/db";
import { checks } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import { deleteR2Object } from "@/lib/r2";
import { createCheckSchema, type CheckStatus } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

async function getExistingCheck(id: string) {
  const [check] = await getDb()
    .select({ photoUrl: checks.photoUrl })
    .from(checks)
    .where(eq(checks.id, id))
    .limit(1);

  return check ?? null;
}

export async function getChecks() {
  await requirePermission("checks:read");
  if (USE_MOCK) {
    return mockGetChecks();
  }

  return getDb().select().from(checks).where(isNull(checks.deletedAt)).orderBy(checks.dueDate);
}

export async function createCheck(input: unknown) {
  const parsed = createCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const auth = await authorizeAction("checks:create");
  if ("error" in auth) {
    return auth;
  }

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
  if ("error" in auth) {
    return auth;
  }

  if (USE_MOCK) {
    mockUpdateCheck(id, parsed.data);
  } else {
    const existingCheck = await getExistingCheck(id);
    if (!existingCheck) {
      return { error: { _form: ["Cheque no encontrado"] } };
    }

    const nextPhotoUrl =
      parsed.data.photoUrl === undefined ? existingCheck.photoUrl : parsed.data.photoUrl || null;

    await getDb()
      .update(checks)
      .set({
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
        photoUrl: nextPhotoUrl,
      })
      .where(eq(checks.id, id));

    if (existingCheck.photoUrl && nextPhotoUrl && existingCheck.photoUrl !== nextPhotoUrl) {
      await deleteR2Object(existingCheck.photoUrl).catch((error) => {
        console.error("[checks.updateCheck.deleteOldPhoto]", error);
      });
    }
  }

  revalidatePath("/checks");
  return { success: true };
}

export async function deleteCheck(id: string) {
  const auth = await authorizeAction("checks:delete");
  if ("error" in auth) {
    return auth;
  }

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
  if ("error" in auth) {
    return auth;
  }

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
