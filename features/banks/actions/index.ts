"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { mockGetBanks, mockCreateBank, mockUpdateBank, mockSoftDeleteBank } from "@/db/mock-store";
import { getDb } from "@/db";
import { banks } from "@/db/schema";
import { createBankSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getBanks() {
  if (USE_MOCK) return mockGetBanks();
  return getDb().select().from(banks).where(isNull(banks.deletedAt)).orderBy(banks.name);
}

export async function createBank(input: unknown) {
  const parsed = createBankSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (USE_MOCK) {
    mockCreateBank(parsed.data);
  } else {
    await getDb().insert(banks).values({ name: parsed.data.name });
  }

  revalidatePath("/banks");
  return { success: true };
}

export async function updateBank(id: string, input: unknown) {
  const parsed = createBankSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (USE_MOCK) {
    mockUpdateBank(id, parsed.data);
  } else {
    await getDb().update(banks).set({ name: parsed.data.name }).where(eq(banks.id, id));
  }

  revalidatePath("/banks");
  return { success: true };
}

export async function deleteBank(id: string) {
  if (USE_MOCK) {
    mockSoftDeleteBank(id);
  } else {
    await getDb().update(banks).set({ deletedAt: new Date() }).where(eq(banks.id, id));
  }

  revalidatePath("/banks");
  return { success: true };
}
