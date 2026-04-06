"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { mockGetPurchases, mockCreatePurchase, mockMarkPurchaseAsPaid } from "@/db/mock-store";
import { getDb } from "@/db";
import { purchases } from "@/db/schema";
import { createPurchaseSchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getPurchases(category?: "PROVEEDOR" | "VARIOS") {
  if (USE_MOCK) {
    const all = mockGetPurchases();
    return category ? all.filter((p) => p.category === category) : all;
  }
  const query = getDb().select().from(purchases).orderBy(desc(purchases.date));
  if (category) {
    return (await query).filter((p) => p.category === category);
  }
  return query;
}

export async function createPurchase(input: unknown) {
  const parsed = createPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (USE_MOCK) {
    mockCreatePurchase(parsed.data);
  } else {
    await getDb().insert(purchases).values({
      ...parsed.data,
      paymentMethod: parsed.data.paymentMethod || null,
      remito: parsed.data.remito || null,
      remitoUrl: parsed.data.remitoUrl || null,
      category: parsed.data.category,
    });
  }

  revalidatePath("/purchases");
  revalidatePath("/misc-purchases");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markPurchaseAsPaid(id: string) {
  if (USE_MOCK) {
    mockMarkPurchaseAsPaid(id);
  } else {
    await getDb().update(purchases).set({ status: "PAID" }).where(eq(purchases.id, id));
  }

  revalidatePath("/purchases");
  revalidatePath("/misc-purchases");
  revalidatePath("/dashboard");
  return { success: true };
}
