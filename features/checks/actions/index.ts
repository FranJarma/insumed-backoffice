"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { mockGetChecks, mockCreateCheck, mockUpdateCheckStatus } from "@/db/mock-store";
import { getDb } from "@/db";
import { checks } from "@/db/schema";
import { createCheckSchema, type CheckStatus } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getChecks() {
  if (USE_MOCK) return mockGetChecks();
  return getDb().select().from(checks).orderBy(checks.dueDate);
}

export async function createCheck(input: unknown) {
  const parsed = createCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (USE_MOCK) {
    mockCreateCheck(parsed.data);
  } else {
    await getDb().insert(checks).values({
      type: parsed.data.type,
      number: parsed.data.number,
      bank: parsed.data.bank,
      amount: parsed.data.amount,
      issueDate: parsed.data.issueDate,
      dueDate: parsed.data.dueDate,
      relatedEntity: parsed.data.relatedEntity || null,
      notes: parsed.data.notes || null,
      photoUrl: parsed.data.photoUrl || null,
    });
  }

  revalidatePath("/checks");
  return { success: true };
}

export async function updateCheckStatus(id: string, status: CheckStatus) {
  if (status === "PENDIENTE") return { error: "Estado inválido" };

  const today = new Date().toISOString().split("T")[0];

  if (USE_MOCK) {
    mockUpdateCheckStatus(id, status as "DEPOSITADO" | "COBRADO" | "RECHAZADO");
  } else {
    await getDb()
      .update(checks)
      .set({ status, paymentDate: status === "COBRADO" ? today : undefined })
      .where(eq(checks.id, id));
  }

  revalidatePath("/checks");
  return { success: true };
}
