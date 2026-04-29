"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import {
  mockGetSupplies,
  mockCreateSupply,
  mockUpdateSupply,
  mockSoftDeleteSupply,
  mockUpdateSupplyStatus,
} from "@/db/mock-store";
import { getDb } from "@/db";
import { supplies } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import { createSupplySchema } from "../types";

const USE_MOCK = process.env.USE_MOCK_DATA === "true";

export async function getSupplies() {
  await requirePermission("supplies:read");
  if (USE_MOCK) return mockGetSupplies();
  return getDb()
    .select()
    .from(supplies)
    .where(isNull(supplies.deletedAt))
    .orderBy(supplies.name);
}

export async function createSupply(input: unknown) {
  const parsed = createSupplySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("supplies:create");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockCreateSupply(parsed.data);
  } else {
    await getDb().insert(supplies).values({
      pm: parsed.data.pm,
      name: parsed.data.name,
      description: parsed.data.description || null,
      unitPrice: parsed.data.unitPrice,
      priceWithVat: parsed.data.priceWithVat || null,
      category: parsed.data.category || null,
      stock: Number(parsed.data.stock),
      lotNumber: parsed.data.lotNumber || null,
      expiryDate: parsed.data.expiryDate || null,
    });
  }

  revalidatePath("/supplies");
  return { success: true };
}

export async function updateSupply(id: string, input: unknown) {
  const parsed = createSupplySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("supplies:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockUpdateSupply(id, parsed.data);
  } else {
    await getDb()
      .update(supplies)
      .set({
        pm: parsed.data.pm,
        name: parsed.data.name,
        description: parsed.data.description || null,
        unitPrice: parsed.data.unitPrice,
        priceWithVat: parsed.data.priceWithVat || null,
        category: parsed.data.category || null,
        stock: Number(parsed.data.stock),
        lotNumber: parsed.data.lotNumber || null,
        expiryDate: parsed.data.expiryDate || null,
      })
      .where(eq(supplies.id, id));
  }

  revalidatePath("/supplies");
  return { success: true };
}

export async function deleteSupply(id: string) {
  const auth = await authorizeAction("supplies:delete");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockSoftDeleteSupply(id);
  } else {
    await getDb()
      .update(supplies)
      .set({ deletedAt: new Date() })
      .where(eq(supplies.id, id));
  }

  revalidatePath("/supplies");
  return { success: true };
}

export async function updateSupplyStatus(id: string, status: "en_deposito" | "en_entrega" | "entregado") {
  const auth = await authorizeAction("supplies:update");
  if ("error" in auth) return auth;

  if (USE_MOCK) {
    mockUpdateSupplyStatus(id, status);
  } else {
    await getDb().update(supplies).set({ status }).where(eq(supplies.id, id));
  }

  revalidatePath("/supplies");
  return { success: true };
}
