"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { supplyCategories } from "@/db/schema";
import { authorizeAction, requirePermission } from "@/lib/auth";
import { createSupplyCategorySchema } from "../types";

export async function getSupplyCategories() {
  await requirePermission("supply_categories:read");
  return getDb()
    .select()
    .from(supplyCategories)
    .where(isNull(supplyCategories.deletedAt))
    .orderBy(supplyCategories.name);
}

export async function createSupplyCategory(input: unknown) {
  const parsed = createSupplyCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("supply_categories:create");
  if ("error" in auth) return auth;

  await getDb().insert(supplyCategories).values({ name: parsed.data.name });

  revalidatePath("/supply-categories");
  return { success: true };
}

export async function updateSupplyCategory(id: string, input: unknown) {
  const parsed = createSupplyCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }
  const auth = await authorizeAction("supply_categories:update");
  if ("error" in auth) return auth;

  await getDb()
    .update(supplyCategories)
    .set({ name: parsed.data.name })
    .where(eq(supplyCategories.id, id));

  revalidatePath("/supply-categories");
  return { success: true };
}

export async function deleteSupplyCategory(id: string) {
  const auth = await authorizeAction("supply_categories:delete");
  if ("error" in auth) return auth;

  await getDb()
    .update(supplyCategories)
    .set({ deletedAt: new Date() })
    .where(eq(supplyCategories.id, id));

  revalidatePath("/supply-categories");
  return { success: true };
}
